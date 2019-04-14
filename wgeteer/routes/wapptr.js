const Driver = require('wappalyzer/driver');

const wapptr = async function (url, headers, text, cookies){
  let Browser,
  options = {"debug":true};
  const driver = new Driver(Browser, url, options);
  const wappalyzer = driver.wappalyzer;  
  //const html = driver.processHtml(text);
  const html = text;
  const js = driver.processJs(text);
  console.log(headers);
  var header = {};
  for (let head in headers){
    header[head] = headers[head].split(';');
  }
  let scripts;
  var data = {
    //"scripts":[text],
    "scripts":scripts,
    "cookies":cookies,
    "headers":header,
    "js":js,
    "html":html,
  };
  await wappalyzer.analyze(url, data);
  //console.log(url, driver.apps);
  const wappalyzed = driver.apps;
  var wapps = [];
  for (let wap in wappalyzed){
    wapps.push(wappalyzed[wap]["name"]);
  }
  return wapps;
};

const pptryze = async () => {
  const puppeteer = require('puppeteer');
  var chromiumArgs= [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    //'--enable-logging=stderr','--v=1',
  ];
  const browser = await puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    defaultViewport: {width: 1280, height: 720,},
    dumpio:true,
    args: chromiumArgs,
});
  const page = await browser.newPage();
  const response = await page.goto(url);

  const text = await response.text();
  const cookies = await page.cookies();
  headers = response.headers();
  for (let head in headers){
    headers[head] = headers[head].split(';');
  }
  /*
  const html = driver.processHtml(text);
  const js = driver.processJs(text);
  var data = {
    "scripts":[text],
    "cookies":cookies,
    "headers":headers,
    "js":js,
    "html":html,
  };
  await wapptr(url, data);*/
  await wapptr(url, headers, text, cookies);

  await browser.close();
};

module.exports = wapptr;
