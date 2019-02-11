var express = require('express');
var router = express.Router();
var wgeteer = require('./wgeteer')

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var ObjectId = require('mongodb').ObjectID;

const Webpage = mongoose.model('Webpage');
const Request = mongoose.model('Request');
const Response = mongoose.model('Response');

router.get('/', function(req, res, next) {
  
  Webpage.find().sort("-created_at")
    .then((webpages) => {
      res.render(
        'index', {
           title: "Pages",
           webpages, 
           csrfToken:req.csrfToken(),
           model:"page",
        });
    })
    .catch(() => { res.send('Sorry! Something went wrong.'); });

});

router.post('/', function(req, res, next) {
  console.log(req.body);

  const input = req.body['url'];
  const urls = input.split('\r\n');
  const inputUrl = urls[0]

  if (inputUrl){
    wgeteer.wget(inputUrl, req.body);
  }
  Webpage.find().sort("-created_at")
    .then((webpages) => {
      res.render('index', {
        webpages, 
        csrfToken:req.csrfToken(),
        model:"page" 
      });
    })
    .catch(() => { res.send('Sorry! Something went wrong.'); });
});

router.get('/request', function(req, res, next) {
  Request.find().sort("-created_at")
    .then((requests) => {
      res.render('index', { 
        title: 'Requests',
        webpages:requests, 
        model:"request",
        csrfToken:req.csrfToken(), 
      });
    })
    .catch(() => { res.send('Sorry! Something went wrong.'); });
});

router.get('/response', function(req, res, next) {
  Response.find().sort("-created_at")
    .then((responses) => {
      //console.log(responses);
      res.render(
        'index', {
        title: 'Responses', 
        webpages:responses, 
        model:"response",
        csrfToken:req.csrfToken(),
      });
    })
    .catch((err) => {
      console.log(err); 
      res.send('Sorry! Something went wrong.'); 
    });
});

router.get('/page/:id', function(req, res, next) {
  const id = req.params.id;
  //console.log(id);
  Webpage.findById(id)
    .then((webpage) => {
      //console.log(webpage);
      res.render('index', { 
        //title: webpage.input, 
        webpage,
        csrfToken:req.csrfToken(), 
        model:"page",
      });
    });
    //.catch(() => { res.send('Sorry! Something went wrong.'); });
});

router.get('/page/requests/:id', function(req, res, next) {
  const id = req.params.id;
  //console.log(id);
  Request.find({"webpage":id})
    .then((webpages) => {
      console.log(webpages);
      res.render('index', { 
        title: 'Requests <= ' + id, 
        webpages:webpages,
        csrfToken:req.csrfToken(),
        model:"request", 
      });
    });
    //.catch(() => { res.send('Sorry! Something went wrong.'); });
});

router.get('/response/:id', function(req, res, next) {
  //res.render('index', { title: 'test' });
  const id = req.params.id;
  Response.findById(id)
    .then((webpage) => {
      res.render('index', { 
        title: "Response", 
        webpage:webpage,
        csrfToken:req.csrfToken(),
        payload:webpage.payload.toString(),
        model:'response',
      });
    });
    //.catch(() => { res.send('Sorry! Something went wrong.'); });
});

router.get('/page/responses/:id', function(req, res, next) {
  const id = req.params.id;
  //console.log(id);
  Response.find({"webpage":id})
    .then((webpages) => {
      //console.log(webpages);
      res.render('index', { 
        title: 'Response <= ' + id, 
        webpages:webpages,
        csrfToken:req.csrfToken(),
        model:"response", 
      });
    });
    //.catch(() => { res.send('Sorry! Something went wrong.'); });
});

router.get('/request/:id', function(req, res, next) {
  const id = req.params.id;
  Request.findById(id)
    .then((webpage) => {
      res.render('index', { 
        title: "Request", 
        webpage:webpage,
        csrfToken:req.csrfToken(),
        model:'request',
        //payload:webpage.payload.toString(),
      });
    });
    //.catch(() => { res.send('Sorry! Something went wrong.'); });
});

module.exports = router;
