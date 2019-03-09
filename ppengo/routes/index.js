var express = require('express');
var router = express.Router();

const mongoose = require('mongoose');
mongoose.connect('mongodb://mongodb/wgeteer', {
  useNewUrlParser: true,
  useCreateIndex: true,
 });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');
const Screenshot = require('./models/screenshot');

var kue = require('kue');
let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

router.get('/',  csrfProtection, function(req, res, next) {
  //const now = date.now();
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
  const options = req.body;

  var ids = [];
  var webpages = [];

  const queJob = (inputUrl, options) =>{
    inputUrl = inputUrl
    .replace(/\[:\]/, ':')
    .replace(/\[.\]/, '.')
    .replace(/^hxxp/, 'http');
    const webpage = new Webpage({
      input: inputUrl,
    });
    webpage.save(function (err, success){
      if(err) console.log(err);
    });
    ids.push(webpage._id.toString());
    webpages.push(webpage);
    //console.log(ids);
    const job = queue.create('wgeteer', {
      pageId: webpage._id,
      options:options,
    }).ttl(100000).save(function(err){
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

  for (var inputUrl of urls){
    if (inputUrl){
      queJob(inputUrl, options);
    }      
  }
  //console.log(ids);
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
      var completed = true;
      for(let i in webpages){
        if (!webpages[i].url && !webpages[i].title){
          completed = false;
        }
      }
      res.render(
        'progress', {
        webpages, 
        completed: completed,
        csrfToken:req.csrfToken(),
    });
  });
});

router.get('/page/:id', csrfProtection, async function(req, res, next) {
  const id = req.params.id;

  var webpage = await Webpage.findById(id).then((document) => {
      //console.log(document);
      return document;
    });
  //console.log(webpage);
  var requests = await Request.find({"webpage":id})
    .sort("createdAt").exec().then((document) => {
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
        csrfToken:req.csrfToken(), 
        model:"page",
  });
});

router.get('/screenshot/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  //console.log(id);
  Screenshot.findById(id)
  .then((webpage) => {
      //console.log(webpage);
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
    //.populate('request')
    //.populate('webpage')
    .then((webpage) => {
      //console.log(webpage);
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

router.get('/search/page', csrfProtection, function(req, res, next) {
  var search = []
  if(typeof req.query.input !== 'undefined' && req.query.input !== null){
    search.push({"input":req.query.input});
  }
  if(typeof req.query.title !== 'undefined' && req.query.title !== null){
    search.push({"title":req.query.title});
  }
  if(typeof req.query.url !== 'undefined' && req.query.url !== null){
    search.push({"url":req.query.url});
  }
  Webpage.find()
  .or(search)
  .sort("-createdAt")
  .then((webpage) => {
      res.render('index', { 
        title: "Search: "+ JSON.stringify(req.query),
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
