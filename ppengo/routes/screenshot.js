var express = require("express");
var router = express.Router();

const Screenshot = require("./models/screenshot");

/*
var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());
*/

//router.get('/',  csrfProtection, function(req, res, next) {
router.get("/", function (req, res) {
  //const now = date.now();
  Screenshot.find()
    .lean()
    .sort("-createdAt")
    .limit(100)
    .then((payloads) => {
      //console.log(websites);
      res.render("screenshots", {
        title: "Screenshot",
        payloads,
        //csrfToken:req.csrfToken(),
      });
    })
    .catch((err) => {
      //console.log(err);
      res.send(err);
    });
});

//router.get('/:id', csrfProtection, function(req, res, next) {
router.get("/:id", function (req, res) {
  const id = req.params.id;
  //console.log(id);
  Screenshot.findById(id)
    .lean()
    .then((webpage) => {
      //console.log(webpage);
      var img = new Buffer.from(webpage.screenshot, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": img.length,
      });
      res.end(img);
    });
});

module.exports = router;
