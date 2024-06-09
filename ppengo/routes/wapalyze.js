//const { Wappalyzer, technologies, categories } = require("wapalyzer-core");
const wappalyzer = require('simple-wappalyzer')

const Webpage = require('./models/webpage');
const Response = require('./models/response');

const logger = require('./logger')

const wappalyze = async function (url, headers, text, status){
  //console.log(url, headers);
  let wapps = [];
  try{
    const results = await wappalyzer({ url, text, status, headers });
    for (let result of results){
      //console.log(result);
      if (result.confidence==100){
        wapps.push(result.name);
      }
    }
  }catch(err){
    console.log(err);
  }
  return wapps;
};

module.exports = {
  async analyze(id){
    logger.debug(`wappalyze ${id}`)
    await Webpage.findById(id)
    .then(async (webpage) => {
      try{
        //const cookies = await page.cookies();
        if(webpage.url){
          logger.debug(`page: ${webpage.url}`);
          let cookies = null;
          let wapps = await wappalyze(
              webpage.url,
              webpage.headers,
              webpage.content,
              webpage.status,
              //cookies,
          );
          if (wapps.length > 0) {
            await Webpage.findOneAndUpdate(
              {_id: webpage._id},
              {wappalyzer: wapps}
            );
          }
          wapps = null;
        }
      }catch(err){
        logger.debug(err);
      }
    });
    let newResponses = [];
    await Response.find({"webpage":id})
    .then(async (responses) => {
        //logger.debug(responses.length);
        for(let response of responses){
          try{
            if(response.url){
                let cookies = null;
                let wapps = await wappalyze(
                  response.url,
                  response.headers,
                  response.text,
                  response.status,
                  //cookies,
                );
                //console.log(wapps);
                if (wapps.length > 0) {
                  //await Response.findOneAndUpdate(
                  //  {_id: response._id}, {wappalyzer: wapps}
                  //);
                  response.wappalyzer = wapps;
                  newResponses.push(response);
                }
                wapps = null;
            }
          }catch(err){
            logger.debug(err);
        }
      }
    });
    //console.log(newResponses);
    await Response.bulkSave(newResponses);
    return;
  }
}
