var express = require('express');
var router = express.Router();
//var wgeteer = require('./wgeteer')

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var ObjectId = require('mongodb').ObjectID;

/*
const Webpage = mongoose.model('Webpage');
const Request = mongoose.model('Request');
const Response = mongoose.model('Response');
*/

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');

var kue = require('kue')

let queue = kue.createQueue({
  prefix: 'q', // Can change this value incase you're using multiple apps using same
               // redis instance.
  redis: {
    host: "localhost",
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
  const inputUrl = urls[0]

  /*
  if (inputUrl){
    wgeteer.wget(inputUrl, req.body);
  }
  */

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

  /*
  queue.on('job enqueue', function(id, type){
    console.log( 'Job %s got queued of type %s', id, type );
  }).on('job complete', function(id, result){
    kue.Job.get(id, function(err, job){
      if (err) return;
      job.remove(function(err){
        if (err) throw err;
        console.log('removed completed job #%d', job.id);
      });
    });
  });
  queue.on( 'error', function( err ) {
    console.log( 'Oops... ', err );
  });
  queue.process('wgeteer', 4, (job, done) => {
    getWeb(job, done);
  });
  const getWeb = (job, done) => {
    console.log(job);
    wgeteer.wget(job.data.url, job.data.options);
    //.then((success) => {done();});
  }
  */

  Webpage.find().sort("-createdAt")
    .then((webpages) => {
      res.render('index', {
        webpages, 
        csrfToken:req.csrfToken(),
        model:"page" ,
        job:job,
      });
    })
    .catch(() => { res.send('Sorry! Something went wrong.'); });
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
    .catch(() => { res.send('Sorry! Something went wrong.'); });
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
      //console.log(webpages);
      res.render(
        'requests', { 
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
      var payload = null;
      if (webpage.payload){
        payload = webpage.payload.toString();
      }
      res.render(
        'responses', { 
        title: "Response", 
        webpage:webpage,
        csrfToken:req.csrfToken(),
        payload: payload,
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
      res.render(
        'responses', { 
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
      res.render(
        'requests', { 
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
