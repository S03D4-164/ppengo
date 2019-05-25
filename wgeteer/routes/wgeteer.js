const puppeteer = require('puppeteer');

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');
const Screenshot = require('./models/screenshot');
const Payload = require('./models/payload');

const imageThumbnail = require('image-thumbnail');
const crypto = require("crypto");
const fileType = require('file-type');

const ipInfo = require('./ipInfo')
//const wapptr = require('./wapptr')

module.exports = {

  async wget (pageId, option){
      const webpage = await Webpage.findById(pageId)
      .then(doc => { return doc; })
      .catch(err =>{ console.log(err);});
      console.log(webpage);
      const url = webpage.input;
      var option = webpage.option;
      var userAgent = ("userAgent" in option) ? option['userAgent'] : undefined;
      var referer = option['referer'];
      var timeout = option['timeout'];
      timeout = (timeout >= 30 && timeout <= 300) ? timeout * 1000 : 30000; 
      var delay = option['delay'];
      delay = (delay > 0 && delay <= 60) ? delay * 1000 : 0;
      
      var jsEnabled = ("disableScript" in option) ? false:true;
      
      var exHeaders = {};
      var lang = option['lang'];
      if (lang) exHeaders["Accept-Language"] = lang;
      if (option['exHeaders']){
        const headers = option['exHeaders'];
        for (let line of headers.split('\r\n')){
          var match  = line.match(/^([^:]+):(.+)$/);
          if(match.length>=2){
            exheaders[match[1].trim()] = match[2].trim();
          }
        }
      }

      var chromiumArgs= [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        //'--enable-logging=stderr','--v=1',
      ];

      var proxy = option['proxy'];
      if (proxy){
        if (proxy.match(/^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,5}$/)){
          chromiumArgs.push('--proxy-server='+proxy);
        }
      }
      console.log(chromiumArgs);

      const browserFetcher = puppeteer.createBrowserFetcher();
      const localChromiums = await browserFetcher.localRevisions();
      //console.log(localChromiums);
      if(!localChromiums.length) {
        return console.error('Can\'t find installed Chromium');
      }
      const myBrowser = localChromiums[0];
      const {executablePath} = await browserFetcher.revisionInfo(myBrowser);

      const browser = await puppeteer.launch({
          executablePath:executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
          //userDataDir: 'data',
          defaultViewport: {width: 1280, height: 720,},
          dumpio:true,
          args: chromiumArgs,
      });
      const browserVersion = await browser.version();
      console.log(browserVersion);
      browser.on('disconnected', () => console.log('[Browser] disconnected.'));
      /*
      browser.on('targetchanged', async tgt => console.log('[Browser] taget changed: ', tgt));
      browser.on('targetcreated', async tgt => console.log('[Browser] taget created: ', tgt));
      browser.on('targetdestroyed', async tgt => console.log('[Browser taget destroyed: ', tgt));
      
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      */
      const page = await browser.newPage();
      if (userAgent) await page.setUserAgent(userAgent);
      if (exHeaders) await page.setExtraHTTPHeaders(exHeaders);
      await page.setJavaScriptEnabled(jsEnabled);
      const client = await page.target().createCDPSession();

      await client.send('Network.enable');
      const urlPatterns = ['*']
      await client.send('Network.setRequestInterception', { 
        patterns: urlPatterns.map(pattern => ({
          urlPattern: pattern,
          interceptionStage: 'HeadersReceived'
        }))
      });

      var responseCache = [];
      /*
      client.on('Network.requestWillBeSent',
        async ({requestId, request}) => {
          console.log("[requestWillBeSent]", requestId, request);
      });
      */

      client.on('Network.dataReceived',
      async ({requestId, dataLength}) => {
        console.log("[dataReceived]", requestId, dataLength);
      });

      client.on('Network.loadingFinished',
      async ({requestId, encodedDataLength}) => {
        const response = await client.send('Network.getResponseBody', { requestId });
        if(response.body) console.log("[loadingFinished]", requestId, encodedDataLength, response.body.length, response.base64Encoded);
        else console.log("[loadingFinished] no body", requestId, encodedDataLength, response.body, response.base64Encoded);
      });

      /*
      client.on('Network.responseReceived',
        async ({requestId, response}) => {
          console.log("[responseReceived]", requestId);
        });
        */

      client.on('Network.requestIntercepted',
        async ({ interceptionId, request, isDownload, responseStatusCode, responseHeaders,requestId}) => {
        console.log(`[Intercepted] ${requestId} ${request.url} ${responseStatusCode} ${isDownload}`);
        try{  
          const response = await client.send('Network.getResponseBodyForInterception', {interceptionId});
          console.log("[Intercepted]", requestId, response.body.length, response.base64Encoded);    
          const newBody = response.base64Encoded ? Buffer.from(response.body, "base64") : response.body;
          var cache = {};
          cache[request.url] = newBody;
          responseCache.push(cache);
        }catch(err){
          if (err.message) console.log("[Intercepted] error", err.message);
          else console.log("[Intercepted] error", err);
        }
        //console.log(`Continuing interception ${interceptionId}`)
        client.send('Network.continueInterceptedRequest', {
          interceptionId,
        })
      });

      page.on('dialog', async dialog => {
        console.log('[Page] dialog: ', dialog.type(), dialog.message());
        await dialog.dismiss();
      });
      page.on('console', async msg => {
        console.log('[Page] console: ', msg.type(), msg.text())
      });
      page.on('error', async err => {
        console.log('[Page] error: ', err);
      });
      page.on('pageerror', async perr => {
        console.log('[Page] page error: ', perr);
      });

      page.on('load', () => console.log('[Page] loaded'));
      page.on('domcontentloaded', () => console.log('[Page] DOM content loaded'));
      page.on('closed', () => console.log('[Page] closed'));
  
      page.on('workercreated', wrkr => console.log('[Worker] created: ', wrkr));
      page.on('workerdestroyed', wrkr => console.log('[Worker] destroyed: ', wrkr));
  
      page.on('frameattached', frm => console.log('[Frame] attached: ', frm));
      page.on('framedetached', frm => console.log('[Frame] detached: ', frm));
      page.on('framenavigateed', frm => console.log('[Frame] navigated: ', frm));

      var ipCache = {};
      var responses = [];
      async function saveResponse(interceptedResponse, request){
        var responseBuffer, payloadId, text;  
        try{
            for(let seq in responseCache){
              if(interceptedResponse.url() in responseCache[seq]){
                var cache = responseCache[seq];
                responseBuffer = cache[interceptedResponse.url()];
                text = cache[interceptedResponse.url()].toString('utf-8');
                responseCache.splice(seq, 1);
                break;
              }
            }
            responseBuffer = await interceptedResponse.buffer();
        }catch(err){
          console.log("[Response] failed on save buffer");
        }

        if (responseBuffer){
          if(responseBuffer.length > 0){
            var md5Hash = crypto.createHash('md5').update(responseBuffer).digest('hex');
            var ftype = fileType(responseBuffer);
            const payload = await Payload.findOneAndUpdate(
              {"md5": md5Hash},
              {
                "payload": responseBuffer,
                "fileType":ftype,
              },
              {"new":true,"upsert":true},
            );
            payloadId = payload._id;
          }
        }

        try{
          text = await interceptedResponse.text();
        }catch(error){
          console.log("[Response] failed on save text");
        }    
          
        var securityDetails = {};
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
          console.log(error);
        }

        try{
          const response = new Response({
            webpage: webpage._id,
            url:interceptedResponse.url(),
            status:interceptedResponse.status(),
            statusText: interceptedResponse.statusText(),
            ok: interceptedResponse.ok(),
            remoteAddress: interceptedResponse.remoteAddress(),
            headers: interceptedResponse.headers(),
            securityDetails: securityDetails,
            payload:payloadId,
            text:text,
            request: request._id,
          });

          if (response.remoteAddress){
            const host = response.remoteAddress.ip;
            var hostinfo;
            if (host in ipCache){
              hostinfo = ipCache[host]
              console.log("[ipInfo] cache exists.");
            }else{
              hostinfo = await ipInfo(host);
              ipCache[host] = hostinfo;
              //console.log(hostinfo);
            }
            if(hostinfo){
              if (hostinfo.reverse) response.remoteAddress.reverse = hostinfo.reverse;
              if (hostinfo.bgp) response.remoteAddress.bgp = hostinfo.bgp;
              if (hostinfo.geoip) response.remoteAddress.geoip = hostinfo.geoip;
              if (hostinfo.ip) response.remoteAddress.ip = hostinfo.ip;
            }
          }
          
          await response.save(function (err){
            if(err) console.log(err);
            //else console.log("response saved: " + response.url.slice(0,100));
          });
          responses.push(response);
          return response;

        }catch(error){
          console.log(error);
        }  
        return;
      }

      var requests = [];
      async function saveRequest(interceptedRequest, result){
        var redirectChain = [];
        try{
          const chain = interceptedRequest.redirectChain();
          if(chain){
            for(let seq in chain){
              console.log("[Chain]", interceptedRequest.url(),  chain[seq].url());
              redirectChain.push(chain[seq].url());
            }  
          }
        }catch(error){
          console.log(error);
        }
        
        const request = new Request({
          webpage: webpage._id,
          url:interceptedRequest.url(),
          method:interceptedRequest.method(),
          resourceType: interceptedRequest.resourceType(),
          isNavigationRequest:interceptedRequest.isNavigationRequest(),
          postData: interceptedRequest.postData(), 
          headers: interceptedRequest.headers(),
          failure: interceptedRequest.failure(),
          redirectChain:redirectChain,
        });

        const response = interceptedRequest.response();
        if (response) {
          const res = await saveResponse(response, request);
          if(res) request.response = res.id;
        }
        await request.save(function (err){
          if(err) console.log(err); 
          //else console.log("request saved: " + request.url.slice(0,100));
        });
        requests.push(request);
        return request;
      }

      page.on('requestfailed', request => {
        console.log('[Request] failed: ', request.url().slice(0,100), request.failure());
        try{
          saveRequest(request, 'failed');
        }catch(error){
          console.log(error);
        }
      });
      
      page.on('requestfinished', request => {
        console.log('[Request] finished: ', request.method(), request.url().slice(0,100));
        try{
          saveRequest(request, 'finished');
        }catch(error){
          console.log(error);
        }
      });
      
      page.on('request', async interceptedRequest => {
        try{
          console.log(
            '[Request] ', 
            interceptedRequest.method(),
            interceptedRequest.resourceType(),
            interceptedRequest.url().slice(0,100),
          );
        }catch(error){
          console.log(error);
        }
      });
    
      page.on('response', async interceptedResponse => {
      try{
        console.log(
          '[Response] ', 
          interceptedResponse.status(),
          interceptedResponse.remoteAddress(),
          interceptedResponse.url().slice(0,100),
        );
      }catch(error){
        console.log(error);
      }
    });

    try{
        await page.goto(url,{
          timeout:timeout,
          referer:referer,
          waitUntil: 'networkidle2',
        });
        await page.waitFor(delay);      
      }catch(err){
        console.log(err);
    }

    try{

      const pageTitle = await page.title()
      webpage.title = pageTitle;

      const pageContent = await page.content();
      webpage.content = pageContent;

      const screenshot = await page.screenshot({
        fullPage: false,
        encoding: 'base64',
      });
      const thumbnail = await imageThumbnail(
        screenshot,
        {percentage: 20, responseType: 'base64'}
      );
      webpage.thumbnail = thumbnail;

      const fullscreenshot = await page.screenshot({
        fullPage: true,
        encoding: 'base64',
      });
      async function saveScreenshot(fullscreenshot){
        let buff = new Buffer.from(fullscreenshot, 'base64');
        var md5Hash = crypto.createHash('md5').update(buff).digest('hex');
        const ss = await Screenshot.findOneAndUpdate(
          {"md5": md5Hash},
          {"screenshot": fullscreenshot},
          {"new":true,"upsert":true},
        );
        return ss;
      }
      const ss = await saveScreenshot(fullscreenshot);
      webpage.screenshot = ss._id;

      webpage.url = page.url();
      var finalResponse;
      if(webpage.url){
        for(let num in responses){
          if (responses[num].url){
            if (responses[num].url === webpage.url){
              finalResponse = responses[num];
           }
          }
        }
      }

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
        console.log(error);
        webpage.error = error.message;
        await new Promise(done => setTimeout(done, delay)); 
        if (!finalResponse){
          if(responses.length===1){
            finalResponse=responses[0];
            webpage.url = finalResponse.url;
          }
        }
    }finally{
      webpage.requests = requests;
      webpage.responses = responses;
      if(finalResponse){
        webpage.status = finalResponse.status;
        webpage.headers = finalResponse.headers;
        webpage.remoteAddress = finalResponse.remoteAddress;
        webpage.securityDetails = finalResponse.securityDetails;
      };

      await webpage.save(function (err, success){
          if(err) console.log(err)
          else console.log("webpage saved: " + webpage.input);
      });
      await browser.close();
      return webpage;
    }
  },
};
