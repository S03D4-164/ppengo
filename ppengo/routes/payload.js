var express = require('express');
var router = express.Router();

const Payload = require('./models/payload');
const Response = require('./models/response');

var archiver = require('archiver');
archiver.registerFormat('zip-encrypted', require("archiver-zip-encrypted"));

const yara = require('./yara');

var paginate = require('express-paginate');
const json2csv = require('json2csv');

router.get('/',  function(req, res) {
  var search = []
  if(typeof req.query.md5 !== 'undefined' && req.query.md5 !== null){
    search.push({"md5":new RegExp(req.query.md5)});
  }

  if(typeof req.query.csv !== 'undefined' && req.query.csv){
    var find = Payload.find();
    if(search.length)find = find.and(search);
    find.sort("-createdAt").then((payload) => {
      var fields = ['createdAt', 'md5', 'tag'];
      const csv = json2csv.parse(payload, { withBOM:true, fields });
      res.setHeader('Content-disposition', 'attachment; filename=payloadss.csv');
      res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
      res.send(csv);
    })
  }else{
    var query = search.length?{"$and":search}:{};
    Payload.paginate(
      query, {
      sort:{"createdAt":-1},
      page: req.query.page,
      limit: req.query.limit
    }, function(err, result) {
      //console.log(result)
      //console.log(paginate)
        res.render('payloads', {
          title:"Payloads",
          search:req.query,
          result,
          pages: paginate.getArrayPages(req)(5, result.totalPages, req.query.page)
        });
    });
  }
  /*
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
  */
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

/*
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
              {filename: "config/rules/index.yar"},
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
*/

router.get('/:id', function(req, res) {
    const id = req.params.id;
    Payload.findById(id)
    .then(async (payload) => {
      //console.log(payload._id);
      const responses = await Response.find()
        .where({"payload":payload._id})
        .sort("-createdAt")
        .then((document)=>{
          return document;
        });
      if(req.query.yara)yara.yaraPayload(payload._id);
      res.render('payload', {
          payload,
          responses,
      });
    });
  });

  module.exports = router;
