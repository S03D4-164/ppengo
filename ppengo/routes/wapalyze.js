const { Wappalyzer, technologies, categories } = require("wapalyzer-core");
const path = require("path");
const fs = require("fs");
const logger = require("./logger");
const Webpage = require("./models/webpage");
const Response = require("./models/response");

const wapalyze = async (url, headers, html, cookies) => {
  try {
    const jscategories = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, `./webappanalyzer/src/categories.json`),
        "utf-8",
      ),
    );
    let jstechnologies = {};
    for (const index of Array(27).keys()) {
      const character = index ? String.fromCharCode(index + 96) : "_";
      jstechnologies = {
        ...technologies,
        ...JSON.parse(
          fs.readFileSync(
            path.resolve(
              __dirname,
              `./webappanalyzer/src/technologies/${character}.json`,
            ),
            "utf-8",
          ),
        ),
      };
    }
    Wappalyzer.setTechnologies(jstechnologies);
    Wappalyzer.setCategories(jscategories);
  } catch (err) {
    console.log(err);
  }

  let wapps = [];
  try {
    const detections = await Wappalyzer.analyze({
      url: url,
      headers: headers,
      cookies: cookies,
      html: html,
    });
    results = Wappalyzer.resolve(detections);
    console.log(results);
    for (let result of results) {
      if (result.confidence == 100) {
        wapps.push(result.name);
      }
    }
  } catch (error) {
    console.error("Error analyzing website:", error);
  }
  return wapps;
};

const parseHeaders = async function (headers) {
  let parsedHeaders = {};
  for (let header of headers) {
    parsedHeaders[header.name.toLowerCase()] = [header.value];
  }
  //console.log(parsedHeaders);
  return parsedHeaders;
};

module.exports = {
  async analyze(id) {
    logger.debug(`wapalyze ${id}`);
    let playwright = false;
    await Webpage.findById(id).then(async (webpage) => {
      try {
        let headers;
        let cookies;
        if (webpage.option.pptr == "playwright") {
          playwright = true;
          headers = await parseHeaders(webpage.headers);
        }
        if (webpage.url) {
          let wapps = await wapalyze(
            webpage.url,
            headers,
            webpage.content,
            //webpage.status,
            cookies,
          );
          if (wapps.length > 0) {
            await Webpage.findOneAndUpdate(
              { _id: webpage._id },
              { wappalyzer: wapps },
            );
          }
        }
      } catch (err) {
        logger.error(err);
      }
    });
    let newResponses = [];
    const responses = await Response.find({ webpage: id });
    //logger.debug(responses.length);
    for (let response of responses) {
      try {
        if (response.url) {
          let cookies;
          let headers;
          if ((playwright = true)) {
            headers = await parseHeaders(response.headers);
          }
          let wapps = await wapalyze(
            response.url,
            headers,
            response.text,
            cookies,
            //response.status,
          );
          //console.log(wapps);
          if (wapps.length > 0) {
            //await Response.findOneAndUpdate(
            //  {_id: response._id}, {wappalyzer: wapps}
            //);
            response.wappalyzer = wapps;
            newResponses.push(response);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    //console.log(newResponses);
    await Response.bulkSave(newResponses);
    return;
  },
};
