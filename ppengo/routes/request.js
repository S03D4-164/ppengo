var express = require("express");
var router = express.Router();

const Request = require("./models/request");
const logger = require("./logger");

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
  Request.find()
    .sort("-createdAt")
    .limit(100)
    .lean()
    .then((webpages) => {
      res.render("requests", {
        title: "Request",
        webpages,
        //csrfToken:req.csrfToken(),
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

//router.get('/:id', csrfProtection, function(req, res, next) {
router.get("/:id", async function (req, res) {
  const id = req.params.id;
  let request;
  let error;
  let webpage;
  let response;
  try {
    request = await Request.findById(id)
      .populate("webpage")
      .populate("response");
    webpage = request.webpage;
    response = request.response;
  } catch (err) {
    logger.error(err);
    error = err.message;
  }
  //console.log(response);
  res.render("response", {
    title: "Request",
    request: request,
    webpage: webpage,
    response: response,
    error: error,
    //csrfToken:req.csrfToken(),
  });
});

module.exports = router;
