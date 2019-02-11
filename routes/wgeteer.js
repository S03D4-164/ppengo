const express = require('express');
const mongoose = require('mongoose');

const imageThumbnail = require('image-thumbnail');

const Webpage = require('./models/webpage');
const Request = require('./models/request');
const Response = require('./models/response');

module.exports = {

  wget (inputUrl, option){

    console.log(option);

    const puppeteer = require('puppeteer');
    const {TimeoutError} = require('puppeteer/Errors');

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
    const browserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36';
    console.log(browserAgent);
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
    //page.on('load', () => console.log('Page loaded!'));
    //page.on('domcontentloaded', () => console.log('DOM content loaded!'));
    
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
      console.log(
        '[Request] ', 
        //interceptedRequest,
        interceptedRequest.method(),
        interceptedRequest.url(),
      );
      //console.log(request.headers());
      const request = new Request({
        url:interceptedRequest.url(),
        method:interceptedRequest.method(),
        webpage: webpage._id,
      });
      request.save(function (err){
        if(err) {
          console.log(err);
        }
      });
      

    });
    
    //let counter = 0;
    page.on('response', async (interceptedResponse) => {
      console.log(
        '[Response] ', 
        //interceptedResponse,
        interceptedResponse.status(),
        interceptedResponse.remoteAddress(),
        interceptedResponse.url(),
      );
      //console.log(interceptedResponse.securityDetails());
      //console.log(interceptedResponse.headers());
      const responseBuffer = await interceptedResponse.buffer();
      const response = new Response({
        url:interceptedResponse.url(),
        status:interceptedResponse.status(),
        payload:responseBuffer,
        webpage: webpage._id,
      });
      response.save(function (err){
        if(err) {
          console.log(err);
        }
      });
    });

    try{

    const url = inputUrl;

    //await page.tracing.start({path: 'trace.json'});
    const response = await page.goto(url,{
      timeout:30000,
      //referer:'https://www.google.com',
      waitUntil: 'networkidle2',
    });
    //await page.tracing.stop();

    const pageTitle = await page.title()
    console.log(pageTitle, page.url());
    const chain = response.request().redirectChain();
    //console.log(chain)

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

    const pageContent = await page.content();

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
    webpage.url = page.url();
    webpage.title = pageTitle;
    webpage.content = pageContent;
    webpage.screenshot = b64screenshot;
    webpage.thumbnail = thumbnail;
    webpage.save(function (err, success){
      if(err) {
        console.log(err);
      }else{
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
