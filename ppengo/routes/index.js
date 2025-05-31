var express = require("express");
var router = express.Router();

const Webpage = require("./models/webpage");
const Website = require("./models/website");

const agenda = require("./agenda");
const bulkregister = require("./bulkregister");

router.post("/", async function (req, res) {
  const input = req.body["url"];

  //var webpages = [];
  var urls = [];
  for (let inputUrl of input.split("\r\n")) {
    const ex = /(https?|ftp):\/\/.+/;
    //if(inputUrl){
    if (ex.exec(inputUrl)) {
      inputUrl = ex.exec(inputUrl)[0];
      console.log(inputUrl);
      var lang = req.body["lang"];
      if (typeof lang === "string") lang = [lang];
      var userAgent = req.body["userAgent"];
      if (typeof userAgent === "string") userAgent = [userAgent];
      for (let lkey in lang) {
        for (let ukey in userAgent) {
          var option = {
            timeout: 30,
            delay: 5,
          };
          option["lang"] = lang[lkey];
          option["userAgent"] = userAgent[ukey];
          if (req.body["timeout"]) option["timeout"] = req.body["timeout"];
          if (req.body["delay"]) option["delay"] = req.body["delay"];
          if (req.body["referer"]) option["referer"] = req.body["referer"];
          if (req.body["proxy"]) option["proxy"] = req.body["proxy"];
          if (req.body["click"]) option["click"] = req.body["click"];
          if (req.body["actions"]) option["actions"] = req.body["actions"];
          if (req.body["exHeaders"])
            option["exHeaders"] = req.body["exHeaders"];
          if ("disableScript" in req.body) option["disableScript"] = true;
          if ("pptr" in req.body) option["pptr"] = req.body["pptr"];
          urls.push({
            url: inputUrl,
            option: option,
          });
        }
      }
    }
  }

  var track = "track" in req.body ? req.body["track"] : 0;
  const webpages = await bulkregister.registerUrl(urls, track, req.user);
  var ids = [];
  for (let webpage of webpages) {
    ids.push(webpage._id.toString());
    if (webpage.option.pptr == "playwright") {
      agenda.now("playwget", {
        pageId: webpage._id,
        count: 0,
      });
    } else {
      agenda.now("wgeteer", {
        pageId: webpage._id,
        count: 0,
      });
    }
  }

  res.render("progress", {
    title: "Progress",
    webpages,
    ids: String(ids),
    search: null,
  });
});

router.post("/progress", function (req, res) {
  const ids = req.body["pageId[]"];
  Webpage.where("_id")
    .in(ids)
    .then((webpages) => {
      var completed = true;
      for (let i in webpages) {
        //if (!webpages[i].url && !webpages[i].title && !webpages[i].error) {
        if (!webpages[i].requests.length > 0 && !webpages[i].error) {
          completed = false;
        }
      }
      let search;
      res.render("progress", {
        webpages,
        title: "Progress",
        completed: completed,
        ids,
        search,
      });
    });
});

router.get("/delete/website/:id", async function (req, res) {
  const id = req.params.id;
  await Website.findByIdAndDelete(id);
  res.redirect(req.baseUrl);
});

router.get("/delete/webpage/:id", async function (req, res) {
  const id = req.params.id;
  await Webpage.findByIdAndDelete(id);
  res.redirect(req.baseUrl);
});

const request = require("./request");
router.use("/request", request);

const website = require("./website");
router.use("/website", website);

const payload = require("./payload");
router.use("/payload", payload);

const yararule = require("./yararule");
router.use("/yararule", yararule);

//const screenshot = require("./screenshot");
//router.use("/screenshot", screenshot);
const { screenshot } = require("../controllers/screenshotController");
router.get("/screenshot/:id", screenshot);

const search = require("./search");
router.use("/search", search);

const response = require("./response");
router.use("/response", response);

const webpage = require("./webpage");
router.use("/page", webpage);

const auth = require("./auth");
router.use("/auth", auth);

const jstillery = require("./jstillery");
router.use("/jstillery", jstillery);

const administration = require("./administration");
router.use("/administration", administration);

router.use("/", website);

module.exports = router;
