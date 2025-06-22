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
    parsedHeaders[header.name.toLowerCase()] = header.value;
  }
  console.log(parsedHeaders);
  return parsedHeaders;
};

module.exports = {
  async analyze(id) {
    logger.debug(`wappalyze ${id}`);
    let playwright = false;
    let webpage;
    try {
      webpage = await Webpage.findById(id);
    } catch (err) {
      logger.error(err);
    }
    if (!webpage) {
      return;
    } else {
      let headers;
      if (webpage.option.pptr == "playwright") {
        playwright = true;
        headers = await parseHeaders(webpage.headers);
      }
      if (!webpage.wappalyzer) {
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
      }
    }

    let newResponses = [];
    let responses;
    try {
      responses = await Response.find({ webpage: id });
      for (let response of responses) {
        if (!response.wappalyzer) {
          let headers;
          if ((playwright = true)) {
            headers = await parseHeaders(response.headers);
          }
          let wapps = await wappalyze(
            response.url,
            headers,
            response.text,
            response.status,
          );
          if (wapps.length > 0) {
            //await Response.findOneAndUpdate(
            //  {_id: response._id}, {wappalyzer: wapps}
            //);
            response.wappalyzer = wapps;
            newResponses.push(response);
          }
        }
      }
    } catch (err) {
      logger.error(err);
    }

    //console.log(newResponses);
    await Response.bulkSave(newResponses);
    return;
  },
};
