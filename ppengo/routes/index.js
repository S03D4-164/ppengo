var express = require('express');
var router = express.Router();

const Webpage = require('./models/webpage');
const Website = require('./models/website');

const scheduler = require('./scheduler');

var queue = scheduler.start();

router.post('/', async function(req, res, next) {
  async function queJob(webpage){
    const job = await queue.create('wgeteer', {
      pageId: webpage._id,
      options:webpage.option,
    }).ttl(30*60*1000);
    await job.save(function(err){
      if( err ) console.log( job.id, err);
      //else console.log( job.id, option);
    });
    return job;
  }

  async function gsbJob(id){
    const job = await queue.create('gsblookup', {
      websiteId:id,
    }).ttl(60*1000).attempts(3).backoff( true );
    await job.save(function(err){
      if( err ) console.log( job.id, err);
    });
    return job;
  }

  async function saveInput(inputUrl, option, track){
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
    if (!website.gsb.lookup) await gsbJob(website._id);
    else console.log("gsb checked");
    //if (option['track'] > 0){
    if (track > 0){
      counter = 24;
      period = 1;
      website.track.counter = counter;
      website.track.period = period;
      website.track.option = option;
      //if (option['track'] = 2){       
      if (track === 2){
        await website.save(function (err, success){
          if(err) console.log(err);
          else console.log(website);
        });
      //} else if (option['track'] = 1){
      } else if (track === 1){

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
    if (typeof lang === 'string') lang = [lang];
    var userAgent = req.body['userAgent'];
    if (typeof userAgent === 'string') userAgent = [userAgent];

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
        if ("disableScript" in req.body) option["disableScript"] = true;
        //option['track'] = req.body['track_url'];
        var track = req.body['track_url'];

        console.log("option", option);
        const webpage = await saveInput(inputUrl, option, track);
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
  });
});

router.post('/progress', function(req, res, next) {

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
        ids
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

//const api = require("./api");
//router.use('/api', api);

const auth = require("./auth");
router.use('/auth', auth);

const jstillery = require("./jstillery/index");
router.use('/jstillery', jstillery);

router.use('/', website);

module.exports = router;
