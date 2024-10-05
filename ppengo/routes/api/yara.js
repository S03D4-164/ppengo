var express = require("express");
var router = express.Router();

var yara = require("yara");
//const Response = require('../models/response');
//const Webpage = require('../models/webpage');
const Yara = require("../models/yara");

router.get("/", function (req, res) {
  res.json({
    version: yara.libyaraVersion(),
    description:
      'post json contains source with header "Content-Type: application/json". eg:{"source":"xxx"}',
  });
});

function yaraMatched(result, buffer) {
  var matchedArray = [];
  if ("rules" in result) {
    for (let rule of result["rules"]) {
      //console.log(rule)
      if ("matches" in rule) {
        for (let match of rule["matches"]) {
          var matched = buffer
            .slice(match["offset"], match["offset"] + match["length"])
            .toString();
          if (!matchedArray.includes(matched)) {
            matchedArray.push(matched);
          }
        }
      }
    }
  }
  return matchedArray;
}

async function getRule() {
  let rules = [];
  const yararules = await Yara.find();
  for (let yararule of yararules) {
    rules.push(yararule.rule);
  }
  let rule_string = rules.join("\n");
  console.log(rule_string);
  return rule_string;
}

router.post("/", async function (req, res) {
  var result = {};
  var source = req.body.source;
  if (!source) return res.json(result);
  var reqbuf = { buffer: Buffer.from(source) };
  //console.log(reqbuf);
  const rule_string = await getRule();
  let options = { rules: [{ string: rule_string }] };
  /*
  var options = {
    rules: [
      //{filename: "/home/node/config/rules/index.yar"},
      {filename: "/tmp/rules/index.yar"},
    ]
  }
  */

  yara.initialize(function (error) {
    if (error) {
      console.error(error);
    } else {
      var scanner = yara.createScanner();
      scanner.configure(options, function (error, warnings) {
        if (error) {
          //if (error instanceof yara.CompileRulesError) console.error(error.message + ": " + JSON.stringify(error.errors))
          console.error(error);
        } else {
          if (warnings.length) {
            console.error("Compile warnings: " + JSON.stringify(warnings));
          } else {
            scanner.scan(reqbuf, function (error, result) {
              if (error) {
                console.error("scan failed: %s", error.message);
              } else {
                console.log(result);
                if (result.rules.length) {
                  console.log("matched: %s", JSON.stringify(result));
                }
                var matched = yaraMatched(result, reqbuf.buffer);
                return res.json(matched);
                //return res.json(result);
              }
            });
          }
        }
      });
    }
  });
  //return res.json(result);
});

module.exports = router;
