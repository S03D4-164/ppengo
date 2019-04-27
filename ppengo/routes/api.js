var express = require('express');
var router = express.Router();

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

const kue = require('kue-scheduler')
let queue = kue.createQueue({
  prefix: 'q',
  redis: {
    host: "cache",
    port: 6379
  }
});

router.get('/vt/:id', parseForm, csrfProtection, async function(req, res, next) {
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
  
  router.get('/gsblookup/:id', parseForm, csrfProtection, async function(req, res, next) {
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
    await res.redirect(req.baseUrl + "/../website/" + id);
  });
  

module.exports = router;
