var express = require('express');
var router = express.Router();

const Response = require('./models/response');
const Website = require('./models/website');
const Webpage = require('./models/webpage');
const Payload = require('./models/payload');
const Request = require('./models/response');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
//var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
//var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

var ObjectId = require('mongoose').Types.ObjectId

RegExp.escape= function(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

router.get('/page', csrfProtection, function(req, res, next) {
    var search = []
    if(typeof req.query.input !== 'undefined' && req.query.input !== null){
      search.push({"input": req.query.input});
    }
    if(typeof req.query.rinput !== 'undefined' && req.query.rinput !== null){
      search.push({"input": new RegExp(RegExp.escape(req.query.rinput))});
    }

    if(typeof req.query.title !== 'undefined' && req.query.title !== null){
      search.push({"title": new RegExp(req.query.title)});
    }
    if(typeof req.query.url !== 'undefined' && req.query.url !== null){
      search.push({"url": req.query.url});
    }
    if(typeof req.query.rurl !== 'undefined' && req.query.rurl !== null){
      search.push({"url":new RegExp(RegExp.escape(req.query.rurl))});
    }

    if(typeof req.query.content !== 'undefined' && req.query.content !== null){
      search.push({"content": new RegExp(RegExp.escape(req.query.content))});
    }
    if(typeof req.query.ip !== 'undefined' && req.query.ip !== null){
        search.push({"remoteAddress.ip":new RegExp(req.query.ip)});
    }
    if(typeof req.query.tagkey !== 'undefined' && req.query.tagkey !== null){
      var elem = {};
      elem[req.query.tagkey] = new RegExp('.*');
      search.push({"tag": {"$elemMatch":elem}});
     }

    console.log(search);
    Webpage.find().and(search).sort("-createdAt")
    .then((webpage) => {
        res.render('index', { 
          title: "Search: "+ JSON.stringify(req.query),
          webpages:webpage,
          csrfToken:req.csrfToken(),
        });
      });
});

router.get('/website', csrfProtection, function(req, res, next) {
  var search = []
  if(typeof req.query.tagkey !== 'undefined' && req.query.tagkey !== null){
    var elem = {};
    elem[req.query.tagkey] = {"$regex":"^.*$"};
    if(typeof req.query.tagval !== 'undefined' && req.query.tagval !== null){
      elem[req.query.tagkey] = req.query.tagval;
    }
    search.push({"tag": {"$elemMatch":elem}});
  }

  console.log(search);
  Website.find().and(search).sort("-createdAt")
  .then((websites) => {
      res.render('websites', { 
        title: "Search: "+ JSON.stringify(req.query),
        websites,
        csrfToken:req.csrfToken(),
      });
    });
});

router.get('/request', csrfProtection, function(req, res, next) {
  var search = []
  if(typeof req.query.url !== 'undefined' && req.query.url !== null){
    search.push({"url":new req.query.url});
  }
  Request.find()
  .and(search).sort("-createdAt")
  .limit(100)
  .then((webpage) => {
      res.render('requests', { 
        title: "Search: "+ JSON.stringify(req.query),
        webpages:webpage,
        csrfToken:req.csrfToken(),
      });
    })
    .catch((err) => { 
      console.log(err);
      res.send(err); 
    });
});

router.get('/response', csrfProtection, function(req, res, next) {
    var search = []
    if(typeof req.query.url !== 'undefined' && req.query.url !== null){
      search.push({"url": req.query.url});
    }
    if(typeof req.query.rurl !== 'undefined' && req.query.rurl !== null){
      search.push({"url":new RegExp(RegExp.escape(req.query.rurl))});
    }

    if(typeof req.query.ip !== 'undefined' && req.query.ip !== null){
      search.push({"remoteAddress.ip":new RegExp(req.query.ip)});
    }
    if(typeof req.query.country !== 'undefined' && req.query.country !== null){
      search.push({"remoteAddress.geoip.country":new RegExp(req.query.country)});
    }
    if(typeof req.query.issuer !== 'undefined' && req.query.issuer !== null){
      search.push({"securityDetails.issuer":new RegExp(req.query.issuer)});
    }
    if(typeof req.query.text !== 'undefined' && req.query.text !== null){
      search.push({"text":new RegExp(RegExp.escape(req.query.text))});
    }

    if(typeof req.query.status !== 'undefined' && req.query.status !== null){
      search.push({"status":req.query.status});
    }

    if(typeof req.query.webpage !== 'undefined' && req.query.webpage !== null){
      search.push({"webpage": new ObjectId(req.query.webpage)});
    }

    console.log(req.query, search);
    Response.find()
    .and(search).sort("-createdAt")
    .limit(100)
    .then((webpage) => {
        res.render('responses', { 
          title: "Search: "+ JSON.stringify(req.query),
          webpages:webpage,
          csrfToken:req.csrfToken(),
        });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
});

router.get('/payload', csrfProtection, function(req, res, next) {
    var search = []
    if(typeof req.query.md5 !== 'undefined' && req.query.md5 !== null){
      search.push({"md5":new RegExp(req.query.md5)});
    }

    Payload
    .find()
    .and(search)
    .sort("-createdAt")
    .then((payloads) => {
      res.render(
        'payloads', {
          payloads,
          csrfToken:req.csrfToken(),
        });
    });
  });

  module.exports = router;
