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

var kue = require('kue');
let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379 // default
  }
});

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

router.get('/',  csrfProtection, function(req, res, next) {
  Webpage.find()
    .sort("-createdAt")
    .limit(100)
    .then((webpages) => {
      res.render(
        'index', {
           title: "Pages",
           webpages, 
           csrfToken:req.csrfToken(),
           model:"page",
        });
    })
    .catch((err) => { 
      console.log(err);
      res.send(err); 
    });
});

router.post('/', parseForm, csrfProtection, function(req, res, next) {
  const input = req.body['url'];
  const urls = input.split('\r\n');

  var ids = [];
  var webpages = [];

  for (var inputUrl of urls){

    if (inputUrl){
      const webpage = new Webpage({
        input: inputUrl,
      });
      webpage.save(function (err, success){
        if(err) {
          console.log(err);
        }else{
          console.log(success);
        }
      });
      ids.push(webpage._id.toString());
      webpages.push(webpage);
      //console.log(ids);
      const job = queue.create('wgeteer', {
        pageId: webpage._id,
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
    } else {
      console.log(inputUrl);
    }
  }
  console.log(ids);
  res.render(
    'progress', {
    webpages, 
    ids:String(ids),
    csrfToken:req.csrfToken(),
  });
});

router.post('/progress', parseForm, csrfProtection, function(req, res, next) {
  const ids = req.body["pageId[]"];
  Webpage
    .where('_id')
    .in(ids)
    .then((webpages) => {
      res.render(
        'progress', {
        webpages, 
        csrfToken:req.csrfToken(),
    });
  });
});

router.get('/page/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  Webpage.findById(id)
    .then((webpage) => {
      res.render('page', { 
        webpage,
        csrfToken:req.csrfToken(), 
        model:"page",
      });
    });
});

router.get('/page/screenshot/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  Webpage.findById(id)
    .then((webpage) => {
      var img = new Buffer(webpage.screenshot, 'base64');  
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': img.length
      });
      res.end(img); 
    });
});

router.get('/page/requests/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  Request.find({"webpage":id})
    .sort("createdAt")
    .then((webpages) => {
      res.render(
        'requests', { 
        pageId: id, 
        webpages:webpages,
        csrfToken:req.csrfToken(),
        model:"request", 
      });
    });
});

router.get('/response/:id', csrfProtection, function(req, res, next) {
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

router.get('/page/responses/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  Response.find({"webpage":id})
    .then((webpages) => {
      res.render(
        'responses', { 
        pageId: id, 
        webpages:webpages,
        csrfToken:req.csrfToken(),
        model:"response", 
      });
    });
});

router.get('/request/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  Request.findById(id)
    .then((webpage) => {
      //console.log(webpage);
      res.render(
        'request', { 
        title: "Request", 
        webpage:webpage,
        csrfToken:req.csrfToken(),
        model:'request',
      });
    });
});

router.get('/search/title/:title', csrfProtection, function(req, res, next) {
  const title = req.params.title;
  Webpage.find({"title":title})
  .sort("-createdAt")
  .then((webpage) => {
      res.render('index', { 
        title: "Title: " + title,
        webpages:webpage,
        csrfToken:req.csrfToken(),
        model:'page',
      });
    });
});

router.get('/search/input/:input', csrfProtection, function(req, res, next) {
  const input = req.params.input
  Webpage.find({"input":input})
  .sort("-createdAt")
  .then((webpage) => {
      res.render('index', { 
        title: "Input: " + input,
        webpages:webpage,
        csrfToken:req.csrfToken(),
        model:'page',
      });
    });
});

module.exports = router;
