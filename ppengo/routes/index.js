var express = require('express');
var router = express.Router();

const mongoose = require('mongoose');
mongoose.connect('mongodb://mongodb/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var ObjectId = require('mongodb').ObjectID;

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');

var kue = require('kue')

let queue = kue.createQueue({
  prefix: 'q', // Can change this value incase you're using multiple apps using same
               // redis instance.
  redis: {
    host: "cache",
    port: 6379 // default
  }
});

router.get('/', function(req, res, next) {
  
  Webpage.find().sort("-createdAt")
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
  //console.log(req.body);

  const input = req.body['url'];
  const urls = input.split('\r\n');
  console.log(urls);

  for (var inputUrl of urls){
  console.log(inputUrl);
  const job = queue.create('wgeteer', {  // Job Type
    url: inputUrl,                    // Job Data
    options:req.body,
  }).save( function(err){
    if( !err ) console.log( job.id );
  });
  //console.log(job);

  job.on('complete', function(result){
    console.log('Job completed with data ', result);
  }).on('failed attempt', function(errorMessage, doneAttempts){
    console.log('Job failed');
  }).on('failed', function(errorMessage){
    console.log('Job failed');
  }).on('progress', function(progress, data){
    console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
  });

  }

  Webpage.find().sort("-createdAt")
    .then((webpages) => {
      res.render(
        'index', {
        webpages, 
        csrfToken:req.csrfToken(),
        model:"page" ,
      });
    })
});

router.get('/request', function(req, res, next) {
  Request.find().sort("-createdAt")
    .then((requests) => {
      res.render(
        'requests', { 
        title: 'Requests',
        webpages:requests, 
        model:"request",
        csrfToken:req.csrfToken(), 
      });
    })
});

router.get('/response', function(req, res, next) {
  Response.find().sort("-createdAt")
    .then((responses) => {
      //console.log(responses);
      res.render(
        'responses', {
        title: 'Responses', 
        webpages:responses, 
        model:"response",
        csrfToken:req.csrfToken(),
      });
    })
    .catch((err) => {
      console.log(err); 
    });
});

router.get('/page/:id', function(req, res, next) {
  const id = req.params.id;
  //console.log(id);
  Webpage.findById(id)
    .then((webpage) => {
      res.render(
        'page', { 
        title: webpage.input, 
        webpage,
        csrfToken:req.csrfToken(), 
        model:"page",
      });
    });
});

router.get('/page/requests/:id', function(req, res, next) {
  const id = req.params.id;
  Request.find({"webpage":id}).sort("createdAt")
    .then((webpages) => {
      res.render(
        'requests', { 
        title: 'Requests <= ' + id, 
        webpages:webpages,
        csrfToken:req.csrfToken(),
        model:"request", 
      });
    });
});

router.get('/response/:id', function(req, res, next) {
  const id = req.params.id;
  Response.findById(id)
    .then((webpage) => {
      var payload = null;
      if (webpage.payload){
        payload = webpage.payload.toString();
      }
      res.render(
        'response', { 
        title: "Response", 
        webpage:webpage,
        csrfToken:req.csrfToken(),
        payload: payload,
        model:'response',
      });
    });
});

router.get('/page/responses/:id', function(req, res, next) {
  const id = req.params.id;
  Response.find({"webpage":id})
    .then((webpages) => {
      res.render(
        'responses', { 
        title: 'Response <= ' + id, 
        webpages:webpages,
        csrfToken:req.csrfToken(),
        model:"response", 
      });
    });
});

router.get('/request/:id', function(req, res, next) {
  const id = req.params.id;
  Request.findById(id)
    .then((webpage) => {
      res.render(
        'requests', { 
        title: "Request", 
        webpage:webpage,
        csrfToken:req.csrfToken(),
        model:'request',
      });
    });
});

module.exports = router;

