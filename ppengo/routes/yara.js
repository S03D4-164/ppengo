var yara = require('yara');
const Webpage = require('./models/webpage');
const Response = require('./models/response');

async function yaraScan(source){
  return new Promise(function(resolve, reject){
    var buf = {buffer: Buffer.from(source)};
    //console.log(buf);
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
          console.error(error)
        } else {
          if (warnings.length) {
            console.error("Compile warnings: " + JSON.stringify(warnings))
          } else {
            try{
              scanner.scan(buf, function(error, result) {
                if (error) {
                  console.error("scan failed: %s", error.message)
                } else {
                  console.log(result);
                  if (result.rules.length) {
                    console.log("matched: %s", JSON.stringify(result))
                  }
                  resolve(result);
                }
              });
            }catch(err){
              console.log(err);
            }
          }
        }
      });
     }
    })


    }
  )
}

module.exports = {
  async yaraPage(id){
    await Webpage.findById(id)
    .then(async (page) => {
      if(page.content){
        page.yara = await yaraScan(page.content);
        await page.save();
        console.log(page.yara)  
      }
    });
    await Response.find({"webpage":id})
    .then(async (responses) => {
        console.log(responses.length);
        for(let res of responses){
            if(res.text){
              console.log("url",res.url)
              res.yara = await yaraScan(res.text);
              await res.save();
              console.log("yara",res.yara)
            }
        }
    });
  }
}