var express = require('express');
var router = express.Router();

const Request = require('./models/request');

/*
var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());
*/

//router.get('/',  csrfProtection, function(req, res, next) {
router.get('/', function(req, res) {
  //const now = date.now();
  Request.find().sort("-createdAt").limit(100)
    .then((webpages) => {
      res.render(
        'requests', {
          title:"Request",
          webpages,
          //csrfToken:req.csrfToken(),
        });
    })
    .catch((err) => { 
      console.log(err);
      res.send(err); 
    });
});

//router.get('/:id', csrfProtection, function(req, res, next) {
router.get('/:id', function(req, res) {
  const id = req.params.id;
  Request.findById(id).populate('response').populate('webpage')
    .then((webpage) => {
      //console.log(webpage);
      res.render(
        'response', { 
        title: "Request", 
        request:webpage,
        webpage:webpage.webpage,
        response:webpage.response,
        //csrfToken:req.csrfToken(),
      });
    });
});

module.exports = router;
