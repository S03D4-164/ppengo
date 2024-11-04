var yara = require("yara");
const Webpage = require("./models/webpage");
const Response = require("./models/response");
const Payload = require("./models/payload");
const Yara = require("./models/yara");
const logger = require("./logger");

async function yaraScan(source) {
  return new Promise(function (resolve, reject) {
    yara.initialize(async function (error) {
      if (error) {
        logger.error(error.message);
        reject();
      } else {
        var scanner = yara.createScanner();

        let rules = [];
        const yararules = await Yara.find();
        for (let yararule of yararules) {
          rules.push(yararule.rule);
        }
        let rule_string = rules.join("\n");
        //console.log(rule_string);
        let options = { rules: [{ string: rule_string }] };
        /*
        var options = {
          rules: [
            //{filename: "/home/node/config/rules/index.yar"},
            { filename: "/tmp/config/rules/index.yar" },
          ],
        };
        */
        scanner.configure(options, function (error, warnings) {
          if (error) {
            logger.error(error);
          } else {
            if (warnings.length) {
              logger.debug("Compile warnings: " + JSON.stringify(warnings));
            }
            //else {
            try {
              var buf = { buffer: Buffer.from(source, "utf-8") };
              scanner.scan(buf, function (error, result) {
                if (error) {
                  logger.error(`scan failed: ${error.message}`);
                } else {
                  if (result.rules.length)
                    logger.debug(`matched: ${JSON.stringify(result)}`);
                  buf.buffer = null;
                  buf = null;
                  options = null;
                  resolve(result);
                }
              });
            } catch (err) {
              logger.error(err);
            }
            //}
          }
        });
      }
    });
  });
}

module.exports = {
  async yaraPayload(id) {
    console.log(`[yara] Payload ${id}`);
    await Payload.findById(id).then(async (payload) => {
      if (payload.payload) {
        payload.yara = await yaraScan(payload.payload);
        await payload.save();
        logger.debug(payload.yara);
        return payload;
      } else {
        console.log("[yara] payload is empty");
      }
      return;
    });
  },
  async yaraPage(id) {
    await Webpage.findById(id).then(async (page) => {
      if (page.content) {
        console.log(page._id, page.content.length);
        var yara = await yaraScan(page.content);
        //logger.debug(`yara ${yara.rules}`);
        if (yara.rules.length > 0) {
          await Webpage.findOneAndUpdate({ _id: page._id }, { yara: yara });
        }
        yara = null;
      }
    });
    let newResponses = [];
    await Response.find({ webpage: id }).then(async (responses) => {
      //logger.debug(responses.length);
      for (let res of responses) {
        if (res.text) {
          //logger.debug(`url ${res.url}`);
          var yara = await yaraScan(res.text);
          //logger.debug(`yara ${yara.rules}`);
          if (yara.rules.length > 0) {
            //await Response.findOneAndUpdate(
            //  {_id: res._id}, {yara: yara}
            //);
            res.yara = yara;
            newResponses.push(res);
          }
          yara = null;
        }
      }
    });
    await Response.bulkSave(newResponses);
    return;
  },
};
