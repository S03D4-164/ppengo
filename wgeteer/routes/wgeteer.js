const puppeteer = require('puppeteer');
//const {TimeoutError} = require('puppeteer/Errors');
const imageThumbnail = require('image-thumbnail');
const crypto = require("crypto");

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

module.exports = {

  async wget (pageId, option){

      //console.log(pageId);
      const webpage = await Webpage.findById(pageId)
      .then(doc => {
        return doc;
      })
      .catch(err =>{
        return console.log(err);
      });
      console.log(webpage);
      const url = webpage.input;
      var option = webpage.option;

      //console.log(option);
      var userAgent = option['userAgent'];
      var referer = option['referer'];
      var timeout = option['timeout'];
      if (timeout >= 30 && timeout <= 300){
        timeout = timeout * 1000;
      }else{
        timeout = 30000;
      }
      var delay = option['delay'];
      if (delay > 0 && delay <= 60){
        delay = delay * 1000;
      }else{
        delay = 0;
      }
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
      if (lang){
        exHeaders["Accept-Language"] = lang;
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
      if(userAgent){
        await page.setUserAgent(userAgent);
      }
      if(exHeaders){
        await page.setExtraHTTPHeaders(exHeaders);
      }
      await page.setJavaScriptEnabled(true);
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: '/home/node/download',
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

      //var webpage = null;

      var request_seq = [];
      var response_seq = [];

      async function saveResponse(interceptedResponse, request){
          //console.log(request._id);
          var responseBuffer = null;
          var text = null;
          if (interceptedResponse.status() < 300
          || interceptedResponse.status() >= 400){
            try{
              responseBuffer = await interceptedResponse.buffer();
              var md5Hash = crypto.createHash('md5').update(responseBuffer).digest('hex');

              const payload = new Payload({
                payload: responseBuffer,
                hash: {
                  md5: md5Hash,
                }
              })
              payload.save(function (err){
                if(err) console.log(err);
              });

              text = await interceptedResponse.text();
            }catch(error){
              console.log(error);
            }    
          }
          var securityDetails = {};
          if (interceptedResponse.securityDetails()){
            securityDetails = {
              issuer: interceptedResponse.securityDetails().issuer(),
              protocol: interceptedResponse.securityDetails().protocol(),
              subjectName: interceptedResponse.securityDetails().subjectName(),
              validFrom: interceptedResponse.securityDetails().validFrom(),
              validTo: interceptedResponse.securityDetails().validTo(),
            }
          }
          const response = new Response({
            webpage: webpage._id,
            url:interceptedResponse.url(),
            status:interceptedResponse.status(),
            payload:responseBuffer,
            text:text,
            statusText: interceptedResponse.statusText(),
            ok: interceptedResponse.ok(),
            remoteAddress: interceptedResponse.remoteAddress(),
            securityDetails: securityDetails,
            headers: interceptedResponse.headers(),
            request: request._id,
          });
          response.save(function (err){
              if(err) console.log(err);
              //else console.log(response);
          });
          //console.log(response.request)
          return  response;
      }

      async function saveRequest(interceptedRequest, result){
        const chain = interceptedRequest.redirectChain();
        if(chain){
          for(let seq in chain){
            console.log("[Chain]", chain[seq]);
          }  
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
        });
        request.save(function (err){
          if(err) {console.log(err);} 
          //else {console.log("request saved.");}
        });
        if (result==='finished'){
          const response = interceptedRequest.response();
          const res = saveResponse(response, request);
        }else if(result==='failed'){
          const response = interceptedRequest.response();
          const res = saveResponse(response, request);
        }
        return request
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
          request_seq.push({
            'url':interceptedRequest.url(),
            'headers': interceptedRequest.headers(),
          });
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
        response_seq.push({
          'url':interceptedResponse.url(),
          'headers': interceptedResponse.headers(),
        });

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

      /*
      
      const chain = finalResponse.request().redirectChain();
      for (var c in chain){
        console.log("[Chain]", chain)
      }
      */
      
      webpage.url = page.url();
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
      //webpage.screenshot = fullscreenshot;

      async function saveScreenshot(fullscreenshot){
        const ss = new Screenshot({
          screenshot: fullscreenshot,
        });
        ss.save(function (err, success){
          if(err) console.log(err);
          //else if(success) console.log(ss);
        });
        return ss;
      }
      const ss = await saveScreenshot(fullscreenshot);
      webpage.screenshot = ss._id;
      //webpage.response = finalResponse._id;
      }catch(error){
        console.log(error);
        webpage.title = error.message;
      }finally{
        await webpage.save(function (err, success){
          if(err) console.log(err);      
        });
        //console.log(webpage);
        await browser.close();
      }
  },
};
