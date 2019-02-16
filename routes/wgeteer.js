//const express = require('express');
const imageThumbnail = require('image-thumbnail');

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27018/wgeteer', { useNewUrlParser: true });
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var ObjectId = require('mongodb').ObjectID;

/*
const Webpage = mongoose.model('Webpage');
const Request = mongoose.model('Request');
const Response = mongoose.model('Response');
*/

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');

module.exports = {

  wget (inputUrl, option){

    console.log(option);
    const userAgent = option['user-agent'];
    const proxy = option['proxy'];
    const lang = '--lang=ja';
    const chromiumArgs= [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ];

    const puppeteer = require('puppeteer');
    const {TimeoutError} = require('puppeteer/Errors');

    (async() => {
    
    const browserFetcher = puppeteer.createBrowserFetcher();
    const localChromiums = await browserFetcher.localRevisions();
    //console.log(localChromiums);
    if(!localChromiums.length) {
      return console.error('Can\'t find installed Chromium');
    }
    const myBrowser = localChromiums[0];
    const {executablePath} = await browserFetcher.revisionInfo(myBrowser);
    //console.log(executablePath);

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
    //const page = await browser.newPage();
    const page = await context.newPage();
    await page.setJavaScriptEnabled(true);
    await page.setUserAgent(browserAgent);

    const webpage = new Webpage({
      input: inputUrl,
      /*
      url:page.url(),
      title:pageTitle,
      content:pageContent,
      screenshot: b64screenshot,
      thumbnail: thumbnail,
      */
    });

    page.on('console', msg => console.log('[Console] ', msg.text()));
    page.on('load', () => console.log('Page loaded!'));
    page.on('domcontentloaded', () => console.log('DOM content loaded!'));
  
    page.on('requestfailed', request => {
      console.log('[Request] failed=>', request.url() + ' ' + request.failure().errorText);
    });

    /*
    page.on('requestfinished', async (request) => {
      console.log(
        '[Request] finished=>', 
        request.method(),
        request.url(),
      );
      //console.log(request.headers());
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

      //console.log(request.headers());
      const request = new Request({
        webpage: webpage._id,
        url:interceptedRequest.url(),
        method:interceptedRequest.method(),
        resourceType: interceptedRequest.resourceType(),
        isNavigationRequest:interceptedRequest.isNavigationRequest(),
        postData: interceptedRequest.postData(),      
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
      console.log(interceptedResponse.securityDetails());
      console.log(interceptedResponse.headers());
      var responseBuffer = null;
      if (interceptedResponse.status() < 300
       && interceptedResponse.status() >= 400){
            responseBuffer = await interceptedResponse.buffer();
      }
        
      const response = new Response({
        webpage: webpage._id,
        url:interceptedResponse.url(),
        status:interceptedResponse.status(),
        payload:responseBuffer,
        statusText: interceptedResponse.statusText(),
        ok: interceptedResponse.ok(),
        remoteAddress: interceptedResponse.remoteAddress(),
        securityDetails: interceptedResponse.securityDetails(),
      });
      response.save(function (err){
        //if(err) {console.log(err);}
        //else {console.log("response saved.");}
      });

      }catch(error){
        console.log(error);
      }
    });


    const url = inputUrl;

    try{

    //await page.tracing.start({path: 'trace.json'});
    const finalResponse = await page.goto(url,{
      timeout:30000,
      //referer:'https://www.google.com',
      waitUntil: 'networkidle2',
    });
    //await page.tracing.stop();
    
    /*
    const tree = await page._client.send('Page.getResourceTree');
    for (const resource of tree.frameTree.resources) {
      console.log(resource);
    }
    */

    function pageDelay(ms) {
       return new Promise(resolve => setTimeout(resolve, ms));
    };
    await pageDelay(5000);

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
      {percentage: 10, responseType: 'base64'}
    );

    const chain = finalResponse.request().redirectChain();
    for (var c in chain){
      console.log(c)
    }

    const pageContent = await page.content();
    const pageTitle = await page.title()
    webpage.url = page.url();
    webpage.title = pageTitle;
    webpage.screenshot = b64screenshot;
    webpage.thumbnail = thumbnail;
    webpage.content = pageContent;
    //let bodyHTML = await page.evaluate(() => document.body.innerHTML);
    //webpage.content = bodyHTML;
    //console.log(pageTitle, page.url());

    /*
    const webpage = new Webpage({
      url:page.url(),
      title:pageTitle,
      content:pageContent,
      screenshot: b64screenshot,
      thumbnail: thumbnail,
    });
    console.log("pageId",webpage._id);
    */
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
    }
    browser.close();
  })();
  },
};
