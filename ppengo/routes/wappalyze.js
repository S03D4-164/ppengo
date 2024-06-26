const Driver = require('wappalyzer/driver');
const processHtml = require('wappalyzer/driver').processHtml;
const processJs = require('wappalyzer/driver').processJs;

const Webpage = require('./models/webpage');
const Response = require('./models/response');

const logger = require('./logger')

const wappalyze = async function (url, headers, text, cookies){
  let Browser = null;
  let driver = new Driver(Browser, url, {"debug":false});
  let wappalyzer = driver.wappalyzer;  
  //let html = text?processHtml(text):null;
  //const html = text;
  //const js = text?processJs(text, wappalyzer.jsPatterns):null;
  var header = {};
  for (let head in headers){
    header[head] = headers[head].split(';');
  }
  wappalyzer.parseJsPatterns();
  var data = {
    //"scripts":text?[text]:null,
    "cookies":cookies,
    "headers":header,
    "js": text?processJs(text, wappalyzer.jsPatterns):null,
    "html": text?processHtml(text):null,
  };
  await wappalyzer.analyze(url, data);
  logger.debug(url, driver.apps);
  //const wappalyzed = driver.apps;
  var wapps = [];
  for (let wap in driver.apps){
    //wapps.push(wappalyzed[wap]["name"]);
    wapps.push(driver.apps[wap]["name"]);
  }
  data = null;
  driver.apps = null;
  driver.wappalyzer = null;
  driver = null;
  wappalyzer.jsPatterns = null;
  wappalyzer = null;
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
              cookies,
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
                  cookies,
                );
                console.log(wapps);
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
