var express = require('express');
var router = express.Router();
var Diff = require('diff');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
//var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
//var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');
const Website = require('./models/website');

router.get('/',  csrfProtection, function(req, res, next) {
  console.log(req);
  Webpage.find()
      .sort("-createdAt")
      .limit(100)
      .then((webpages) => {
        res.render(
          'pages', {
            title: "Page",
            webpages,
            csrfToken:req.csrfToken(),
          });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
});

router.get('/:id', csrfProtection, async function(req, res, next) {
    const id = req.params.id;
  
    var webpage = await Webpage.findById(id)
      .then((document) => {
        //console.log(document);
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
  
    var responses = await Response.find({"webpage":id})
      .sort("createdAt").then((document) => {
        return document;
      });

      var website = await Website.findOne({"url":webpage.input})
      .then((document) => {
        //console.log(document);
        return document;
      });
  
    res.render('page', { 
          webpage,
          requests,
          responses,
          website,
          previous:previous,
          diff,
          csrfToken:req.csrfToken(), 
    });
});

module.exports = router;
