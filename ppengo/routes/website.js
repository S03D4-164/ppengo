var express = require('express');
var router = express.Router();

const Website = require('./models/website');
const Webpage = require('./models/webpage');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

router.get('/',  csrfProtection, function(req, res, next) {
  //const now = date.now();
  Website.find()
    .sort("-updatedAt")
    .limit(100)
    .populate('last')
    .then((websites) => {
      //console.log(websites);
      res.render(
        'websites', {
          websites,
          'title':'Websites',
          csrfToken:req.csrfToken(),
        });
    })
    .catch((err) => { 
      console.log(err);
      res.send(err); 
    });
});

router.get('/:id', csrfProtection, async function(req, res, next) {
    const id = req.params.id;
    console.log(req.query);
    const website = await Website.findById(id)
      .then((document)=>{return document});
    const webpages = await Webpage.find()
      .where({"input":website.url}).sort("-createdAt")
      .then((document)=>{return document});
 
    if(typeof req.query.rmtag !== 'undefined' && req.query.rmtag !== null){
      var key = req.query.rmtag.split(":")[0];
      var value = req.query.rmtag.split(":").slice(1).join(":");
      var remove = {}
      remove[key] = value;
      console.log(remove);
      for (var seq=0; seq < website.tag.length; seq++){
        console.log(JSON.stringify(website.tag[seq]));
        if (JSON.stringify(website.tag[seq])===JSON.stringify(remove)){
          website.tag.splice(seq,1);
          await website.save();
          console.log("deleted.");
        }
      }
    }
   
    res.render('website', {
      website,
      webpages,
      title: website.url,
      csrfToken:req.csrfToken(), 
    });
});

router.post('/:id', parseForm, csrfProtection, async function(req, res, next) {
    const id = req.params.id;
    var website = await Website.findById(id)
    .then((document) => {return document;});
    //console.log(website);
    console.log(req.body);
    
    if (req.body['type'] && req.body['tag']){
      var tag = {};
      tag[req.body['type']] = req.body['tag'];
      var registeredTag = JSON.stringify(website.tag);
      if (!registeredTag.includes(JSON.stringify(tag))){
        console.log(tag);
        website.tag.push(tag);
      }
    }

    if (req.body['counter']){
      var track = {
        counter: req.body['counter'],
        period: req.body['period'],
      }  
      var options = {};
      options['referer'] = req.body['referer'];
      options['proxy'] = req.body['proxy'];
      options['timeout'] = req.body['timeout'];
      options['delay'] = req.body['delay'];
      options['exheader'] = req.body['exheader'];     
      options['lang'] = req.body['lang'];
      options['userAgent'] = req.body['userAgent'];
      track.option = options;  
      website.track = track;
    }

    await website.save();

    const webpages = await Webpage.find()
      .where({"input":website.url}).sort("-createdAt")
      .then((document)=>{return document});
    res.render('website', {
          website, webpages,
          title: website.url,
          csrfToken:req.csrfToken(), 
    });
});

module.exports = router;
