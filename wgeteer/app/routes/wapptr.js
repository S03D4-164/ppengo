const wapalyze = async (url, headers, html, cookies) => {
  let result;
  //const { Wappalyzer, technologies, categories } = require("wapalyzer-core");
  const path = require("node:path");
  const fs = require("fs");
  const { Wappalyzer } = require("wapalyzer-core");
  //const categories = require("./webappanalyzer/src/categories.json");
  const categories = JSON.parse(
    fs.readFileSync(path.resolve(`../webappanalyzer/src/categories.json`)),
  );
  //console.log(categories);
  let technologies = {};
  for (const index of Array(27).keys()) {
    const character = index ? String.fromCharCode(index + 96) : "_";
    technologies = {
      ...technologies,
      ...JSON.parse(
        fs.readFileSync(
          path.resolve(`../webappanalyzer/src/technologies/${character}.json`),
        ),
      ),
    };
  }
  //console.log(technologies);
  Wappalyzer.setTechnologies(technologies);
  Wappalyzer.setCategories(categories);
  //console.log("[headers]", headers)
  //console.log("[cookies]", cookies)
  try {
    const detections = await Wappalyzer.analyze({
      url: url,
      //meta: { generator: ["WordPress"] },
      headers: headers,
      //scriptSrc: ["jquery-3.0.0.js"],
      cookies: cookies,
      html: html,
    });

    result = Wappalyzer.resolve(detections);
    //console.log("[result] ", result);
  } catch (error) {
    console.error("Error analyzing website:", error);
  }
  return result;
};

/*
const pptryze = async () => {
  const url = "http://localhost/";
  const puppeteer = require("puppeteer");
  var chromiumArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    //'--enable-logging=stderr','--v=1',
  ];
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    defaultViewport: { width: 1280, height: 720 },
    //dumpio: true,
    args: chromiumArgs,
  });
  const page = await browser.newPage();
  const response = await page.goto(url);
  console.log(await page.title(), await page.url());
  //const status = await response.status();
  const text = await response.text();
  const cookies = await page.cookies();
  let headers = response.headers();
  for (let head in headers) {
    headers[head] = headers[head].split(";");
  }
  //await wappalyze(url, response.headers(), text);
  await wapalyze(url, headers, text, cookies);

  await browser.close();
};

pptryze();
*/

module.exports = wapalyze;
