var express = require('express');
var router = express.Router();

const Payload = require('./models/payload');
const Response = require('./models/response');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

router.get('/',  csrfProtection, function(req, res, next) {
    //const now = date.now();
    Payload.find()
      .sort("-createdAt")
      .limit(100)
      .then((payloads) => {
        //console.log(websites);
        res.render(
          'payloads', {
            payloads,
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
    Payload.findById(id)
    .then(async (payload) => {
      console.log(payload._id);
      const responses = await Response.find()
        .where({"payload":payload._id})
        .then((document)=>{
          return document;
        });
        //console.log(responses[0]);
        res.render('payload', {
          payload,
          responses,
          csrfToken:req.csrfToken(), 
      });
    });
  });

  module.exports = router;
