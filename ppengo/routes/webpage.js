var express = require('express');
var router = express.Router();
var Diff = require('diff');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');

router.get('/',  csrfProtection, function(req, res, next) {
    //const now = date.now();
    Webpage.find()
      .sort("-createdAt")
      .limit(100)
      .then((webpages) => {
        res.render(
          'index', {
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
      
    var previous = await Webpage.find({
        "input":webpage.input,
        //"createdAt":{$lt: webpage.createdAt}
    }).sort("-createdAt")
    .then((document) => {
        console.log(document.length);
        return document;
      });
    console.log(webpage.createdAt);
    var diff;
    if (previous[0]){
      if (previous[0].content){
        diff =  Diff.createPatch("", previous[0].content, webpage.content, previous[0]._id, webpage._id) 
      }
    }
    //console.log(diff);
  
    var requests = await Request.find({"webpage":id})
      .sort("createdAt")
      .then((document) => {
        return document;
      });
    //console.log(requests);
  
    var responses = await Response.find({"webpage":id})
      .sort("createdAt").then((document) => {
        return document;
      });
  
    res.render('page', { 
          webpage,
          requests,
          responses,
          previous:previous[0],
          diff,
          csrfToken:req.csrfToken(), 
          model:"page",
    });
});

module.exports = router;
