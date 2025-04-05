const { addExtra } = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const rebrowserPuppeteer = require("rebrowser-puppeteer");
const puppeteer = addExtra(rebrowserPuppeteer);
puppeteer.use(StealthPlugin());

module.exports = puppeteer;
