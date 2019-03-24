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
    //console.log(id);
    const website = await Website.findById(id)
      .then((document)=>{return document});
    const webpages = await Webpage.find()
      .where({"input":website.url}).sort("-createdAt")
      .then((document)=>{return document});
    res.render('website', {
          website, webpages,
          csrfToken:req.csrfToken(), 
    });
});

router.post('/:id', parseForm, csrfProtection, async function(req, res, next) {
    const id = req.params.id;
    var website = await Website.findById(id)
    .then((document) => {return document;});
    //console.log(website);
    console.log(req.body);
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
    await website.save();

    const webpages = await Webpage.find()
      .where({"input":website.url}).sort("-createdAt")
      .then((document)=>{return document});
    res.render('website', {
          website, webpages,
          csrfToken:req.csrfToken(), 
    });
});

module.exports = router;
