var express = require('express');
var router = express.Router();

const Response = require('./models/response');
const agenda = require('./agenda');

var paginate = require('express-paginate');
const { Parser } = require('@json2csv/plainjs');

const moment = require('moment');

var Diff = require('diff');
const logger = require('./logger')

router.get('/es/index', function(req, res) {
  //Response.esTruncate(function(err){console.log(err)});
  Response.esCreateMapping({
    "settings": {
      "analysis" : {
        "filter": {
          "pos_filter": {type: "kuromoji_part_of_speech", stoptags: ["助詞-格助詞-一般", "助詞-終助詞"]},
          "greek_lowercase_filter": {type: "lowercase", language: "greek"}
        },
        "analyzer":{
          "kuromoji_analyzer":{
            "type":"custom",
            "tokenizer":"kuromoji_tokenizer",
            filter: ["kuromoji_baseform", "pos_filter", "greek_lowercase_filter", "cjk_width"]
          }
        }
      }
    }
  });
  
  agenda.now('esIndex');
  //esIndex(Response);
  res.redirect(req.baseUrl);

});

router.get('/es', function(req, res) {
  var size = req.query.size?Number(req.query.size):10;
  var page = req.query.page?Number(req.query.page):1;
  var from = (page-1)*size;
  //var from = req.query.from?Number(req.query.from):0;
  var rawQuery = {
    "from" : from, "size" : size,
    "query": {
        "query_string" : {
            "query" : req.query.query,
            "fields":["text"]
        }
    },
    "sort":{"createdAt": {"order": "desc"}},
  };
  logger.debug(rawQuery);
  var hidrate = {
    hydrate: true,
    hydrateOptions: {lean: true},
    hydrateWithESResults: {source: true},
  };
  Response.esSearch(rawQuery,
    hidrate,
    function(err, results) {
      console.log(JSON.stringify(results,null," "));
      var result, total;
      if(results){
        //result = results.hits?{"docs":results.hits.hits}:{"docs":[]};
        result = results.hits?results.hits.hits:[];
        total = results.hits?results.hits.total.value:0;
      }
      res.render('es_responses', {
        result,
        "query": req.query.query,
        "total": total,
        from,
        size,
        //pagenum,
      });
    }
  )
});

router.get('/', function(req, res) {
  search = [];
  if(typeof req.query.url !== 'undefined' && req.query.url){
    search.push({"url": req.query.url});
  }
  if(typeof req.query.rurl !== 'undefined' && req.query.rurl){
    search.push({"url":new RegExp(req.query.rurl)});
  }

  if(typeof req.query.source !== 'undefined' && req.query.source){
    search.push({"text": new RegExp(req.query.source)});
  }
  if(typeof req.query.ip !== 'undefined' && req.query.ip){
      search.push({"remoteAddress.ip":new RegExp(req.query.ip)});
  }
  if(typeof req.query.country !== 'undefined' && req.query.country){
    search.push({"remoteAddress.geoip.country":new RegExp(req.query.country)});
  }
  if(typeof req.query.status !== 'undefined' && req.query.status){
    //search.push({"$where": `/${req.query.status}/.test(this.status)`});
    search.push({"status": req.query.status});
  }

  if(typeof req.query.payload !== 'undefined' && req.query.payload){
    search.push({"payload": req.query.payload});
  }

  if(typeof req.query.start !== 'undefined' && req.query.start){
    var start = moment(req.query.start).toDate();
    if(start.toString()!="Invalid Date")search.push({"createdAt": {"$gte": start}});
  }

  if(typeof req.query.end !== 'undefined' && req.query.end){
    var end = moment(req.query.end).add('days', 1).toDate();
    if(end.toString()!="Invalid Date")search.push({"createdAt": {"$lte": end}});
  }

  logger.debug(search);

  if(typeof req.query.csv !== 'undefined' && req.query.csv){
    var find = Response.find();
    if(search.length)find = find.and(search);
    find.lean().sort("-createdAt").then((response) => {
      var fields = ['createdAt', 'url', 'status', 'remoteAddress.ip', 'remoteAddress.reverse', 'remoteAddress.geoip', 'wappalyzer', 'securityDetails.issuer', 'securityDetails.validFrom', 'securityDetails.validTo'];
      const opts ={ withBOM:true, fields:fields };
      const parser = new Parser(opts);
      const csv = parser.parse(websites);

      res.setHeader('Content-disposition', 'attachment; filename=responses.csv');
      res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
      res.send(csv);
    })
  }else{
    var end = moment().toDate();
    search.push({"createdAt": {"$lte": end}});
    var query = search.length?{"$and":search}:{};
    Response.paginate(
      query, {
      sort:{"createdAt":-1},
      page: req.query.page,
      limit: req.query.limit,
      lean: true
    }, function(err, result) {
      //console.log(result)
      //console.log(paginate)
        res.render('responses', {
          title:"Responses",
          search:req.query,
          result,
          pages: paginate.getArrayPages(req)(5, result.totalPages, req.query.page)
        });
    });
  }
  /*
  Response
    .find()
    .populate("payload")
    .sort("-createdAt").limit(100)
    .then((webpages) => {
        //console.log(webpages);
        res.render(
          'responses', {
            title: "Response", 
            webpages, 
          });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
  */
});
  
router.get('/:id', async function(req, res) {
  const id = req.params.id;
    const response = await Response.findById(id)
      .populate('request').populate('webpage')
      .then((document) => {
        //console.log(document);
        return document;
      });
    const webpage = response.webpage;
    const request = response.request;

    var previous, diff;
    if (response.text){
      previous = await Response.find({
        "url":response.url,
        "createdAt":{$lt: response.createdAt},
        //"status":{$ge: 0}
      }).lean().sort("-createdAt")
      .then((document) => {
        logger.debug(document.length);
        return document;
      });
      if (previous.length){
        previous = previous[0];
        if (previous.text && response.text){
          diff =  Diff.createPatch("", previous.text, response.text, previous._id, response._id) 
        }
      }
    }
  
    /*
    const previous = await Response.find({
        "url":response.url,
        "createdAt":{$lt: response.createdAt}
    }).sort("-createdat").limit(1)
    .then((document) => {
        //console.log(document);
        return document;
      });
    */

    res.render(
      'response', { 
      title: "Response", 
      webpage:webpage,
      request:request,
      response:response,
      previous,
      diff,
      //payload: payload,
      //model:'response',
    });  
});

module.exports = router;
