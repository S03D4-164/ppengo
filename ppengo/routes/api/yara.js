var express = require('express');
var router = express.Router();

var yara = require('yara');
const Response = require('../models/response');
const Webpage = require('../models/webpage');

router.get('/', function(req, res) {
  res.json({
    'version':yara.libyaraVersion(),
    'description':'post json contains source with header "Content-Type: application/json". eg:{"source":"xxx"}'
    });
})

function yaraMatched(result, buffer){
  var matchedArray = [];
  if ("rules" in result){
    for(let rule of result["rules"]){
      //console.log(rule)
      if("matches" in rule){
        for(let match of rule["matches"]){
          var matched = buffer
          .slice(match["offset"],match["offset"] + match["length"])
          .toString();
          if(!matchedArray.includes(matched)){
            matchedArray.push(matched);
          }
        }
      }
    }
  }
  return matchedArray;
}

router.post('/', function(req, res) {
  var result = {};
  var source = req.body.source;
  if(!source) return res.json(result);
  var reqbuf = {buffer: Buffer.from(source)};
  //console.log(reqbuf);
  var options = {
    rules: [
      {filename: "/home/node/config/rules/index.yar"},
    ]
  }

  yara.initialize(function(error) {
  if (error) {
    console.error(error)
  } else {
    var scanner = yara.createScanner()
    scanner.configure(options, function(error, warnings) {
      if (error) {
        //if (error instanceof yara.CompileRulesError) console.error(error.message + ": " + JSON.stringify(error.errors))
        console.error(error)
      } else {
        if (warnings.length) {
          console.error("Compile warnings: " + JSON.stringify(warnings))
        } else {
          scanner.scan(reqbuf, function(error, result) {
            if (error) {
              console.error("scan failed: %s", error.message)
            } else {
              console.log(result);
              if (result.rules.length) {
                console.log("matched: %s", JSON.stringify(result))
              }
              var matched = yaraMatched(result, reqbuf.buffer)
              return res.json(matched);
              //return res.json(result);
            }
          });
        }
      }
    });
  }
  })
  //return res.json(result);
})

module.exports = router;
