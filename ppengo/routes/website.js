var express = require('express');
var router = express.Router();
var paginate = require('express-paginate');

const Website = require('./models/website');
const Webpage = require('./models/webpage');
const Tag = require('./models/tag');

const json2csv = require('json2csv');

router.get('/', function(req, res) {
  if(!req.user)res.redirect(req.baseUrl + "/auth/");
  var search = [];
  if(!req.user.admin)search.push({"group": {"$in":req.user.group}});

  if(typeof req.query.tagkey !== 'undefined' && req.query.tagkey){
    var elem = {};
    elem[req.query.tagkey] = {"$regex":"^.*$"};
    if(typeof req.query.tagval !== 'undefined' && req.query.tagval){
      elem[req.query.tagkey] = req.query.tagval;
    }
    search.push({"tag": {"$elemMatch":elem}});
  }

  if(typeof req.query.tag !== 'undefined' && req.query.tag){
    var elem = {};
    elem[req.query.tagkey] = {"$regex":"^.*$"};
    if(typeof req.query.tagval !== 'undefined' && req.query.tagval){
      elem[req.query.tagkey] = req.query.tagval;
    }
    search.push({"tag": {"$elemMatch":elem}});
  }

  if(typeof req.query.url !== 'undefined' && req.query.url){
    search.push({"url": req.query.url});
  }

  if(typeof req.query.rurl !== 'undefined' && req.query.rurl){
    //search.push({"url":new RegExp(RegExp.escape(req.query.rurl))});
    search.push({"url":new RegExp(req.query.rurl)});

  }

  if(typeof req.query.track !== 'undefined' && req.query.track){
    search.push({"track.counter": {"$gt":0}});
  }

  if(typeof req.query.gsb !== 'undefined' && req.query.gsb){
    var elem = {"threatType": new RegExp(req.query.gsb, "i")};
    search.push({"gsb.lookup.matches": {"$elemMatch":elem}});
  }

  if(typeof req.query.csv !== 'undefined' && req.query.csv){
    var find = Website.find();
    if(search.length)find = find.and(search);
    find.sort("-createdAt").populate("last")
    .then((websites) => {
        var fields = ['createdAt', 'updatedAt', 'url', 'tag', 'gsb.lookup'];
        const csv = json2csv.parse(websites, { withBOM:true, fields });
        res.setHeader('Content-disposition', 'attachment; filename=websites.csv');
        res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
        res.send(csv);
    });
  }else{
    var query = search.length?{"$and":search}:{};
    Website.paginate(
      query, {
      sort:{"updatedAt":-1},
      populate:'last',
      page: req.query.page,
      limit: req.query.limit
    }, function(err, result) {

      var pages = result?paginate.getArrayPages(req)(5, result.totalPages, req.query.page):undefined;
      res.render('websites', {
        title:"Sites",
        result,
        pages,
        search:req.query
      });
    });
  }
});

async function paginatedPage(query, req){
  const webpages = await Webpage.paginate(
    query, {
    sort:{"createdAt":-1},
    page: req.query.page,
    limit: req.query.limit
  }, function(err, result) {
    if(result)return result;
    else console.log(error);
  })
  return webpages;
}

router.get('/:id', async function(req, res, next) {
    const id = req.params.id;
    const verbose = req.query.verbose?true:false;

    const website = await Website.findById(id)
      .then((document)=>{return document})
      .catch((err)=>{return err});
    const tag = await Tag.find().sort({key:1, value:1});
    var search = [];
    if(typeof req.query.rurl !== 'undefined' && req.query.rurl){
      search.push({"url":new RegExp(RegExp.escape(req.query.rurl))});
    }
    if(typeof req.query.source !== 'undefined' && req.query.source){
      search.push({"content": new RegExp(RegExp.escape(req.query.source))});
    }
    if(typeof req.query.status !== 'undefined' && req.query.status){
      search.push({"$where": `/${req.query.status}/.test(this.status)`});
    }
    var result, pages;
    if(search.length){
      query = {
        "input":website.url,
        "$and":search,
      };
      result = await paginatedPage(query, req);
      /*
      const findPage = await Webpage.find().where({"input":website.url}).and(search).sort("-createdAt")
      .then((document)=>{return document});
      webpages = findPage
      */
    } else{
      query = {
        "input":website.url,
      };
      result = await paginatedPage(query, req);
      /*
      const findPage = await Webpage.find().where({"input":website.url}).sort("-createdAt")
      .then((document)=>{return document});
      webpages = findPage
      */
    } 
    if(result) pages =  paginate.getArrayPages(req)(5, result.totalPages, req.query.page)

    if(typeof req.query.rmtag !== 'undefined' && req.query.rmtag !== null){
      var key = req.query.rmtag.split(":")[0];
      var value = req.query.rmtag.split(":").slice(1).join(":");
      var remove = {}
      remove[key] = value;
      console.log(remove);
      for (var seq=0; seq < website.tag.length; seq++){
        console.log(JSON.stringify(website.tag[seq]));
        if (JSON.stringify(website.tag[seq])===JSON.stringify(remove)){
          website.tag.splice(seq,1);
          await website.save();
          console.log("deleted.");
        }
      }
    }
    res.render('website', {
      website,
      webpages: result,
      title: "Results",
      search: req.query,
      verbose,
      tag,
      result,
      pages,
    });
});

router.post('/:id', async function(req, res, next) {
    const id = req.params.id;
    var website = await Website.findById(id)
    .then((document) => {return document;});

    var tag = {};
    if (req.body['tag']){
      var founddTag = await Tag.findById(req.body['tag']);
      tag[founddTag.key] = founddTag.value;
    }
    else if (req.body['tagkey'] && req.body['tagval']){
      var foundTag = await Tag.find({
        "key":req.body['tagkey'],
        "value":req.body['tagval']
      });
      if(foundTag.length===0){
        tag[req.body['tagkey']] = req.body['tagval'];
        const newTag = new Tag({
          "key":req.body['tagkey'],
          "value":req.body['tagval'],
        });
        await newTag.save();
      }
    }
    if(tag){
      var registeredTag = JSON.stringify(website.tag);
      if (!registeredTag.includes(JSON.stringify(tag))){
        console.log(tag);
        website.tag.push(tag);
      }
    }

    if (req.body['counter']){
      var track = {
        counter: req.body['counter'],
        period: req.body['period'],
      }  
      var options = {};
      options['referer'] = req.body['referer'];
      options['proxy'] = req.body['proxy'];
      options['timeout'] = req.body['timeout'];
      options['delay'] = req.body['delay'];
      options['exHeaders'] = req.body['exHeaders'];     
      options['lang'] = req.body['lang'];
      options['userAgent'] = req.body['userAgent'];
      track.option = options;  
      website.track = track;
    }

    await website.save();
    /*
    const webpages = await Webpage.find()
      .where({"input":website.url}).sort("-createdAt")
      .then((document)=>{return document});
    */
    var result = await paginatedPage({"input":website.url}, req);
    var pages =  paginate.getArrayPages(req)(5, result.totalPages, req.query.page)

    tag = await Tag.find().sort({key:1, value:1});

    res.render('website', {
          website,
          webpages:result,
          result,
          pages,
          title: "Results",
          tag,
          search:"",
    });
});

module.exports = router;
