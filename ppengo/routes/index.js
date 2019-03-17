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
const Payload = require('./models/payload');

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

router.get('/request',  csrfProtection, function(req, res, next) {
  //const now = date.now();
  Request.find().sort("-createdAt").limit(100)
    .then((webpages) => {
      res.render(
        'requests', {
          title:"Page",
          webpages,
          csrfToken:req.csrfToken(),
        });
    })
    .catch((err) => { 
      console.log(err);
      res.send(err); 
    });
});

router.get('/response',  csrfProtection, function(req, res, next) {
  //const now = date.now();
  Response.find().sort("-createdAt").limit(100)
    .then((webpages) => {
      //console.log(webpages);
      res.render(
        'responses', {
           webpages, 
           csrfToken:req.csrfToken(),
        });
    })
    .catch((err) => { 
      console.log(err);
      res.send(err); 
    });
});

router.post('/', parseForm, csrfProtection, async function(req, res, next) {

  async function queJob(webpage){
    const job = await queue.create('wgeteer', {
      pageId: webpage._id,
      options:webpage.option,
    }).ttl(100000);
    await job.save(function(err){
      if( err ) console.log( job.id, err);
      //else console.log( job.id, option);
    });
    job.on('complete', function(result){
      console.log('Job completed with data ', result);
    }).on('failed attempt', function(errorMessage, doneAttempts){
      console.log('Job failed', errorMessage);
    }).on('failed', function(errorMessage){
      console.log('Job failed', errorMessage);
    }).on('progress', function(progress, data){
      console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
    });
    return job;
  }

  async function saveInput(inputUrl, option){
    //console.log("options", option);
    inputUrl = inputUrl
    .replace(/^ */, '')
    .replace(/\[:\]/g, ':')
    .replace(/\[.\]/g, '.')
    .replace(/^hXXp/, 'http')
    .replace(/^hxxp/, 'http');
    const webpage = await new Webpage({
      input: inputUrl,
      option: option,
    });
    await webpage.save(function (err, success){
      if(err) console.log(err);
      //else console.log(webpage);
    });
    //console.log("webpage.option", webpage.option);
    return webpage;
    //console.log(ids);
  }

  const input = req.body['url'];
  const urls = input.split('\r\n');

  var ids = [];
  var webpages = [];
 
  for (var inputUrl of urls){
    if(inputUrl){
    var lang = req.body['lang'];
    if (typeof lang === 'string'){
      lang = [lang];
    }
    var userAgent = req.body['userAgent'];
    if (typeof userAgent === 'string'){
      userAgent = [userAgent];
    }
    for (var lkey in lang){
      for (var ukey in userAgent){
        var options = {};
        options['referer'] = req.body['referer'];
        options['proxy'] = req.body['proxy'];
        options['timeout'] = req.body['timeout'];
        options['delay'] = req.body['delay'];
        options['exheader'] = req.body['exheader'];     
        options['lang'] = lang[lkey];
        options['userAgent'] = userAgent[ukey];
        //console.log(options);
        const webpage = await saveInput(inputUrl, options);
        console.log(webpage);
        ids.push(webpage._id.toString());
        webpages.push(webpage);  
        const job = await queJob(webpage);
      }      
    }
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
        if (!webpages[i].url && !webpages[i].title && !webpages[i].error){
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

  var webpage = await Webpage.findById(id)
    .then((document) => {
      //console.log(document);
      return document;
    });

  var previous = await Webpage.find({
      "url":webpage.url,
      "createdAt":{$lt: webpage.createdAt}
  })
  .sort("createdat")
  .limit(1)
  .then((document) => {
      //console.log(document);
      return document;
    });

  //console.log(webpage);
  var requests = await Request.find({"webpage":id})
    .sort("createdAt")
    .populate("response")
    //.exec()
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
        csrfToken:req.csrfToken(), 
        model:"page",
  });
});

router.get('/delete/page/:id', csrfProtection, async function(req, res, next) {
  const id = req.params.id;
  await Webpage.findByIdAndDelete(id)
  res.redirect(req.baseUrl);
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

router.get('/payload/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  //console.log(id);
  Payload.findById(id)
  .then((webpage) => {
      //console.log(webpage);
      //payload = webpage.payload.toString();
      res.render('page', {
        webpage,
        csrfToken:req.csrfToken(), 
        model:"page",
  });

  });
});

/*
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
*/

router.get('/response/:id', csrfProtection, async function(req, res, next) {
  const id = req.params.id;
  const response = await Response.findById(id)
    .populate('request').populate('webpage')
    .then((document) => {
      //console.log(document);
      return document;
    });
  const webpage = response.webpage;
  const request = response.request;
  const previous = await Response.find({
      "url":response.url,
      "createdAt":{$lt: response.createdAt}
  }).sort("createdat").limit(1)
  .then((document) => {
      //console.log(document);
      return document;
    });

  /*
  Response.findById(id)
    .populate('request')
    .populate('webpage')
    .then((webpage) => {
      //console.log(webpage);
      var payload = null;
      if (webpage.payload){
        //payload = webpage.payload.toString();
      }*/

  res.render(
    'response', { 
    title: "Response", 
    webpage:webpage,
    request:request,
    response:response,
    csrfToken:req.csrfToken(),
    //payload: payload,
    model:'response',
  });
  //});
});

/*
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
*/

router.get('/request/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  Request.findById(id)
    .populate('response')
    .populate('webpage')
    .then((webpage) => {
      console.log(webpage);
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

  Webpage.find()
  .and(search)
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


router.get('/search/response', csrfProtection, function(req, res, next) {
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

  Response.find()
  //.or(search)
  .and(search)
  .sort("-createdAt")
  .then((webpage) => {
      res.render('responses', { 
        title: "Search: "+ JSON.stringify(req.query),
        webpages:webpage,
        csrfToken:req.csrfToken(),
        //model:'page',
      });
    });
});

/*
router.get('/download', csrfProtection, function(req, res, next) {
  res.download('public/test/test.pdf');
});
*/

module.exports = router;
