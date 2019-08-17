var yara = require('yara');
const Webpage = require('./models/webpage');
const Response = require('./models/response');
const Payload = require('./models/payload');

async function yaraScan(source){
  return new Promise(function(resolve, reject){
    yara.initialize(function(error) {
      if (error) { console.error(error.message) 
      } else {
        var scanner = yara.createScanner();
        var options = {
          rules: [
            {filename: "/home/node/config/rules/index.yar"},
          ]
        }
        scanner.configure(options, function(error, warnings) {
          if (error) { 
            console.error(error);
          } else {
            if (warnings.length) { console.log("Compile warnings: " + JSON.stringify(warnings)) }
            //else {
            try{
                var buf = {"buffer": Buffer.from(source, "utf-8")};
                scanner.scan(buf, function(error, result) {
                  if (error) {
                    console.error("scan failed: %s", error.message);
                   } else {
                    if (result.rules.length) console.log("matched: %s", JSON.stringify(result));
                    buf.buffer = null;
                    buf = null;
                    options = null;
                    resolve(result);
                  }
                });
            }catch(err){
              console.error(err);
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
        console.log(payload.yara)  
      }
    });
  },
  async yaraPage(id){
    await Webpage.findById(id)
    .then(async (page) => {
      //console.log(page._id, page.content.length)
      if(page.content){
        var yara = await yaraScan(page.content);
        console.log("yara", yara)  
        await Webpage.findOneAndUpdate(
          {_id: page._id},
          {yara: yara}
        );
        yara = null;
      }
    });
    await Response.find({"webpage":id})
    .then(async (responses) => {
        console.log(responses.length);
        for(let res of responses){
            if(res.text){
              console.log("url",res.url)
              var yara = await yaraScan(res.text);
              console.log("yara",yara)
              await Response.findOneAndUpdate(
                {_id: res._id},
                {yara: yara}
              );
              yara = null;
            }
        }
    });
    return;
  }
}