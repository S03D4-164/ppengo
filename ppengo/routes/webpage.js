var express = require('express');
var router = express.Router();
var paginate = require('express-paginate');

var Diff = require('diff');

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');
const Website = require('./models/website');

/*
router.get('/',  function(req, res) {
  Webpage.paginate({}, {
    sort:{"createdAt":-1},
    page: req.query.page,
    limit: req.query.limit
  }, function(err, result) {
    console.log(paginate)
    console.log(res.locals.paginate)
    res.render('pages', {
      result,
      //paginate,
      pages: paginate.getArrayPages(req)(5, result.totalPages, req.query.page)
    });
  });
});
*/

router.get('/', function(req, res) {
  var search = []
  if(typeof req.query.input !== 'undefined' && req.query.input){
    search.push({"input": req.query.input});
  }
  if(typeof req.query.rinput !== 'undefined' && req.query.rinput){
    search.push({"input": new RegExp(RegExp.escape(req.query.rinput))});
  }

  if(typeof req.query.title !== 'undefined' && req.query.title){
    search.push({"title": new RegExp(req.query.title)});
  }
  if(typeof req.query.url !== 'undefined' && req.query.url){
    search.push({"url": req.query.url});
  }
  if(typeof req.query.rurl !== 'undefined' && req.query.rurl){
    search.push({"url":new RegExp(req.query.rurl)});
  }

  if(typeof req.query.source !== 'undefined' && req.query.source){
    search.push({"content": new RegExp(req.query.source)});
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
  var query = search.length?{"$and":search}:{};
  Webpage.paginate(
    query, {
    sort:{"createdAt":-1},
    page: req.query.page,
    limit: req.query.limit
  }, function(err, result) {
    //console.log(result)
    console.log(paginate)
    res.render('pages', {
      search,
      result,
      pages: paginate.getArrayPages(req)(5, result.totalPages, req.query.page)
    });
  });
  /*
  console.log(req.query, search);
  var find = Webpage.find();
  if(search.length)find = find.and(search);

  //Webpage.find().and(search)
  find.sort("-createdAt")
  .then((webpage) => {
      if(typeof req.query.csv !== 'undefined' && req.query.csv){
        var fields = ['createdAt', 'input', 'title', 'error', 'status', 'remoteAddress.ip', 'remoteAddress.reverse', 'remoteAddress.geoip', 'wappalyzer', 'securityDetails.issuer', 'securityDetails.validFrom', 'securityDetails.validTo', 'url'];
        const csv = json2csv.parse(webpage, { fields });
        res.setHeader('Content-disposition', 'attachment; filename=webpages.csv');
        res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
        res.send(csv);
      }else{
        res.render('pages', { 
          title: "Page: "+ JSON.stringify(req.query),
          webpages:webpage,
          search:req.query,
        });
    }
    });
    */
});

router.get('/:id', async function(req, res, next) {
  const id = req.params.id;  
  var webpage = await Webpage.findById(id)
    .then((document) => {
      return document;
  });
  
  var diff;
  if (webpage.content){
    var previous = await Webpage.find({
      "input":webpage.input,
      "createdAt":{$lt: webpage.createdAt}
    }).sort("-createdAt")
    .then((document) => {
      console.log(document.length);
      return document;
    });
    if (previous.length){
      previous = previous[0];
      if (previous.content && webpage.content){
        diff =  Diff.createPatch("", previous.content, webpage.content, previous._id, webpage._id) 
      }
    }
  }
  //console.log(diff);
  
  var requests = await Request.find({"webpage":id})
    .sort("createdAt")
    .then((document) => {
      return document;
  });
  var search = [];
  if(typeof req.query.rurl !== 'undefined' && req.query.rurl){
    //search.push({"url":new RegExp(RegExp.escape(req.query.rurl))});
    search.push({"url":new RegExp(req.query.rurl)});

  }
  if(typeof req.query.source !== 'undefined' && req.query.source){
    //search.push({"text": new RegExp(RegExp.escape(req.query.source))});
    search.push({"text": new RegExp(req.query.source)});
  }
  if(typeof req.query.status !== 'undefined' && req.query.status){
    search.push({"$where": `/${req.query.status}/.test(this.status)`});
  }
  console.log(req.query, search);
  var responses;
  if(search.length){
    const find = await Response.find({"webpage":id}).and(search).sort("-createdAt")
    .then((document)=>{return document});
    responses = find;
  } else{
    const find = await Response.find({"webpage":id}).sort("-createdAt")
    .then((document)=>{return document});
    responses = find;
  } 
  /*
  var responses = await Response.find({"webpage":id})
    .sort("createdAt").then((document) => {
      return document;
  });
  */
  var website = await Website.findOne({"url":webpage.input})
  .then((document) => {
    return document;
  });
  console.log(webpage.yara)  
  res.render('page', { 
        webpage,
        requests,
        responses,
        website,
        previous:previous,
        diff,
        search:req.query
  });
});

module.exports = router;
