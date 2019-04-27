var express = require('express');
var router = express.Router();

const mongoose = require('mongoose');
mongoose.connect('mongodb://mongodb/wgeteer', {
  useNewUrlParser: true,
  useCreateIndex: true,
 });
//mongoose.Promise = global.Promise;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
mongoose.set('debug', function (coll, method, query, doc) {
  console.log(coll + " " + method + " " + JSON.stringify(query) + " " + JSON.stringify(doc));
});

const Webpage = require('./models/webpage');
const Website = require('./models/website');
//const Payload = require('./models/payload');
//const Screenshot = require('./models/screenshot');

const scheduler = require('./scheduler');
(async function(){
  await scheduler.start();
})();

const kue = require('kue-scheduler')
let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});
/*

var job = queue.createJob('crawl', {})
.unique('crawl').ttl(600*1000);

queue.clear(function(error,response){
  console.log("[Queue]cleared: ", response);
});

queue.every('* * * * *', job);

queue.process('crawl', 1, (job, done) => {
  crawlWeb(job, done);
});

const crawlWeb = async (job, done) => {
  const websites = await Website.find()
  .where("track.counter")
  .gt(0)
  .populate("last")
  .then((documents) => {
    return documents;
  });
  console.log("tracked: ",websites.length);

  if(websites){
    for(let seq in websites){
      var website = websites[seq];
      const now = Math.floor(Date.now()/(60*60*1000));
      const update = website.track.period  + Math.floor(website.last.createdAt.valueOf()/(60*60*1000));
      console.log((Date.now()-website.last.createdAt.valueOf())/(60*1000), update-now)
      if (now >= update){
        const webpage = await new Webpage({
          input: website.url,
          option: website.track.option,
        });
        await webpage.save(function (err, success){
          if(err) console.log(err);
          else console.log(webpage);
        });
        website.track.counter -= 1;
        website.track.option = option;
        website.last = webpage;

        await website.save();
        const job = await queue.create('wgeteer', {
          pageId: webpage._id,
          options:webpage.option,
        }).ttl(600*1000);
        await job.save(function(err){
          if( err ) console.log( job.id, err);
          //else console.log( job.id, option);
        });
      }
    }
  }
  done();
}
*/

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());


router.post('/', parseForm, csrfProtection, async function(req, res, next) {

  async function queJob(webpage){
    const job = await queue.create('wgeteer', {
      pageId: webpage._id,
      options:webpage.option,
    }).ttl(60*1000);
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
    inputUrl = inputUrl
    .replace(/^ */, '')
    .replace(/\[:\]/g, ':')
    .replace(/\[.\]/g, '.')
    .replace(/^URL./, '')
    .replace(/^url./, '')
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

    const website = await Website.findOneAndUpdate(
      {"url": inputUrl},
      {
        "last": webpage._id,
      },
      {"new":true,"upsert":true},
    );
    if (option['track'] > 0){
      counter = 24;
      period = 1;
      website.track.counter = counter;
      website.track.period = period;
       
      if (option['track'] = 2){
        await website.save(function (err, success){
          if(err) console.log(err);
          else console.log(website);
        });
    
      } else if (option['track'] = 1){
        if (!website.track.counter){
          await website.save(function (err, success){
            if(err) console.log(err);
            else console.log(website);
          });
        } 
      }
    }


    return webpage;
    //console.log(ids);
  }

  console.log(req.body);

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
        var option = {};
        option['referer'] = req.body['referer'];
        option['proxy'] = req.body['proxy'];
        option['timeout'] = req.body['timeout'];
        option['delay'] = req.body['delay'];
        option['exHeaders'] = req.body['exHeaders'];
        option['lang'] = lang[lkey];
        option['userAgent'] = userAgent[ukey];
        option['track'] = req.body['track_url'];
        console.log(option);
        const webpage = await saveInput(inputUrl, option);
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
    title:"Progress",
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
        "title":"Progress",
        completed: completed,
        csrfToken:req.csrfToken(),
    });
  });
});

/*

router.get('/delete/page/:id', csrfProtection, async function(req, res, next) {
  const id = req.params.id;
  await Webpage.findByIdAndDelete(id)
  res.redirect(req.baseUrl);
});

router.get('/drop/payload',  csrfProtection, function(req, res, next) {

  Payload.collection.drop();
  Screenshot.collection.drop();

  res.redirect(req.baseUrl);
});

*/

const request = require("./request");
router.use('/request', request);

const website = require("./website");
router.use('/website', website);

const payload = require("./payload");
router.use('/payload', payload);

const screenshot = require("./screenshot");
router.use('/screenshot', screenshot);

const search = require("./search");
router.use('/search', search);

const response = require("./response");
router.use('/response', response);

const webpage = require("./webpage");
router.use('/page', webpage);

const api = require("./api");
router.use('/api', api);

//router.use('/', website);
const user = require("./user");
router.use('/', user);

module.exports = router;
