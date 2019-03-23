const puppeteer = require('puppeteer');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');
const Screenshot = require('./models/screenshot');
const Payload = require('./models/payload');

const imageThumbnail = require('image-thumbnail');

const crypto = require("crypto");
const atob = require('atob');
//const btoa = require('btoa');

const ipInfo = require('./ipInfo')

module.exports = {

  async wget (pageId, option){

      //console.log(pageId);
      const webpage = await Webpage.findById(pageId)
      .then(doc => {
        return doc;
      })
      .catch(err =>{
        console.log(err);
      });
      console.log(webpage);
      const url = webpage.input;
      var option = webpage.option;

      //console.log(option);
      var userAgent = option['userAgent'];
      var referer = option['referer'];
      var timeout = option['timeout'];
      timeout = (timeout >= 30 && timeout <= 300) ? timeout * 1000 : 30000; 
      var delay = option['delay'];
      delay = (delay > 0 && delay <= 60) ? delay * 1000 : 0;
      /*
      var jsEnabled = true;
      if (!option['jsEnabled']){
        var jsEnabled = false;
      }
      */
      var exHeaders = {};
      if (option['exHeaders']){
        const headers = option['exHeaders'];
        for (let line of headers.split('\r\n')){
          var match  = line.match(/^([^:]+):(.+)$/);
          if(match.length===2){
            exheaders[match[1].trim()] = match[2].trim();
          }
        }
      }
      var lang = option['lang'];
      if (lang) exHeaders["Accept-Language"] = lang;

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
      await page.setJavaScriptEnabled(true);
      const client = await page.target().createCDPSession();

      await client.send('Network.enable');
      //const requestCache = new Map();
      const urlPatterns = [
        '*',
      ]
      await client.send('Network.setRequestInterception', { 
        patterns: urlPatterns.map(pattern => ({
          urlPattern: pattern,
          //resourceType: 'Document',
          interceptionStage: 'HeadersReceived'
        }))
      });

      var responseCache = [];
      client.on('Network.requestIntercepted',
        async ({ interceptionId, request, responseHeaders, resourceType }) => {
        console.log(`[Intercepted] ${request.url} {interception id: ${interceptionId}}`);
        console.log(responseHeaders);
        try{
          const response = await client.send('Network.getResponseBodyForInterception', {interceptionId});
          console.log(response.body.length, response.base64Encoded);    
          //const contentTypeHeader = Object.keys(responseHeaders).find(k => k.toLowerCase() === 'content-type');
          //let newBody, contentType = responseHeaders[contentTypeHeader];
          const newBody = response.base64Encoded ? atob(response.body) : response.body;
          var cache = {};
          cache[request.url] = newBody;
          responseCache.push(cache);
        }catch(error){
          console.log("[Intercepted] ", error);
        }
        /*
        const newHeaders = [];
        for (var header in responseHeaders){
          newHeaders.push(header+": "+responseHeaders[header])
        }
        */
        console.log(`Continuing interception ${interceptionId}`)
        client.send('Network.continueInterceptedRequest', {
          interceptionId,
          //rawResponse: btoa('HTTP/1.1 200 OK' + '\r\n' + newHeaders.join('\r\n') + '\r\n\r\n' + newBody)
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

      ipCache = {}
      async function saveResponse(interceptedResponse, request){
        var responseBuffer, payloadId, text;  
        try{
          //if (interceptedResponse.status() < 300
            //|| interceptedResponse.status() >= 400){
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
            //}
            var md5Hash = crypto.createHash('md5').update(responseBuffer).digest('hex');
            const payload = await Payload.findOneAndUpdate(
              {"md5": md5Hash},
              {"payload": responseBuffer},
              {"new":true,"upsert":true},
            );
            payloadId = payload._id;
            console.log(payload._id, payload.md5);

          }catch(error){
          console.log(error);
        }

        try{
          //if(!text)
          text = await interceptedResponse.text();
        }catch(error){
          console.log(error);
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
            var hostinfo = null
            if (host in ipCache){
              hostinfo = ipCache[host]
              console.log("[ipInfo] cache exists.");
            }else{
              hostinfo = await ipInfo(host);
              ipCache[host] = hostinfo;
              console.log(hostinfo);
            }
            if (hostinfo.reverse) response.remoteAddress.reverse = hostinfo.reverse;
            if (hostinfo.bgp) response.remoteAddress.bgp = hostinfo.bgp;
            if (hostinfo.geoip) response.remoteAddress.geoip = hostinfo.geoip;
          }
          
          await response.save(function (err){
            if(err) console.log(err);
            //else console.log(response);
          });

          return response;

        }catch(error){
          console.log(error);
        }  
        return;
      }

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

        //if (result==='finished'){
        const response = interceptedRequest.response();
        if (response) {
          const res = await saveResponse(response, request);
          if(res){
            request.response = res.id;
            //request.save();
          }
        }
        await request.save(function (err){
          if(err) console.log(err); 
          //else console.log(request);
        });
        
        return request;
      }

      page.on('requestfailed', request => {
        console.log('[Request] failed: ', request.url(), request.failure());
        try{
          saveRequest(request, 'failed');
        }catch(error){
          console.log(error);
        }
      });
      
      page.on('requestfinished', request => {
        console.log('[Request] finished: ', request.method(), request.url());
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
            //interceptedRequest,
            interceptedRequest.method(),
            interceptedRequest.resourceType(),
            interceptedRequest.url(),
          );
        }catch(error){
          console.log(error);
        }
      });
    
      page.on('response', async interceptedResponse => {
      try{
        console.log(
          '[Response] ', 
          //interceptedResponse,
          interceptedResponse.status(),
          interceptedResponse.remoteAddress(),
          interceptedResponse.url(),
          //interceptedResponse.securityDetails(),
          //interceptedResponse.headers(),
        );
      }catch(error){
        console.log(error);
      }
    });

    try{
      const finalResponse = await page.goto(url,{
        timeout:timeout,
        referer:referer,
        waitUntil: 'networkidle2',
      });
      await page.waitFor(delay);    
      
      webpage.url = page.url();
      const pageTitle = await page.title()
      webpage.title = pageTitle;

      const pageContent = await page.content();
      webpage.content = pageContent;

      if(finalResponse){

        webpage.status = finalResponse.status();
        webpage.headers = finalResponse.headers();
        webpage.remoteAddress = finalResponse.remoteAddress();
        if (webpage.remoteAddress){
          const host = webpage.remoteAddress.ip;
          const hostinfo = await ipInfo(host);
          if(hostinfo){
            webpage.remoteAddress.reverse = hostinfo.reverse;
            webpage.remoteAddress.bgp = hostinfo.bgp;
            webpage.remoteAddress.geoip = hostinfo.geoip;  
          }
        }
      }

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
        let buff = new Buffer(fullscreenshot, 'base64');
        var md5Hash = crypto.createHash('md5').update(buff).digest('hex');
        const ss = await Screenshot.findOneAndUpdate(
          {"md5": md5Hash},
          {"screenshot": fullscreenshot},
          {"new":true,"upsert":true},
        );
        /*
        const ss = new Screenshot({
          screenshot: fullscreenshot,
        });
        await ss.save(function (err, success){
          if(err) console.log(err);
        });
        */
        return ss;
      }
      const ss = await saveScreenshot(fullscreenshot);

      webpage.screenshot = ss._id;

    }catch(error){
        console.log(error);
        //webpage.title = error.message;
        webpage.error = error.message;

    }finally{
        await webpage.save(function (err, success){
          if(err) console.log(err);      
        });
        //console.log(webpage);
        await browser.close();
      }
  },
};
