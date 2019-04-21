var express = require('express');
var router = express.Router();

const Payload = require('./models/payload');
const Response = require('./models/response');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
//var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

var archiver = require('archiver');
archiver.registerFormat('zip-encrypted', require("archiver-zip-encrypted"));

router.get('/',  csrfProtection, function(req, res, next) {
    Payload.find()
      .sort("-createdAt")
      .limit(100)
      .then((payloads) => {
        //console.log(websites);
        res.render(
          'payloads', {
            title:"Payload",
            payloads,
            csrfToken:req.csrfToken(),
          });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
  });

  router.get('/download/:id', csrfProtection, function(req, res, next) {
    const id = req.params.id;
    Payload.findById(id)
    .then(async (payload) => {
      console.log(payload._id);

      var archive = archiver.create('zip-encrypted', {
        zlib: {level: 8},
        encryptionMethod: 'aes256',
        password: 'infected'
      });
      archive.on('error', function(err) {
        res.status(500).send({error: err.message});
      });
      archive.on('end', function() {
        console.log('Archive wrote %d bytes', archive.pointer());
      });
      
      res.attachment(payload.md5 + '.zip');
      archive.pipe(res);
      var buffer = Buffer.from(payload.payload);
      archive.append(buffer, { name: payload.md5 });
      archive.finalize();

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
