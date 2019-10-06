const puppeteer = require('puppeteer');
const imageThumbnail = require('image-thumbnail');
const crypto = require("crypto");
//const fileType = require('file-type');

const ipInfo = require('./ipInfo')
const logger = require('./logger')

const mongoose = require('mongoose');
/*
mongoose.connection.on('connecting', ()=>{console.log("[mongoose] connecting.")});
mongoose.connection.on('connected', ()=>{console.log("[mongoose] connected.")});
mongoose.connection.on('disconnecting', ()=>{console.log("[mongoose] disconnecting.")});
mongoose.connection.on('disconnected', ()=>{console.log("[mongoose] disconnected.")});
mongoose.connection.on('reconnected', ()=>{console.log("[mongoose] reconnected.")});
mongoose.connection.on('reconnectFailed', ()=>{console.log("[mongoose] reconnect failed.")});
mongoose.connection.on('error', (err)=>{console.log("[mongoose] error", err)});
*/

require('./models/webpage');
require('./models/request');
require('./models/response');
require('./models/screenshot');
require('./models/payload');

var db = mongoose.createConnection('mongodb://127.0.0.1:27017/wgeteer', {
  useNewUrlParser: true,
  useCreateIndex: true,
  autoReconnect:true,
  reconnectInterval: 5000,
  reconnectTries: 60,
  useFindAndModify: false,
});

const Webpage = db.model('Webpage');
const Request = db.model('Request');
const Response = db.model('Response');
const Screenshot = db.model('Screenshot');
const Payload = db.model('Payload');

async function closeDB(){
  const modelNames = Object.keys(db.models)
  modelNames.forEach(modelName => {
    delete db.models[modelName]
    logger.debug("deleted model " + modelName);
  })
  
  const collectionNames = Object.keys(db.collections)
  collectionNames.forEach(collectionName => {
    delete db.collections[collectionName]
    logger.debug("deleted collection " + collectionName);
  })
  
  const modelSchemaNames = Object.keys(db.base.modelSchemas)
  modelSchemaNames.forEach(modelSchemaName => {
    delete db.base.modelSchemas[modelSchemaName]
    logger.debug("deleted schema " + modelSchemaName);
  })

}

async function pptrEventSet(client, browser, page){

      client.on('Network.requestWillBeSent',
      async ({requestId, request}) => {
        logger.debug("[requestWillBeSent]", requestId);
        const req =await new Request({
          "devtoolsReqId": requestId,
          "webpage": pageId,
        });
        await req.save();
      });

      client.on('Network.responseReceived',
      async ({requestId, response}) => {
        logger.debug("[responseReceived]", requestId);
        const res =await new Response({
          "devtoolsReqId": requestId,
          "webpage": pageId,
        });
        await res.save();
      });

      client.on('Network.loadingFinished',
      async ({requestId, encodedDataLength}) => {
        const response = await client.send('Network.getResponseBody', { requestId });
        if(response.body) {
          logger.debug("[loadingFinished]", requestId, encodedDataLength, response.body.length, response.base64Encoded);
        } else {
          logger.debug("[loadingFinished] no body", requestId, encodedDataLength, response.body, response.base64Encoded);
        }
      });

      client.on('Network.loadingFailed',
      async ({requestId, encodedDataLength}) => {
        const response = await client.send('Network.getResponseBody', { requestId });
        if(response.body) {
          logger.debug("[loadingFinished]", requestId, encodedDataLength, response.body.length, response.base64Encoded);
        } else {
          logger.debug("[loadingFinished] no body", requestId, encodedDataLength, response.body, response.base64Encoded);
        }
      });

      client.on('Network.dataReceived',
      async ({requestId, dataLength}) => {
        logger.debug("[dataReceived]", requestId, dataLength);
      });

      browser.on('targetchanged', async tgt => logger.debug('[Browser] taget changed: ', tgt));
      browser.on('targetcreated', async tgt => logger.debug('[Browser] taget created: ', tgt));
      browser.on('targetdestroyed', async tgt => logger.debug('[Browser taget destroyed: ', tgt));

      page.on('dialog', async dialog => {
        logger.debug('[Page] dialog: ', dialog.type(), dialog.message());
        await dialog.dismiss();
      });
      page.on('console', async msg => {
        logger.debug('[Page] console: ', msg.type(), msg.text())
      });
      page.on('error', async err => {
        logger.debug('[Page] error: ', err);
      });
      page.on('pageerror', async perr => {
        logger.debug('[Page] page error: ', perr);
      });

      page.on('workercreated', wrkr => logger.debug('[Worker] created: ', wrkr));
      page.on('workerdestroyed', wrkr => logger.debug('[Worker] destroyed: ', wrkr));
  
      page.on('frameattached', frm => logger.debug('[Frame] attached: ', frm));
      page.on('framedetached', frm => logger.debug('[Frame] detached: ', frm));
      page.on('framenavigateed', frm => logger.debug('[Frame] navigated: ', frm));

      page.on('request', async interceptedRequest => {
        try{
          logger.debug(
            '[Request] ', 
            interceptedRequest._requestId,
            interceptedRequest.method(),
            interceptedRequest.resourceType(),
            interceptedRequest.url().slice(0,100),
          );
        }catch(error){
          logger.debug(error);
        }
      });
    
      page.on('response', async interceptedResponse => {
      try{
        logger.debug(
          '[Response] ', 
          interceptedResponse.status(),
          interceptedResponse.remoteAddress(),
          interceptedResponse.url().slice(0,100),
        );
      }catch(error){
        logger.debug(error);
      }
    });

}

var responseCache = [];

async function savePayload(responseBuffer){
  let md5Hash = crypto.createHash('md5').update(responseBuffer).digest('hex');
  //var ftype = fileType(responseBuffer);
  //console.log("[Response] fileType", ftype)
  //ftype = ftype?ftype.mime:undefined;
  let payload = await Payload.findOneAndUpdate(
    {"md5": md5Hash},
    {
      "payload": responseBuffer,
      //"fileType":ftype,
    },
    {"new":true,"upsert":true},
  );
  //logger.debug("payload saved: ", payload.md5, responseBuffer.length);
  return payload._id;
}

async function saveResponse(interceptedResponse, request, pageId){

  let responseBuffer;
  let text;
  let payloadId;

  try{
      for(let seq in responseCache){
        if(interceptedResponse.url() in responseCache[seq]){
          let cache = responseCache[seq];
          responseBuffer = cache[interceptedResponse.url()];
          text = cache[interceptedResponse.url()].toString('utf-8');
          responseCache.splice(seq, 1);
          cache = nulll;
          break;
        }
      }
      //if(responseBuffer)console.log("[Response] cache exists")
      //else console.log("[Response] no cache")
      responseBuffer = await interceptedResponse.buffer();
  }catch(err){
    //console.log("[Response] failed on save buffer");
    logger.debug("[Response] failed on save buffer");

  }

  if (responseBuffer) payloadId = await savePayload(responseBuffer);

  try{
    text = await interceptedResponse.text();
  }catch(error){
    //console.log("[Response] failed on save text");
    logger.debug("[Response] failed on save text");
  }    
    
  let securityDetails = {};
  try{
    if (interceptedResponse.securityDetails()){
      securityDetails = {
        issuer: interceptedResponse.securityDetails().issuer(),
        protocol: interceptedResponse.securityDetails().protocol(),
        subjectName: interceptedResponse.securityDetails().subjectName(),
        validFrom: interceptedResponse.securityDetails().validFrom(),
        validTo: interceptedResponse.securityDetails().validTo(),
      }
    }
  }catch(error){
    logger.debug(error);
  }

  try{
    let url = interceptedResponse.url();
    let urlHash = crypto.createHash('md5').update(url).digest('hex');
    const response = new Response({
      webpage: pageId,
      url: url,
      urlHash: urlHash,
      status:interceptedResponse.status(),
      statusText: interceptedResponse.statusText(),
      ok: interceptedResponse.ok(),
      remoteAddress: interceptedResponse.remoteAddress(),
      headers: interceptedResponse.headers(),
      securityDetails: securityDetails,
      payload: payloadId,
      text: text,
      request: request._id,
    });
    await response.save(function (err){
      if(err) logger.info(err);
      //else console.log("response saved: " + response.url.slice(0,100));
    });
    url = null;
    urlHash = null;
    securityDetails = null;
    payloadId = null;
    text = null;
    await Webpage.findOneAndUpdate(
      {"_id": pageId},
      {$push: {"responses": response._id}},
    );
    return response;
  }catch(error){
    logger.info(error);
  }  
  return;
} 

async function saveRequest(interceptedRequest, pageId){
  let redirectChain = [];
  try{
    const chain = interceptedRequest.redirectChain();
    if(chain){
      for(let seq in chain){
        //console.log("[Chain]", interceptedRequest.url(),  chain[seq].url());
        redirectChain.push(chain[seq].url());
      }  
    }
  }catch(error){
    logger.info(error);
  }
  
  const request = new Request({
    webpage: pageId,
    url:interceptedRequest.url(),
    method:interceptedRequest.method(),
    resourceType: interceptedRequest.resourceType(),
    isNavigationRequest:interceptedRequest.isNavigationRequest(),
    postData: interceptedRequest.postData(), 
    headers: interceptedRequest.headers(),
    failure: interceptedRequest.failure(),
    redirectChain:redirectChain,
  });

  let response = interceptedRequest.response();
  let res = null;
  if (response) {
    //const res = await saveResponse(response, request);
    res = await saveResponse(response, request, pageId);
    if(res) request.response = res;
  }
  await request.save(function (err){
    if(err) logger.info(err); 
    //else console.log("request saved: " + request.url.slice(0,100));
  });

  await Webpage.findOneAndUpdate(
    {"_id": pageId},
    {$push: {"requests": request._id}},
  );

  response = null;
  res = null;
  redirectChain = null;

  return request;
}

module.exports = {

  async wget (pageId){
      let webpage = await Webpage.findById(pageId)
      .then(doc => { 
        return doc;
      })
      .catch(err =>{ logger.info(err);});

      //var timeout = option['timeout'];
      //timeout = (timeout >= 30 && timeout <= 300) ? timeout * 1000 : 30000; 
      //var delay = option['delay'];
      //delay = (delay > 0 && delay <= 60) ? delay * 1000 : 0;
      
      let exHeaders = {};
      if (webpage.option.lang) exHeaders["Accept-Language"] = webpage.option.lang;

      if (webpage.option.exHeaders){
        for (let line of webpage.option.exHeaders.split('\r\n')){
          let match  = line.match(/^([^:]+):(.+)$/);
          if(match.length>=2){
            exheaders[match[1].trim()] = match[2].trim();
          }
          match = null;
        }
      }

      const chromiumArgs= [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        //'--enable-logging=stderr','--v=1',
      ];

      if (webpage.option.proxy){
        if (webpage.option.proxy.match(/^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,5}$/)){
          chromiumArgs.push(`--proxy-server=${webpage.option.proxy}`);
        }
      }
      logger.debug(chromiumArgs);

      let browserFetcher = puppeteer.createBrowserFetcher();
      const localChromiums = await puppeteer.createBrowserFetcher().localRevisions();
      if(!localChromiums.length) {
        return console.error('Can\'t find installed Chromium');
      }
      let {executablePath} = await browserFetcher.revisionInfo(localChromiums[0]);
      let browser;
      try{
        browser = await puppeteer.launch({
          executablePath:executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
          defaultViewport: {width: 1280, height: 720,},
          dumpio:true,
          args: chromiumArgs,
        });
      }catch(error){
        logger.info(error);
        webpage.error = error.message;
        return webpage;
      }

      browser.once('disconnected', () => logger.debug('[Browser] disconnected.'));

      const browserVersion = await browser.version();
      logger.debug(browserVersion);

      let page = await browser.newPage();
      if (webpage.option.userAgent) await page.setUserAgent(webpage.option.userAgent);
      if (exHeaders) await page.setExtraHTTPHeaders(exHeaders);
      if(webpage.option.disableScript) await page.setJavaScriptEnabled(false);
      else await page.setJavaScriptEnabled(true);

      let client = await page.target().createCDPSession();

      await client.send('Network.enable');
      //const urlPatterns = ['*']
      await client.send('Network.setRequestInterception', { 
        //patterns: urlPatterns.map(pattern => ({
        patterns: ['*'].map(pattern => ({
          urlPattern: pattern,
          interceptionStage: 'HeadersReceived'
        }))
      });

      client.on('Network.requestIntercepted',
        async ({ interceptionId, request, isDownload, responseStatusCode, responseHeaders, requestId}) => {
        //console.log(`[Intercepted] ${requestId} ${request.url} ${responseStatusCode} ${isDownload}`);
        try{  
          let response = await client.send('Network.getResponseBodyForInterception', {interceptionId});
          //console.log("[Intercepted]", requestId, response.body.length, response.base64Encoded);    
          let newBody = response.base64Encoded ? Buffer.from(response.body, "base64") : response.body;
          let cache = {};
          cache[request.url] = newBody;
          responseCache.push(cache);
          cache = null;
          newBody = null;
          response = null;
        }catch(err){
          if (err.message) logger.debug("[Intercepted] error", err.message);
          //else console.log("[Intercepted] error", err);
        }
        //console.log(`Continuing interception ${interceptionId}`)
        client.send('Network.continueInterceptedRequest', {
          interceptionId,
        })
      });

      page.once('load', () => console.log('[Page] loaded'));
      page.once('domcontentloaded', () => console.log('[Page] DOM content loaded'));
      page.once('closed', () => console.log('[Page] closed'));

      page.on('requestfailed', request => {
        logger.info('[Request] failed: ' + request._requestId)//, request.url().slice(0,100), request.failure());
        try{
          saveRequest(request, pageId);
        }catch(error){
          console.log(error);
        }
      });
      
      page.on('requestfinished', request => {
        logger.debug('[Request] finished: ' + request._requestId)//,  request.method(), request.url().slice(0,100));
        try{
          saveRequest(request, pageId);
        }catch(error){
          console.log(error);
        }
      });


    let finalResponse;
    try{
        await page.goto(
          webpage.input,
          {
          timeout: webpage.option.timeout * 1000,
          referer: webpage.option.referer,
          waitUntil: 'networkidle2',
        });
        await page.waitFor(webpage.option.delay * 1000);
      }catch(err){
        logger.info(err);
        webpage.error = err.message;
        await page._client.send("Page.stopLoading");
    }

    try{
      webpage.title = await page.title()
      webpage.content = await page.content();

      let screenshot = await page.screenshot({
        fullPage: false,
        encoding: 'base64',
      });
      webpage.thumbnail = await imageThumbnail(
        screenshot,
        {percentage: 20, responseType: 'base64'}
      );
      screenshot = null;

      let fullscreenshot = await page.screenshot({
        fullPage: true,
        encoding: 'base64',
      });

      let buff = new Buffer.from(fullscreenshot, 'base64');
      let md5Hash = crypto.createHash('md5').update(buff).digest('hex');
      let ss = await Screenshot.findOneAndUpdate(
          {"md5": md5Hash},
          {"screenshot": fullscreenshot},
          {"new":true,"upsert":true},
      );
      webpage.screenshot = ss._id;
      buff = null;
      md5Hash = null;
      fullscreenshot = null;

      webpage.url = page.url();
    
      /*
      try{
        const cookies = await page.cookies();
        //console.log(cookies, finalResponse.headers);
        if (finalResponse){
          const wapps = await wapptr(
            webpage.url,
            finalResponse.headers,
            webpage.content,
            cookies,
          );
          //console.log(wapps);
          if (wapps) webpage.wappalyzer = wapps;
        }  
      }catch(err){
        console.log(err);
      }
      */
    }catch(error){
        logger.info(error);
        webpage.error = error.message;
        await new Promise(done => setTimeout(done, webpage.option.delay * 1000)); 
    }finally{
      const responses = await Response.find({"webpage":pageId})
      .then((doc)=>{return doc});
      logger.debug(responses.length);

      if(webpage.url){
        for(let num in responses){
          if (responses[num].url){
            if (responses[num].url === webpage.url){
              finalResponse = responses[num];
           }
          }
        }
      }

      if (!finalResponse){
        if(responses.length===1){
          finalResponse=responses[0];
          webpage.url = finalResponse.url;
        }
      }

      if(finalResponse){
        webpage.status = finalResponse.status;
        webpage.headers = finalResponse.headers;
        webpage.remoteAddress = finalResponse.remoteAddress;
        webpage.securityDetails = finalResponse.securityDetails;
        if (webpage.remoteAddress){
          if (webpage.remoteAddress.ip){
            let hostinfo = await ipInfo.getHostInfo(webpage.remoteAddress.ip);
            if(hostinfo){
              //console.log(hostinfo);
              if (hostinfo.reverse) webpage.remoteAddress.reverse = hostinfo.reverse;
              if (hostinfo.bgp) webpage.remoteAddress.bgp = hostinfo.bgp;
              if (hostinfo.geoip) webpage.remoteAddress.geoip = hostinfo.geoip;
              if (hostinfo.ip) webpage.remoteAddress.ip = hostinfo.ip;
            }
          }
        }
      }

      await webpage.save(function (err, success){
        if(err) logger.info(err)
        else logger.debug("webpage saved");
        //else console.log("webpage saved: " + webpage.input);
      });
      ss = null;
      ipInfo.setResponseIp(responses);

      client.removeAllListeners();
      client = null;

      page.removeAllListeners();
      page = null;

      //responses = null;
      finalResponse = null;
      responseCache = null;
      webpage = null;

      await browser.close();
      await closeDB();

      return;
    }
  },
};
