var express = require("express");
var router = express.Router();

var deobfuscator = require("obfuscator-io-deobfuscator");

router.post("/", async function (req, res) {
  var result = {};
  var source = req.body.source;
  if (!source) return res.json(result);
  result["source"] = deobfuscator.deobfuscate(source);
  console.log(result);
  return res.json(result);
});

module.exports = router;
