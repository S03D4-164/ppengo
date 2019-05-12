var express = require('express');
var router = express.Router();

const Webpage = require('./models/webpage');
const Website = require('./models/website');

const wgeteer = require('./wgeteer');

const scheduler = require('./scheduler');

var queue = scheduler.start();

router.post('/', async function(req, res, next) {

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
          var option = {
            timeout:30,
            delay:5,
          }
          option['lang'] = lang[lkey];
          option['userAgent'] = userAgent[ukey];
          if (req.body['timeout']) option['timeout'] = req.body['timeout'];
          if (req.body['delay']) option['delay'] = req.body['delay'];
          if (req.body['referer']) option['referer'] = req.body['referer'];
          if (req.body['proxy']) option['proxy'] = req.body['proxy'];
          if (req.body['exHeaders']) option['exHeaders'] = req.body['exHeaders'];
          if ("disableScript" in req.body) option["disableScript"] = true;

          var track = ("track" in req.body)?req.body['track']:0;
      
          console.log(option, track);
          const webpage = await wgeteer.registerUrl(inputUrl, option, track);
          //console.log(webpage);
          ids.push(webpage._id.toString());
          webpages.push(webpage);  
          const job = await wgeteer.wgetJob(webpage);
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

router.get('/delete/website/:id', async function(req, res) {
  const id = req.params.id;
  await Website.findByIdAndDelete(id)
  res.redirect(req.baseUrl);
});

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

const auth = require("./auth");
router.use('/auth', auth);

const jstillery = require("./jstillery");
router.use('/jstillery', jstillery);

router.use('/', website);

module.exports = router;
