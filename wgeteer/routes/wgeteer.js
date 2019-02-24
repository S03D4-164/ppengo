const puppeteer = require('puppeteer');
const {TimeoutError} = require('puppeteer/Errors');
const imageThumbnail = require('image-thumbnail');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var ObjectId = require('mongodb').ObjectID;

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');

module.exports = {

  wget (pageId, option){

      //console.log(pageId);
      var webpage = null;
      var url = null;
      Webpage.findById(pageId)
      .then((doc) => {
          webpage = doc;
          console.log(webpage);
          url = webpage.input;
      });
      
      //console.log(option);
      var userAgent = option['user-agent'];
      var proxy = option['proxy'];
      var referer = option['referer'];
      var timeout = option['timeout'];
      if (timeout >= 30 && timeout <= 300){
        timeout = timeout * 1000;
      }else{
        timeout = 30000;
      }

      const lang = '--lang=ja';
      const chromiumArgs= [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ];

      (async() => {

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
          //headless: false,
          ignoreHTTPSErrors: true,
          //userDataDir: 'data',
          defaultViewport: {width: 1280, height: 720,},
          dumpio:true,
          //devtools:true,
          args: chromiumArgs,
        });
      //const browserAgent = await browser.userAgent();
      //const browserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36';
      const browserAgent = userAgent;
      //const browserVersion = await browser.version();
      //console.log(browserVersion);

      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      await page.setJavaScriptEnabled(true);
      await page.setUserAgent(browserAgent);

      page.on('console', msg => console.log('[Console] ', msg.text()));
      page.on('load', () => console.log('Page loaded!'));
      page.on('domcontentloaded', () => console.log('DOM content loaded!'));
    
      page.on('requestfailed', request => {
        console.log('[Request] failed=>', request.url() + ' ' + request.failure());
      });

      /*
      page.on('requestfinished', async (request) => {
        console.log(
          '[Request] finished=>', 
          request.method(),
          request.url(),
        );
      });
      */

    page.on('request', async (interceptedRequest) => {
      try{

        console.log(
          '[Request] ', 
          //interceptedRequest,
          interceptedRequest.method(),
          interceptedRequest.url(),
        );

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

      }catch(error){
        console.log(error);
      }

    });
    
    //let counter = 0;
    page.on('response', async (interceptedResponse) => {
      try{

      console.log(
        '[Response] ', 
        //interceptedResponse,
        interceptedResponse.status(),
        interceptedResponse.remoteAddress(),
        interceptedResponse.url(),
      );
      //console.log(interceptedResponse.securityDetails());
      //console.log(interceptedResponse.headers());
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
      response.save(function (err){
        //if(err) {console.log(err);}
        //else {console.log("response saved.");}
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
      
      /*
      const tree = await page._client.send('Page.getResourceTree');
      for (const resource of tree.frameTree.resources) {
        console.log(resource);
      }
      */

      function pageDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      };
      await pageDelay(10000);

      const b64screenshot = await page.screenshot({
        fullPage: true,
        encoding: 'base64',
      });
      const screenshot = await page.screenshot({
        fullPage: false,
        encoding: 'base64',
      });
      const thumbnail = await imageThumbnail(
        screenshot,
        {percentage: 20, responseType: 'base64'}
      );

      /*
      const chain = finalResponse.request().redirectChain();
      for (var c in chain){
        console.log(c)
      }
      */

      const pageContent = await page.content();
      const pageTitle = await page.title()
      webpage.url = page.url();
      webpage.title = pageTitle;
      webpage.screenshot = b64screenshot;
      webpage.thumbnail = thumbnail;
      webpage.content = pageContent;

      webpage.save(function (err, success){
        if(err) {
          console.log(err);
        }      
      });
      /*
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
        webpage.save(function (err, success){
          if(err) {
            console.log(err);
          }      
        });
      }
      browser.close();
    })();
  },
};
