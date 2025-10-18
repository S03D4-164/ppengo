var express = require("express");
var router = express.Router();

router.post("/", async function (req, res) {
  const { REstringer } = await import("restringer");
  var result = {};
  var source = req.body.source;
  if (!source) return res.json(result);
  const restringer = new REstringer(source);
  if (restringer.deobfuscate()) {
    console.log(restringer);
    result["source"] = restringer.script;
  }
  return res.json(result);
});

module.exports = router;
