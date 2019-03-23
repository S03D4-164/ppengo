var express = require('express');
var router = express.Router();

/*
const mongoose = require('mongoose');
mongoose.connect('mongodb://mongodb/wgeteer', {
  useNewUrlParser: true,
  useCreateIndex: true,
 });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
*/

const Website = require('./models/website');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

router.get('/',  csrfProtection, function(req, res, next) {
  //const now = date.now();
  Website.find()
    .sort("-createdAt")
    .limit(100)
    .then((websites) => {
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
  
router.get('/:id', csrfProtection, function(req, res, next) {
    const id = req.params.id;
    //console.log(id);
    Website.findById(id)
    .then((website) => {
        res.render('website', {
          website,
          csrfToken:req.csrfToken(), 
      });
    });
});
  
router.post('/:id', parseForm, csrfProtection, async function(req, res, next) {
    const id = req.params.id;
    var website = await Website.findById(id)
    .then((document) => {
      //console.log(document);
      return document;
    });
    console.log(website);
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
    await website.save()
    .then((website) => {
      console.log(website);
      res.render('website', {
        website,
        csrfToken:req.csrfToken(), 
        //model:"page",
      });
  
    })
});

module.exports = router;
