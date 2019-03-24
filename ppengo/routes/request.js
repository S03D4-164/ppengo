var express = require('express');
var router = express.Router();

const Request = require('./models/request');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var csrfProtection = csrf({ cookie: true });
var parseForm = bodyParser.urlencoded({ extended: false });
router.use(cookieParser());

router.get('/',  csrfProtection, function(req, res, next) {
  //const now = date.now();
  Request.find().sort("-createdAt").limit(100)
    .then((webpages) => {
      res.render(
        'requests', {
          title:"Page",
          webpages,
          csrfToken:req.csrfToken(),
        });
    })
    .catch((err) => { 
      console.log(err);
      res.send(err); 
    });
});

router.get('/:id', csrfProtection, function(req, res, next) {
  const id = req.params.id;
  Request.findById(id).populate('response').populate('webpage')
    .then((webpage) => {
      //console.log(webpage);
      res.render(
        'request', { 
        title: "Request", 
        webpage:webpage,
        csrfToken:req.csrfToken(),
        //model:'request',
      });
    });
});

module.exports = router;
