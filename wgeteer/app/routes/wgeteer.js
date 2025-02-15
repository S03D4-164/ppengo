process.env.REBROWSER_PATCHES_DEBUG = 0;
//process.env.REBROWSER_PATCHES_RUNTIME_FIX_MODE = "enableDisable";
//const puppeteer = require("puppeteer");
//const puppeteer = require("puppeteer-extra");
const { addExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const rebrowserPuppeteer = require("rebrowser-puppeteer");
const puppeteer = addExtra(rebrowserPuppeteer);
puppeteer.use(StealthPlugin());

/*
async function prbstart() {
  const { connect } = await import("puppeteer-real-browser");
  return connect;
}
*/

//const antibotbrowser = require("antibotbrowser");
const antibotbrowser = require("./antibotbrowser");

const findProc = require("find-process");
const Jimp = require("jimp");
const crypto = require("crypto");
//const fs = require('fs');
//const fileType = require('file-type');

//const path =require('path');
//const pathToExtension = path.join(process.cwd(), 'chromium');
//const pathToExtension = path.join(process.cwd(), 'chromium_automation');
//console.log(pathToExtension)

const ipInfo = require("./ipInfo");
const logger = require("./logger");
//const prediction = require('./prediction')
const wapalyze = require("./wapptr");

const mongoose = require("mongoose");

const mongoConnectionString = "mongodb://127.0.0.1:27017/wgeteer";

var db = mongoose.createConnection(mongoConnectionString, {
  //useUnifiedTopology: true,
  //useNewUrlParser: true,
  //useCreateIndex: true,
  //useFindAndModify: false,
});

const Webpage = require("../models/webpage");
const Request = require("../models/request");
const Response = require("../models/response");
const Screenshot = require("../models/screenshot");
const Payload = require("../models/payload");

async function closeDB() {
  try {
    const modelNames = Object.keys(db.models);
    modelNames.forEach((modelName) => {
      delete db.models[modelName];
      logger.debug("deleted model " + modelName);
    });

    const collectionNames = Object.keys(db.collections);
    collectionNames.forEach((collectionName) => {
      delete db.collections[collectionName];
      logger.debug("deleted collection " + collectionName);
    });
    /*
    const modelSchemaNames = Object.keys(db.base.modelSchemas);
    modelSchemaNames.forEach((modelSchemaName) => {
      delete db.base.modelSchemas[modelSchemaName];
      logger.debug("deleted schema " + modelSchemaName);
    });
    */
  } catch (err) {
    logger.error(err);
  }
}

async function pptrEventSet(client, browser, page) {
  /*
  client.on("Network.requestWillBeSent", async ({ requestId, request }) => {
    logger.debug("[requestWillBeSent]", requestId);
    const req = await new Request({
      devtoolsReqId: requestId,
      webpage: pageId,
    });
    await req.save();
  });

  client.on("Network.responseReceived", async ({ requestId, response }) => {
    logger.debug("[responseReceived]", requestId);
    const res = await new Response({
      devtoolsReqId: requestId,
      webpage: pageId,
    });
    await res.save();
  });

  client.on(
    "Network.loadingFinished",
    async ({ requestId, encodedDataLength }) => {
      const response = await client.send("Network.getResponseBody", {
        requestId,
      });
      if (response.body) {
        logger.debug(
          "[loadingFinished]",
          requestId,
          encodedDataLength,
          response.body.length,
          response.base64Encoded,
        );
      } else {
        logger.debug(
          "[loadingFinished] no body",
          requestId,
          encodedDataLength,
          response.body,
          response.base64Encoded,
        );
      }
    },
  );

  client.on(
    "Network.loadingFailed",
    async ({ requestId, encodedDataLength }) => {
      const response = await client.send("Network.getResponseBody", {
        requestId,
      });
      if (response.body) {
        logger.debug(
          "[loadingFinished]",
          requestId,
          encodedDataLength,
          response.body.length,
          response.base64Encoded,
        );
      } else {
        logger.debug(
          "[loadingFinished] no body",
          requestId,
          encodedDataLength,
          response.body,
          response.base64Encoded,
        );
      }
    },
  );

  client.on("Network.dataReceived", async ({ requestId, dataLength }) => {
    logger.debug(`[dataReceived] ${requestId} ${dataLength}`);
  });

  browser.on("targetchanged", async (tgt) =>
    console.log("[Browser] taget changed: ", tgt),
  );
  browser.on("targetcreated", async (tgt) =>
    console.log("[Browser] taget created: ", tgt),
  );
  browser.on("targetdestroyed", async (tgt) =>
    console.log("[Browser taget destroyed: ", tgt),
  );

  page.on("frameattached", (frm) => console.log("[Frame] attached: ", frm));
  page.on("framedetached", (frm) => console.log("[Frame] detached: ", frm));
  page.on("framenavigateed", (frm) => console.log("[Frame] navigated: ", frm));
  */

  page.on("dialog", async (dialog) => {
    console.log("[Page] dialog: ", dialog.type(), dialog.message());
    await dialog.dismiss();
  });
  page.on("console", async (msg) => {
    console.log("[Page] console: ", msg.type(), msg.text());
  });
  page.on("error", async (err) => {
    console.log("[Page] error: ", err);
  });
  page.on("pageerror", async (perr) => {
    console.log("[Page] page error: ", perr);
  });

  page.on("workercreated", (wrkr) => console.log("[Worker] created: ", wrkr));
  page.on("workerdestroyed", (wrkr) =>
    console.log("[Worker] destroyed: ", wrkr),
  );

  page.on("request", async (interceptedRequest) => {
    try {
      console.log(
        "[Request] ",
        //interceptedRequest,
        //interceptedRequest._requestId,
        interceptedRequest.method(),
        interceptedRequest.resourceType(),
        interceptedRequest.url().slice(0, 100),
      );
    } catch (error) {
      console.log(error);
    }
  });

  page.on("response", async (interceptedResponse) => {
    try {
      console.log(
        "[Response] ",
        interceptedResponse.status(),
        interceptedResponse.remoteAddress(),
        interceptedResponse.url().slice(0, 100),
      );
    } catch (error) {
      console.log(error);
    }
  });
}

async function savePayload(responseBuffer) {
  try {
    let md5Hash = crypto.createHash("md5").update(responseBuffer).digest("hex");
    //var ftype = fileType(responseBuffer);
    //console.log("[Response] fileType", ftype)
    //ftype = ftype?ftype.mime:undefined;
    let payload = await Payload.findOneAndUpdate(
      { md5: md5Hash },
      {
        payload: responseBuffer,
        //"fileType":ftype,
      },
      { new: true, upsert: true },
    );
    return payload._id;
  } catch (err) {
    console.log(err);
  }
  return;
}

async function saveResponse(interceptedResponse, request, responseCache) {
  let responseBuffer;
  let text;
  let payloadId;
  let responseStatus = await interceptedResponse.status();
  let interceptionId;
  try {
    for (let cache of responseCache) {
      if (interceptedResponse.url() == cache["url"]) {
        responseBuffer = cache["body"];
        text = cache["body"].toString("utf-8");
        interceptionId = cache["interceptionId"];
      }
    }
    //if (responseBuffer) console.log("[Response] cache exists");
    //else console.log("[Response] no cache");
    if (responseStatus < 300 && responseStatus > 399)
      responseBuffer = await interceptedResponse.buffer();
  } catch (err) {
    console.log("[Response] failed on save buffer", err);
    //logger.debug("[Response] failed on save buffer", err);
  }

  if (responseBuffer) payloadId = await savePayload(responseBuffer);

  try {
    if (responseStatus < 300 && responseStatus > 399)
      text = await interceptedResponse.text();
  } catch (err) {
    console.log("[Response] failed on save text", err);
    //logger.debug("[Response] failed on save text", err);
  }
  let securityDetails = {};
  try {
    if (interceptedResponse.securityDetails()) {
      securityDetails = {
        issuer: interceptedResponse.securityDetails().issuer(),
        protocol: interceptedResponse.securityDetails().protocol(),
        subjectName: interceptedResponse.securityDetails().subjectName(),
        validFrom: interceptedResponse.securityDetails().validFrom(),
        validTo: interceptedResponse.securityDetails().validTo(),
      };
    }
  } catch (error) {
    logger.debug(error);
  }

  try {
    let url = interceptedResponse.url();
    let urlHash = crypto.createHash("md5").update(url).digest("hex");
    const headers = interceptedResponse.headers();
    var newHeaders = {};
    // replace dot in header
    for (const key of Object.keys(headers)) {
      if (key.includes(".")) {
        let newKey = key.replace(/\./g, "\uff0e");
        newHeaders[newKey] = headers[key];
      } else {
        newHeaders[key] = headers[key];
      }
    }
    const response = {
      webpage: request.webpage,
      url: url,
      urlHash: urlHash,
      status: interceptedResponse.status(),
      statusText: interceptedResponse.statusText(),
      ok: interceptedResponse.ok(),
      remoteAddress: interceptedResponse.remoteAddress(),
      //headers: interceptedResponse.headers(),
      headers: newHeaders,
      securityDetails: securityDetails,
      payload: payloadId,
      text: text,
      interceptionId: interceptionId,
    };
    if (text) {
      const sizelimit = 16000000;
      const resLength = JSON.stringify(response).length;
      //console.log(resLength);
      if (resLength > sizelimit) {
        response.text = undefined;
      }
    }
    return response;
  } catch (error) {
    //logger.info(error);
    console.log(error);
  }
  return;
}

async function saveRequest(interceptedRequest, pageId) {
  let redirectChain = [];
  try {
    const chain = interceptedRequest.redirectChain();
    if (chain) {
      for (let seq in chain) {
        //console.log("[Chain]", interceptedRequest.url(),  chain[seq].url());
        redirectChain.push(chain[seq].url());
      }
    }
  } catch (error) {
    logger.info(error);
  }

  // replace dot in header
  const headers = interceptedRequest.headers();
  var newHeaders = {};
  for (const key of Object.keys(headers)) {
    if (key.includes(".")) {
      let newKey = key.replace(/\./g, "\uff0e");
      newHeaders[newKey] = headers[key];
    } else {
      newHeaders[key] = headers[key];
    }
  }

  try {
    const request = {
      webpage: pageId,
      url: interceptedRequest.url(),
      method: interceptedRequest.method(),
      resourceType: interceptedRequest.resourceType(),
      isNavigationRequest: interceptedRequest.isNavigationRequest(),
      postData: interceptedRequest.postData(),
      //headers: interceptedRequest.headers(),
      headers: newHeaders,
      failure: interceptedRequest.failure(),
      redirectChain: redirectChain,
    };
    return request;
  } catch (err) {
    console.log(err);
  }
  return;
}

async function saveFullscreenshot(fullscreenshot) {
  try {
    let buff = new Buffer.from(fullscreenshot, "base64");
    let md5Hash = crypto.createHash("md5").update(buff).digest("hex");
    let ss = await Screenshot.findOneAndUpdate(
      { md5: md5Hash },
      { screenshot: fullscreenshot },
      { new: true, upsert: true },
    );
    buff = null;
    md5Hash = null;
    if (ss._id) {
      let id = ss._id;
      ss = null;
      return id;
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
    return;
  }
}

module.exports = {
  async wget(pageId) {
    let webpage = await Webpage.findById(pageId)
      .then((doc) => {
        return doc;
      })
      .catch((err) => {
        console.log(err);
        //logger.err(err);
        return;
      });
    if (!webpage) {
      logger.error(`page ${pageId} not found`);
      return;
    }
    try {
      await findProc("name", "chrome").then(
        function (list) {
          //console.log(list, list.length);
          for (let ps of list) {
            if (ps.name === "chrome") {
              if (ps.cmd.match("/tmp/" + webpage._id)) {
                console.log("kill", ps);
                process.kill(ps.pid);
              }
            }
          }
        },
        function (err) {
          console.log(err.stack || err);
        },
      );
    } catch (err) {
      //logger.error(err);
      console.log(err);
    }
    if (webpage.url || webpage.title) {
      webpage.error = "job has been terminated.";
      await webpage.save();
      return webpage;
    }

    let exHeaders = {};
    if (webpage.option.lang) exHeaders["Accept-Language"] = webpage.option.lang;

    if (webpage.option.exHeaders) {
      for (let line of webpage.option.exHeaders.split("\r\n")) {
        let match = line.match(/^([^:]+):(.+)$/);
        if (match.length >= 2) {
          exHeaders[match[1].trim()] = match[2].trim();
        }
        match = null;
      }
    }
    const chromiumArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1280,720",
      "--start-maximized",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-web-security",
      "--disable-features=BlockInsecurePrivateNetworkRequests",
      "--devtools-flags=disable",
      "--disable-features=IsolateOrigins",
      /* Detected as a bot. Do not use.
       * "--disable-site-isolation-trials",
       */
      //`--disable-extensions-except=${pathToExtension}`,
      //`--load-extension=${pathToExtension}`,
      //'--enable-logging=stderr','--v=1',
    ];

    if (webpage.option.proxy) {
      if (
        webpage.option.proxy.match(/^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,5}$/)
      ) {
        chromiumArgs.push(`--proxy-server=${webpage.option.proxy}`);
      }
    }
    logger.debug(webpage.option);

    /*
      let executablePath = "/usr/bin/firefox";
      const product = 'firefox' ;
      const ffArgs = [
        '-wait-for-browser',
        '--disable-blink-features=AutomationControlled'
      ];
      */
    let executablePath = "/usr/bin/google-chrome-stable";
    const product = "chrome";
    async function genPage() {
      try {
        if (webpage.option.pptr == "firefox") {
          console.log(executablePath);
          const browser = await puppeteer.launch({
            product: "firefox",
            //executablePath: executablePath,
          });
          let setTarget;
          return { page, browser, setTarget };
        } else if (webpage.option.pptr == "real") {
          process.env.CHROME_PATH = executablePath;
          //const connect = await prbstart();
          const { connect } = await import("puppeteer-real-browser");
          const { page, browser, setTarget } = await connect({
            headless: false,
            args: chromiumArgs,
            tf: true,
            turnstile: true,
          });
          await page.setViewport({
            width: 1280,
            height: 720,
          });
          return { page, browser, setTarget };
        } else if (webpage.option.pptr == "antibot") {
          const antibrowser = await antibotbrowser.startbrowser();
          console.log(antibrowser);
          const opt = {
            browserWSEndpoint: antibrowser.websocket,
          };
          console.log(opt);
          const browser = await puppeteer.connect(opt);
          const page = await browser.newPage();
          let setTarget;
          return { page, browser, setTarget };
        } else {
          const browser = await puppeteer.launch({
            executablePath: executablePath,
            headless: "new",
            //headless: false,
            ignoreHTTPSErrors: true,
            //defaultViewport: { width: 1280, height: 720 },
            defaultViewport: null,
            dumpio: false,
            args: chromiumArgs,
            product: product,
            ignoreDefaultArgs: ["--enable-automation"],
            userDataDir: "/tmp/" + webpage._id,
            protocolTimeout: webpage.option.timeout * 1000,
            /*targetFilter: (target) => {
              target.type() !== "other" || !!target.url();
            },*/
          });
          /*
          const browserContext = await browser.defaultContext();
          const browserPages = await browserContext.pages();
          const page = browserPages.length > 0 ? browserPages[0] : await browserContext.newPage();
          const page = (await browser.pages())[0];
          */
          const page = await browser.newPage();
          let setTarget;
          return { page, browser, setTarget };
        }
      } catch (err) {
        console.log(err);
      }
    }
    const { page, browser, setTarget } = await genPage();
    try {
      const browserVersion = await browser.version();
      const browserProc = browser.process();
      logger.debug(
        `${browserVersion}, ${browserProc.pid}, ${page}, ${setTarget}`,
      );
    } catch (error) {
      logger.error(error);
      //webpage.error = error.message;
      //return webpage;
    }

    browser.once("disconnected", () => logger.info("[Browser] disconnected."));

    if (product == "chrome") {
      if (webpage.option.userAgent)
        if (webpage.option.userAgent.length > 1) {
          await page.setUserAgent(webpage.option.userAgent);
        }
      if (webpage.option.disableScript) await page.setJavaScriptEnabled(false);
      else await page.setJavaScriptEnabled(true);
      if (exHeaders) await page.setExtraHTTPHeaders(exHeaders);
      /* Detected as a bot. Do not use.
       * await page.setBypassCSP(true);
       */
    }

    var responseCache = [];
    var requestArray = [];
    var responseArray = [];

    let client;
    try {
      client = await page.target().createCDPSession();
      await pptrEventSet(client, browser, page);
      await client.send("Network.enable");

      if (product == "chrome") {
        await client.send("Network.setRequestInterception", {
          patterns: ["*"].map((pattern) => ({
            urlPattern: pattern,
            interceptionStage: "HeadersReceived",
          })),
        });
      }

      client.on(
        "Network.requestIntercepted",
        async ({ interceptionId, request, responseStatusCode }) => {
          //console.log(`[Intercepted] ${requestId}, ${responseStatusCode}, ${isDownload}, ${request.url}`);
          try {
            let response = await client.send(
              "Network.getResponseBodyForInterception",
              { interceptionId },
            );
            /*
            console.log(
              "[Intercepted]",
              //requestId,
              response.body.length,
              response.base64Encoded,
            );
            */
            let newBody = response.base64Encoded
              ? Buffer.from(response.body, "base64")
              : response.body;
            let cache = {
              url: request.url,
              body: newBody,
              interceptionId: interceptionId,
            };
            //cache[request.url] = newBody;
            responseCache.push(cache);
            cache = null;
            newBody = null;
            response = null;
          } catch (err) {
            if (err.message)
              logger.debug(
                `[Intercepted] ${err.message} ${responseStatusCode} ${request.url}`,
              );
            //console.log("[Intercepted] error", err);
          }

          try {
            client.send("Network.continueInterceptedRequest", {
              interceptionId,
            });
            //console.log(`Continuing interception ${interceptionId}`)
          } catch (err) {
            logger.debug(err);
          }
        },
      );
    } catch (err) {
      logger.error("[client]", err);
      webpage.error = err.message;
    }

    page.once("load", () => logger.info("[Page] loaded"));
    page.once("domcontentloaded", () =>
      logger.info("[Page] DOM content loaded"),
    );
    page.once("closed", () => logger.info("[Page] closed"));

    async function docToArray(request) {
      try {
        //logger.debug('[Request] finished: ' + request.method() +request.url().slice(0,100));
        let req = await saveRequest(request, pageId);
        const response = await request.response();
        let res;
        if (response) {
          res = await saveResponse(response, req, responseCache);
          if (res && responseArray != null) responseArray.push(res);
          req["interceptionId"] = res["interceptionId"];
        }
        if (req && requestArray != null) requestArray.push(req);
        if (requestArray != null && requestArray != null) {
          console.log(
            req["interceptionId"],
            res["interceptionId"],
            requestArray.length,
            responseArray.length,
            request.method(),
            request.url().slice(0, 100),
          );
        }
      } catch (error) {
        //logger.error(error);
        console.log(error);
      }
    }
    page.on("requestfailed", async function (request) {
      console.log(
        "[Request] failed: ",
        request.url().slice(0, 100),
        request.failure(),
        //request.failure().errorText,
      );
      docToArray(request);
    });

    page.on("requestfinished", async function (request) {
      docToArray(request);
    });

    page.on("dialog", async (dialog) => {
      logger.debug("[Page] dialog: ", dialog.type(), dialog.message());
      await dialog.dismiss();
    });

    try {
      await page.goto(webpage.input, {
        timeout: webpage.option.timeout * 1000,
        referer: webpage.option.referer,
        waitUntil: "load",
      });
      await new Promise((done) =>
        setTimeout(done, webpage.option.delay * 1000),
      );

      // click cloudflare checkbox
      if (webpage.option.cf) {
        const selector = ".spacer > div > div";
        const info = await page.evaluate((selector) => {
          var el = document.querySelector(selector);
          var zoom = 1.0;
          for (var e = el; e != null; e = e.parentElement) {
            if (e.style.zoom) {
              zoom *= parseFloat(e.style.zoom);
            }
          }
          var rect = el.getBoundingClientRect();
          return {
            height: rect.height,
            width: rect.width,
            x: rect.left,
            y: rect.top,
            zoom: zoom,
          };
        }, selector);
        //console.log(info);
        const center_height = info.height / 2;
        //const center_width = info.width / 2;
        const click_x = (info.x + center_height) * info.zoom;
        const click_y = (info.y + center_height) * info.zoom;
        console.log(
          "move: %s(%s) => (%s,%s)",
          selector,
          JSON.stringify(info),
          click_x,
          click_y,
        );
        //await page.mouse.move(click_x, click_y, { steps: 1 });
        await page.mouse.click(click_x, click_y);

        await new Promise((done) =>
          setTimeout(done, webpage.option.delay * 1000),
        );
      }
    } catch (err) {
      //logger.info(err);
      console.log(err);
      webpage.error = err.message;
      //await page._client.send("Page.stopLoading");
    }

    logger.debug(
      `goto completed. ${requestArray.length}, ${responseArray.length}`,
    );

    try {
      webpage.url = page.url();
      if (responseArray.length > 0) {
        webpage.title = await page.title();
        webpage.content = await page.content();
      }
      let screenshot = await page.screenshot({
        fullPage: false,
        encoding: "base64",
      });
      async function imgResize(data) {
        const buffer = Buffer.from(data, "base64");
        const res = await Jimp.read(buffer);
        if (res.getWidth() > 240) {
          res.resize(240, Jimp.AUTO);
        }
        return res.getBufferAsync(Jimp.AUTO);
      }
      const resizedImg = await imgResize(screenshot);
      webpage.thumbnail = resizedImg.toString("base64");
      screenshot = null;

      let fullscreenshot = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });

      let fss = await saveFullscreenshot(fullscreenshot);
      if (fss) webpage.screenshot = fss;
      fullscreenshot = null;
    } catch (error) {
      //logger.info(error);
      console.log(error);
      if (!webpage.error) webpage.error = error.message;
      await new Promise((done) =>
        setTimeout(done, webpage.option.delay * 1000),
      );
    }

    logger.debug(
      `[finished] ${requestArray.length}, ${responseArray.length}, ${webpage.url}`,
    );
    await webpage.save();
    /*
    await new Promise((done) =>
      setTimeout(done, webpage.option.delay * 1000 * 4),
    );
    */
    const requests = await Request.insertMany(requestArray, { ordered: false })
      .then((doc) => {
        return doc;
      })
      .catch((err) => {
        console.log("[Request]", err);
        return;
      });

    let responses = [];
    /*
    for (let res of responseArray) {
      const newRes = new Response(res);
      await newRes.save();
      responses.push(newRes);
    }
    */
    responses = await Response.insertMany(responseArray, {
      ordered: false,
      //rawResult: true,
    })
      .then((doc) => {
        return doc;
      })
      .catch((err) => {
        console.log("[Response]", err);
        return;
      });

    let finalResponse;
    try {
      if (requests && responses) {
        for (let res of responses) {
          for (let req of requests) {
            //console.log(req.interceptionId, res.interceptionId);
            if (res.interceptionId === req.interceptionId) {
              res.request = req;
              req.response = res;
              break;
            }
          }
        }
      }
      if (requests) {
        await Request.bulkSave(requests, { ordered: false });
        webpage.requests = requests;
      }
      if (responses) {
        await Response.bulkSave(responses, { ordered: false });
        webpage.responses = responses;

        if (webpage.url) {
          for (let res of responses) {
            if (res.url) {
              if (res.url === webpage.url) {
                finalResponse = res;
              }
            }
          }
        }

        if (!finalResponse) {
          if (responses.length === 1) {
            finalResponse = responses[0];
            webpage.url = finalResponse.url;
          }
        }
      }
      if (finalResponse) {
        if (webpage.error && finalResponse.status) {
          webpage.error = undefined;
        }
        webpage.status = finalResponse.status;
        webpage.headers = finalResponse.headers;
        webpage.remoteAddress = finalResponse.remoteAddress;
        webpage.securityDetails = finalResponse.securityDetails;
        //console.log(webpage.status, webpage.error);
        if (webpage.remoteAddress) {
          if (webpage.remoteAddress.ip) {
            let hostinfo = await ipInfo.getHostInfo(webpage.remoteAddress.ip);
            if (hostinfo) {
              if (hostinfo.reverse)
                webpage.remoteAddress.reverse = hostinfo.reverse;
              if (hostinfo.bgp) webpage.remoteAddress.bgp = hostinfo.bgp;
              if (hostinfo.geoip) webpage.remoteAddress.geoip = hostinfo.geoip;
              if (hostinfo.ip) webpage.remoteAddress.ip = hostinfo.ip;
            }
          }
        }
      }
      const cookies = await page.cookies();
      let headers = finalResponse.headers;
      for (let head in headers) {
        headers[head] = headers[head].split(";");
      }
      //console.log(cookies, headers);
      const wapalyzed = await wapalyze(
        webpage.url,
        headers,
        webpage.content,
        cookies,
      );
      let wapps = [];
      for (let wap of wapalyzed) {
        wapps.push(wap.name);
      }
      console.log(wapps);
      if (wapps) webpage.wappalyzer = wapps;
      await webpage.save();

      //ss = null;
      ipInfo.setResponseIp(responses);

      /*
      await client.send("Network.disable");
      client.removeAllListeners();
      client = null;
      */

      page.removeAllListeners();
      //page = null;

      //responses = null;
      finalResponse = null;
      responseCache = null;
      webpage = null;

      //console.log(requestArray.length, responseArray.length);
      requestArray = null;
      responseArray = null;

      await browser.close();
      await closeDB();
    } catch (err) {
      console.log(err);
    }
    return pageId;
  },
};
