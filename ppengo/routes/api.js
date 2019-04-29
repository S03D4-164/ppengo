var express = require('express');
var router = express.Router();

const Webpage = require('./models/webpage');
const Website = require('./models/website');

const kue = require('kue-scheduler')
let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});

//router.get('/vt/:id', parseForm, csrfProtection, async function(req, res, next) {
router.get('/vt/:id', async function(req, res, next) {
  async function queJob(id){
    const job = await queue.create('vt', {
      payloadId:id,
      //ak:ak,
    }).ttl(60*1000);

    await job.save(function(err){
      if( err ) console.log( job.id, err);
      //else console.log( job.id, option);
    });
  }
  const id = req.params.id;
  const job = await queJob(id);
  await res.redirect(req.baseUrl + "/../payload/" + id);
});
  
//router.get('/gsblookup/:id', parseForm, csrfProtection, async function(req, res, next) {
router.get('/gsblookup/:id', async function(req, res) {
  async function queJob(id){
    const job = await queue.create('gsblookup', {
      websiteId:id,
    }).ttl(60*1000);
    await job.save(function(err){
      if( err ) console.log( job.id, err);
      //else console.log( job.id, option);
    });
  }
  const id = req.params.id;
  const job = await queJob(id);

  job.on('complete', function(result){
    console.log('Job completed with data ', result);
  }).on('failed attempt', function(errorMessage, doneAttempts){
    console.log('Job failed');
  }).on('failed', function(errorMessage){
    console.log('Job failed');
  }).on('progress', function(progress, data){
    console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
  });

  await res.redirect(req.baseUrl + "/../website/" + id);
});

router.get('/page/', async function(req, res) {
  await Webpage.find().select({"_id": 1, "input": 1, "createdAt": 1, })
    .then((document) => {
      return res.json(document);
    })
    .catch((err) => {
      console.log(err)
      return res.json({error:err.message});
    })
});

router.get('/page/:id', async function(req, res) {
  await Webpage.findById(req.params.id)
    .then((document) => {
      return res.json(document);
    })
    .catch((err) => {
      console.log(err)
      return res.json({error:err.message});
    })
});

router.post('/check', async function(req, res) {
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
      website.track.option = option;
       
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
  const inputUrl = req.body['url'];
  if(inputUrl){
    var option = {
      timeout:30,
      delay:5,
    };
    if (req.body['timeout']) option['timeout'] = req.body['timeout'];
    if (req.body['delay']) option['delay'] = req.body['delay'];
    if (req.body['referer']) option['referer'] = req.body['referer'];
    if (req.body['proxy']) option['proxy'] = req.body['proxy'];
    //option['exHeaders'] = req.body['exHeaders'];
    if (req.body['lang']) option['lang'] = req.body['lang'];
    if (req.body['user-agent']) option['userAgent'] = req.body['user-agent'];
    //if (req.body['track']) option['track'] = req.body['track'];
    console.log(option);
    const webpage = await saveInput(inputUrl, option);
    const job = await queJob(webpage);
    res.json(webpage);
  }else{
    res.json({error:"no url"});
  }
});

module.exports = router;
