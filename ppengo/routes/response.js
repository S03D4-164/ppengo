var express = require('express');
var router = express.Router();

const Response = require('./models/response');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

router.get('/',  csrfProtection, function(req, res, next) {
    //const now = date.now();
    Response
    .find()
    .populate("payload")
    .sort("-createdAt").limit(100)
    .then((webpages) => {
        //console.log(webpages);
        res.render(
          'responses', {
             webpages, 
             csrfToken:req.csrfToken(),
          });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
});
  
router.get('/:id', csrfProtection, async function(req, res, next) {
    const id = req.params.id;
    const response = await Response.findById(id)
      .populate('request').populate('webpage')
      .then((document) => {
        //console.log(document);
        return document;
      });
    const webpage = response.webpage;
    const request = response.request;
    const previous = await Response.find({
        "url":response.url,
        "createdAt":{$lt: response.createdAt}
    }).sort("createdat").limit(1)
    .then((document) => {
        //console.log(document);
        return document;
      });
  
    res.render(
      'response', { 
      title: "Response", 
      webpage:webpage,
      request:request,
      response:response,
      previous,
      csrfToken:req.csrfToken(),
      //payload: payload,
      model:'response',
    });
  
  });

module.exports = router;
