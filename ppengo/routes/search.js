var express = require('express');
var router = express.Router();

const Response = require('./models/response');
const Website = require('./models/website');
const Webpage = require('./models/webpage');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

router.get('/page', csrfProtection, function(req, res, next) {
    var search = []
    if(typeof req.query.input !== 'undefined' && req.query.input !== null){
      search.push({"input": new RegExp(req.query.input)});
    }
    if(typeof req.query.title !== 'undefined' && req.query.title !== null){
      search.push({"title": new RegExp(req.query.title)});
    }
    if(typeof req.query.url !== 'undefined' && req.query.url !== null){
      search.push({"url": new RegExp(req.query.url)});
    }
    if(typeof req.query.content !== 'undefined' && req.query.content !== null){
      search.push({"content": new RegExp(req.query.content)});
    }
    if(typeof req.query.ip !== 'undefined' && req.query.ip !== null){
        search.push({"remoteAddress.ip":new RegExp(req.query.ip)});
      }
    
    Webpage.find().and(search).sort("-createdAt")
    .then((webpage) => {
        res.render('index', { 
          title: "Search: "+ JSON.stringify(req.query),
          webpages:webpage,
          csrfToken:req.csrfToken(),
          //model:'page',
        });
      });
});
  
router.get('/response', csrfProtection, function(req, res, next) {
    var search = []
    if(typeof req.query.ip !== 'undefined' && req.query.ip !== null){
      search.push({"remoteAddress.ip":new RegExp(req.query.ip)});
    }
    if(typeof req.query.issuer !== 'undefined' && req.query.issuer !== null){
      search.push({"securityDetails.issuer":new RegExp(req.query.issuer)});
    }
    if(typeof req.query.url !== 'undefined' && req.query.url !== null){
      search.push({"url":new RegExp(req.query.url)});
    }
    if(typeof req.query.text !== 'undefined' && req.query.text !== null){
      search.push({"text":new RegExp(req.query.text)});
    }
  
    Response.find().and(search).sort("-createdAt")
    .then((webpage) => {
        res.render('responses', { 
          title: "Search: "+ JSON.stringify(req.query),
          webpages:webpage,
          csrfToken:req.csrfToken(),
          //model:'page',
        });
      });
  });

  module.exports = router;
