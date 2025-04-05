const Jimp = require("jimp");
const crypto = require("crypto");
const Screenshot = require("../models/screenshot");

async function saveFullscreenshot(fullscreenshot) {
  try {
    let buff = new Buffer.from(fullscreenshot, "base64");
    let md5Hash = crypto.createHash("md5").update(buff).digest("hex");
    let ss = await Screenshot.findOneAndUpdate(
      { md5: md5Hash },
      { screenshot: fullscreenshot },
      { new: true, upsert: true },
    );
    buff = null;
    md5Hash = null;
    if (ss._id) {
      let id = ss._id;
      ss = null;
      return id;
    } else {
      return;
    }
  } catch (err) {
    console.log(err);
    return;
  }
}

module.exports = { saveFullscreenshot };
