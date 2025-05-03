//const chromium = require("chromium");
const { execFile } = require("child_process");
//var request = require("sync-request");
const superagent = require('superagent');
//const fs = require("fs");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function startbrowser(port, url) {
  try {
    if (typeof port !== "string") {
      url = "https://google.com";
    }
    if (typeof port !== "number") {
      //port = 9222;
      port = 9515;
    }
    execFile(
      "/usr/bin/google-chrome-stable",
      [
        "--no-sandbox",
        "--window-size=1280,720",
        "--disable-setuid-sandbox",
        // "--disable-dev-shm-usage",
        // "--disable-accelerated-2d-canvas",
        // "--no-first-run",
        "--no-zygote",
        // "--single-process",
        // "--disable-gpu",
        // "--ignore-certificate-errors",
        // "--headless",
        `--remote-debugging-port=${port}`,
        url,
      ],
      (err) => {
        console.log(err);
      },
    );
    await delay(4000);
    //let res = await request("GET", `http://127.0.0.1:${port}/json/version`);
    const res = await superagent.get(`http://127.0.0.1:${port}/json/version`);
    let veri = await JSON.parse(res.getBody());
    let useragent = await veri["User-Agent"];
    let websocket = await veri["webSocketDebuggerUrl"];
    return { useragent, websocket };
  } catch (error) {
    return error;
  }
}
module.exports = {
  startbrowser,
};
