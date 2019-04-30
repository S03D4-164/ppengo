var express = require('express');
var router = express.Router();

const Payload = require('./models/payload');
const Response = require('./models/response');

var archiver = require('archiver');
archiver.registerFormat('zip-encrypted', require("archiver-zip-encrypted"));

var yara = require('yara');

router.get('/',  function(req, res) {
    Payload.find()
      .sort("-createdAt")
      .limit(100)
      .then((payloads) => {
        //console.log(websites);
        res.render(
          'payloads', {
            title:"Payload",
            payloads,
          });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
  });

router.get('/download/:id', function(req, res) {
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

//router.get('/yara/:id', csrfProtection, function(req, res, next) {
router.get('/yara/:id', function(req, res) {
    const id = req.params.id;
    Payload.findById(id)
    .then(async (payload) => {
      console.log(payload._id);
      yara.initialize(function(error) {
        if (error) {
          console.error(error)
        } else {
          var scanner = yara.createScanner()
          //console.log(process.cwd())
          var options = {
            rules: [
              {filename: "public/rules.yara"},
            ]
          }
          scanner.configure(options, function(error, warnings) {
            if (error) {
              if (error instanceof yara.CompileRulesError) {
                console.error(error.message + ": " + JSON.stringify(error.errors))
              } else {
                console.error(error)
              }
            } else {
              if (warnings.length) {
                console.error("Compile warnings: " + JSON.stringify(warnings))
              } else {
                var req = {buffer: Buffer.from(payload.payload)};
                console.log(req);
                scanner.scan(req, function(error, result) {
                if (error) {
                  console.error("scan failed: %s", error.message)
                } else {
                  console.log(result);
                  if (result.rules.length) {
                    console.log("matched: %s", JSON.stringify(result))
                  }
                }
                
                });
              }
            }
          });
        }
      })
    await res.redirect(req.baseUrl + "/" + id);
    });
});

//router.get('/:id', csrfProtection, function(req, res, next) {
router.get('/:id', function(req, res) {
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
          //csrfToken:req.csrfToken(), 
      });
    });
  });

  module.exports = router;
