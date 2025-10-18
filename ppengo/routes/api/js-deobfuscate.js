var express = require("express");
var router = express.Router();

var deobfuscator = require("js-deobfuscator");

router.post("/", async function (req, res) {
  var result = {};
  var source = req.body.source;
  if (!source) return res.json(result);
  let config = {
    verbose: false,
    isModule: false,
    arrays: {
      unpackArrays: true,
      removeArrays: true,
    },
    proxyFunctions: {
      replaceProxyFunctions: true,
      removeProxyFunctions: true,
    },
    expressions: {
      simplifyExpressions: true,
      removeDeadBranches: true,
      undoStringOperations: true,
    },
    miscellaneous: {
      beautify: true,
      simplifyProperties: true,
      renameHexIdentifiers: true,
    },
  };
  result["source"] = deobfuscator.deobfuscate(source, config);
  console.log(result);
  return res.json(result);
});

module.exports = router;
