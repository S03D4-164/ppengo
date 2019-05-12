var express = require('express');
var router = express.Router();

const wgeteer = require('../wgeteer');

const kue = require('kue-scheduler')
let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});

router.get('/', function(req, res) {
  res.json();
})

router.post('/vtpayload/', async function(req, res) {
  async function queJob(id){
    const job = await queue.create('vtPayload', {
      payloadId: id,
    }).ttl(60*1000).attempts(3).backoff( true );

    await job.save(function(err){
      if( err ) console.log( job.id, err);
      //else console.log( job.id, option);
    });
    return job;
  }
  const id = req.body.id;
  const job = await queJob(id);
  job.on('complete', function(result){
    console.log('Job completed with data ', result);
  }).on('failed', function(errorMessage){
    console.log('Job failed');  
  }).on('progress', function(progress, data){
    console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
    return res.json(data);
  });
});

router.post('/vt/', async function(req, res) {
  async function queJob(resource){
    const job = await queue.create('vt', {
      resource: resource,
    }).ttl(60*1000).attempts(3).backoff( true );

    await job.save(function(err){
      if( err ) console.log( job.id, err);
      //else console.log( job.id, option);
    });
    return job;
  }
  const resource = req.body.resource;
  const job = await queJob(resource);
  job.on('complete', function(result){
    console.log('Job completed with data ', result);
  }).on('failed', function(errorMessage){
    console.log('Job failed');  
  }).on('progress', function(progress, data){
    console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
    return res.json(data);
  });

});

router.post('/gsblookupurl/', async function(req, res) {
  async function queJob(url){
    const job = await queue.create('gsblookupUrl', {
      url:url,
    }).ttl(60*1000).attempts(3).backoff( true );
    await job.save(function(err){
      if( err ) console.log( job.id, err);
    });    
    return job;
  }
  const url = req.body.url;
  const job = await queJob(url);

  job.on('complete', function(result){
    console.log('Job completed with data ', result);
  }).on('failed', function(errorMessage){
    console.log('Job failed');  
  }).on('progress', function(progress, data){
    console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
    return res.json(data);
  });
});

router.post('/gsblookup/', async function(req, res) {
  async function queJob(id){
    const job = await queue.create('gsblookup', {
      websiteId:id,
    }).ttl(60*1000).attempts(3).backoff( true );
    await job.save(function(err){
      if( err ) console.log( job.id, err);
    });
    return job;
  }
  const id = req.body.id;
  const job = await queJob(id);
  
  job.on('complete', function(result){
    console.log('Job completed with data ', result);
  }).on('failed', function(errorMessage){
    console.log('Job failed');
  }).on('progress', function(progress, data){
    console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
    try{
      return res.json(data);
    }catch(err){
      console.log(err);
    }
  });
  return;
});

router.post('/register', async function(req, res) {
 
console.log(req.body);
const inputUrl = req.body['url'];
if(inputUrl){
    var option = {
      timeout:30,
      delay:5,
      userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36'
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
    //const webpage = await saveInput(inputUrl, option);
    const webpage = await wgeteer.registerUrl(inputUrl, option);
    const job = await wgeteer.queJob(webpage);
    res.json(webpage);
  }else{
    res.json({error:"no url"});
  }

});

const jstillery = require("./jstillery/server.js");
router.use('/jstillery', jstillery);

const webpage = require("./webpage");
router.use('/page', webpage);

const website = require("./website");
router.use('/website', website);

const response = require("./response");
router.use('/response', response);

const yara = require("./yara");
router.use('/yara', yara);

module.exports = router;
