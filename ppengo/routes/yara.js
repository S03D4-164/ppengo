var yara = require('yara');
const Webpage = require('./models/webpage');
const Response = require('./models/response');
const Payload = require('./models/payload');
const logger = require('./logger')

async function yaraScan(source){
  return new Promise(function(resolve, reject){
    yara.initialize(function(error) {
      if (error) { logger.error(error.message) 
      } else {
        var scanner = yara.createScanner();
        var options = {
          rules: [
            //{filename: "/home/node/config/rules/index.yar"},
            {filename: "/tmp/rules/index.yar"},
          ]
        }
        scanner.configure(options, function(error, warnings) {
          if (error) { 
            logger.error(error);
          } else {
            if (warnings.length) { logger.debug("Compile warnings: " + JSON.stringify(warnings)) }
            //else {
            try{
                var buf = {"buffer": Buffer.from(source, "utf-8")};
                scanner.scan(buf, function(error, result) {
                  if (error) {
                    logger.error(`scan failed: ${error.message}`);
                   } else {
                    if (result.rules.length) logger.debug(`matched: ${JSON.stringify(result)}`);
                    buf.buffer = null;
                    buf = null;
                    options = null;
                    resolve(result);
                  }
                });
            }catch(err){
              logger.error(err);
            }
            //}
          }
        });
      }
    })
  })
}

module.exports = {
  async yaraPayload(id){
    await Payload.findById(id)
    .then(async (payload) => {
      if(payload.payload){
        payload.yara = await yaraScan(payload.payload);
        await payload.save();
        logger.debug(payload.yara)  
      }
    });
  },
  async yaraPage(id){
    await Webpage.findById(id)
    .then(async (page) => {
      //console.log(page._id, page.content.length)
      if(page.content){
        var yara = await yaraScan(page.content);
        logger.debug(`yara ${yara}`)  
        if(yara.rules.length > 0){
          await Webpage.findOneAndUpdate(
            {_id: page._id},
            {yara: yara}
          );
        }
        yara = null;
      }
    });
    await Response.find({"webpage":id})
    .then(async (responses) => {
        //logger.debug(responses.length);
        for(let res of responses){
            if(res.text){
              logger.debug(`url ${res.url}`);
              var yara = await yaraScan(res.text);
              logger.debug(`yara ${yara}`);
              if(yara.rules.length > 0){
                await Response.findOneAndUpdate(
                  {_id: res._id},
                  {yara: yara}
                );
              }
              yara = null;
            }
        }
    });
    return;
  }
}
