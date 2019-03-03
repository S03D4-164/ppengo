const puppeteer = require('puppeteer');
const {TimeoutError} = require('puppeteer/Errors');
const imageThumbnail = require('image-thumbnail');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
//var ObjectId = require('mongodb').ObjectID;

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');

module.exports = {

  wget (pageId, option){
    (async() => {

      //console.log(pageId);
      var webpage = null;
      var url = null;
      await Webpage.findById(pageId)
      .then((doc) => {
          webpage = doc;
          console.log(webpage);
          url = webpage.input;
      });
      console.log(option);
      var userAgent = option['user-agent'];
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

      var headers = {"Accept-Language":"ja"};
      //var headers = option['headers'];

      //const lang = '--lang=ja';
      var chromiumArgs= [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        //'--enable-logging=stderr','--v=1',
      ];

      var proxy = option['proxy'];
      if (proxy.match(/^(\d{0,3}\.){3}\d{0,3}:\d{1,5}$/)){
        chromiumArgs.push('--proxy-server='+proxy);
      }

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
      //const browserVersion = await browser.version();
      //console.log(browserVersion);
      browser.on('disconnected', () => console.log('[Browser] disconnected.'));
      browser.on('targetchanged', async tgt => console.log('[Browser] taget changed: ', tgt));
      browser.on('targetcreated', async tgt => console.log('[Browser] taget created: ', tgt));
      browser.on('targetdestroyed', async tgt => console.log('[Browser taget destroyed: ', tgt));
      
      const context = await browser.createIncognitoBrowserContext();
      /*
      context.on('targetchanged', async tgt => console.log('[BrowserContext] taget changed: ', tgt));
      context.on('targetcreated', async tgt => console.log('[BrowserContext] taget created: ', tgt));
      context.on('targetdestroyed', async tgt => console.log('[BrowserContext] taget destroyed: ', tgt));
      */

      const page = await context.newPage();
      await page.setUserAgent(userAgent);
      await page.setExtraHTTPHeaders(headers);
      await page.setJavaScriptEnabled(true);

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

      var request_seq = [];
      var response_seq = [];

      async function saveResponse(interceptedResponse){
        try{
          var responseBuffer = null;
          if (interceptedResponse.status() < 300
          || interceptedResponse.status() >= 400){
              responseBuffer = await interceptedResponse.buffer();
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
          for (let i in response_seq){
            if (response_seq[i].url===interceptedResponse.url()
              && response_seq[i].headers===interceptedResponse.headers()){
                console.log("response_seq", i);
                response_seq[i] = {
                  'url':undefined,
                  'headers':undefined,
                }
            }
          }
          const response = new Response({
            webpage: webpage._id,
            url:interceptedResponse.url(),
            status:interceptedResponse.status(),
            payload:responseBuffer,
            statusText: interceptedResponse.statusText(),
            ok: interceptedResponse.ok(),
            remoteAddress: interceptedResponse.remoteAddress(),
            securityDetails: securityDetails,
            headers: interceptedResponse.headers(),
          });
          response.save(
          /*  function (err){
              //if(err){console.log(err);}else {console.log("response saved.");}
            }*/
          );
        }catch(error){
          console.log(error);
        }
      }

      async function saveRequest(interceptedRequest, result){
        for (let i in request_seq){
          if (request_seq[i].url===interceptedRequest.url()
            && request_seq[i].headers===interceptedRequest.headers()){
              console.log("request_seq", i);
              request_seq[i] = {
                'url':undefined,
                'headers':undefined,
              }
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
        });
        request.save(function (err){
          if(err) {console.log(err);} 
          //else {console.log("request saved.");}
        });
        if (result==='finished'){
          const response = interceptedRequest.response();
          saveResponse(response);
        }else if(result==='failed'){

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
          /*
          const request = new Request({
            webpage: webpage._id,
            url:interceptedRequest.url(),
            method:interceptedRequest.method(),
            resourceType: interceptedRequest.resourceType(),
            isNavigationRequest:interceptedRequest.isNavigationRequest(),
            postData: interceptedRequest.postData(), 
            headers: interceptedRequest.headers(),
          });
          request.save(function (err){
            if(err) {console.log(err);} 
            //else {console.log("request saved.");}
          });*/
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

        /*var responseBuffer = null;
        if (interceptedResponse.status() < 300
         || interceptedResponse.status() >= 400){
            responseBuffer = await interceptedResponse.buffer();
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
          statusText: interceptedResponse.statusText(),
          ok: interceptedResponse.ok(),
          remoteAddress: interceptedResponse.remoteAddress(),
          securityDetails: securityDetails,
          headers: interceptedResponse.headers(),
        });
        response.save(
         function (err){
            //if(err){console.log(err);}else {console.log("response saved.");}
          }
        );*/
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
      function pageDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      };
      await pageDelay(delay);
     */

      const tree = await page._client.send('Page.getResourceTree');
      /*for (const resource of tree.frameTree.resources) {
        console.log("[Tree]", resource);
      }
      
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
      webpage.screenshot = fullscreenshot;

      /*
      webpage.save(function (err, success){
        if(err) {console.log(err);}      
      });

      function dumpFrameTree(frame, indent) {
        console.log(
          indent,
          frame.name(),
          frame.url(),
        );
        for (let child of frame.childFrames())
          dumpFrameTree(child, indent + '  ');
      }
      dumpFrameTree(page.mainFrame(), '[Frame] ');
      */

      }catch(error){
        console.log(error);
        webpage.title = error.message;
        /*webpage.save(function (err, success){
          if(err) {console.log(err);}      
        });*/
      }finally{
        webpage.save(function (err, success){
          if(err) {console.log(err);}      
        });  
        await browser.close();
      }
    })();
  },
};
