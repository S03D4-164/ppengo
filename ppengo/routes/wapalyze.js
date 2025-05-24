//const { Wappalyzer, technologies, categories } = require("wapalyzer-core");
const wappalyzer = require("simple-wappalyzer");

const Webpage = require("./models/webpage");
const Response = require("./models/response");

const logger = require("./logger");

const wappalyze = async function (url, headers, text, status) {
  let wapps = [];
  try {
    const results = await wappalyzer({ url, text, status, headers });
    for (let result of results) {
      if (result.confidence == 100) {
        wapps.push(result.name);
      }
    }
  } catch (err) {
    console.log(err);
  }
  console.log(url, wapps);
  return wapps;
};

const parseHeaders = async function (headers) {
  let parsedHeaders = {};
  for (let header of headers) {
    parsedHeaders[header.name] = header.value;
  }
  console.log(parsedHeaders);
  return parsedHeaders;
};

module.exports = {
  async analyze(id) {
    logger.debug(`wappalyze ${id}`);
    let playwright = false;
    await Webpage.findById(id).then(async (webpage) => {
      try {
        let headers;
        //let cookies;
        if (webpage.option.pptr == "playwright") {
          playwright = true;
          headers = await parseHeaders(webpage.headers);
        }
        if (webpage.url) {
          let wapps = await wappalyze(
            webpage.url,
            headers,
            webpage.content,
            webpage.status,
            //cookies,
          );
          if (wapps.length > 0) {
            await Webpage.findOneAndUpdate(
              { _id: webpage._id },
              { wappalyzer: wapps },
            );
          }
          //wapps = null;
        }
      } catch (err) {
        logger.error(err);
      }
    });
    let newResponses = [];
    await Response.find({ webpage: id }).then(async (responses) => {
      //logger.debug(responses.length);
      for (let response of responses) {
        try {
          if (response.url) {
            //let cookies = null;
            let headers;
            if ((playwright = true)) {
              headers = await parseHeaders(response.headers);
            }
            let wapps = await wappalyze(
              response.url,
              headers,
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
        } catch (err) {
          logger.debug(err);
        }
      }
    });
    //console.log(newResponses);
    await Response.bulkSave(newResponses);
    return;
  },
};
