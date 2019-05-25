const Driver = require('wappalyzer/driver');
const processHtml = require('wappalyzer/driver').processHtml;
const processJs = require('wappalyzer/driver').processJs;

const Webpage = require('./models/webpage');
const Response = require('./models/response');

const wappalyze = async function (url, headers, text, cookies){
  let Browser,
  options = {"debug":true};
  const driver = new Driver(Browser, url, options);
  const wappalyzer = driver.wappalyzer;  
  const html = processHtml(text);
  //const html = text;
  wappalyzer.parseJsPatterns();
  const js = processJs(text, wappalyzer.jsPatterns);
  var header = {};
  for (let head in headers){
    header[head] = headers[head].split(';');
  }
  var data = {
    "scripts":[text],
    "cookies":cookies,
    "headers":header,
    "js":js,
    "html":html,
  };
  await wappalyzer.analyze(url, data);
  console.log(url, driver.apps);
  const wappalyzed = driver.apps;
  var wapps = [];
  for (let wap in wappalyzed){
    wapps.push(wappalyzed[wap]["name"]);
  }
  return wapps;
};

module.exports = {
  async analyze(id){
    console.log("wappalyze", id)
    await Webpage.findById(id)
    .then(async (webpage) => {
      try{
        //const cookies = await page.cookies();
        console.log("page", webpage.url);
        let cookies;
        const wapps = await wappalyze(
            webpage.url,
            webpage.headers,
            webpage.content,
            cookies,
        );
        if (wapps) {
          webpage.wappalyzer = wapps;
          webpage.save();
        }  
      }catch(err){
        console.log(err);
      }

    });
    await Response.find({"webpage":id})
    .then(async (responses) => {
        console.log(responses.length);
        for(let response of responses){
              try{
                let cookies;
                const wapps = await wappalyze(
                  response.url,
                  response.headers,
                  response.text,
                  cookies,
                );
                //console.log(wapps);
                if (wapps) {
                  response.wappalyzer = wapps;
                  response.save();
                }
              }catch(err){
                console.log(err);
              }
        }
        
    });
  }
}