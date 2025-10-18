var express = require("express");
var router = express.Router();

const wgeteer = require("../wgeteer");
const agenda = require("../agenda");

/*
const kue = require('kue-scheduler')
let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});
*/

router.get("/", function (req, res) {
  res.json();
});

/*
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
*/

router.post("/gsblookupurl/", function (req, res) {
  const url = req.body.url;
  agenda.now("gsblookupUrl", {
    url: url,
  });

  agenda.define("gsbUrlResult", (job) => {
    return res.json(job);
  });
});

router.post("/gsblookup/", async function (req, res) {
  const id = req.body.id;
  const job = await agenda.now("gsblookup", {
    websiteId: id,
  });

  return res.json(job);
});

router.post("/vtpayload/", async function (req, res) {
  const id = req.body.id;
  const job = await agenda.now("vtPayload", {
    payloadId: id,
  });
  return res.json(job);
});

router.post("/register", async function (req, res) {
  console.log(req.body);
  const inputUrl = req.body["url"];
  if (inputUrl) {
    var option = {
      timeout: 30,
      delay: 5,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36",
    };
    if (req.body["lang"]) option["lang"] = req.body["lang"];
    if (req.body["userAgent"]) option["userAgent"] = req.body["userAgent"];

    if (req.body["timeout"]) option["timeout"] = req.body["timeout"];
    if (req.body["delay"]) option["delay"] = req.body["delay"];
    if (req.body["referer"]) option["referer"] = req.body["referer"];
    if (req.body["proxy"]) option["proxy"] = req.body["proxy"];
    if (req.body["exHeaders"]) option["exHeaders"] = req.body["exHeaders"];
    if ("disableScript" in req.body) option["disableScript"] = true;

    var track = "track" in req.body ? req.body["track"] : 0;

    console.log(option, track);

    const webpage = await wgeteer.registerUrl(inputUrl, option, track);
    await wgeteer.wgetJob(webpage);
    res.json(webpage);
  } else {
    res.json({ error: "no url" });
  }
});

const jstillery = require("./jstillery/server.js");
router.use("/jstillery", jstillery);

const jsdeobfuscator = require("./js-deobfuscate.js");
router.use("/js-deobfuscator", jsdeobfuscator);

const obfIoDeobfuscator = require("./obf-io.deobfuscate.js");
router.use("/obf-io.deobfuscate", obfIoDeobfuscator);

const webpage = require("./webpage");
router.use("/page", webpage);

const website = require("./website");
router.use("/website", website);

const response = require("./response");
router.use("/response", response);

const yara = require("./yara");
router.use("/yara", yara);

module.exports = router;
