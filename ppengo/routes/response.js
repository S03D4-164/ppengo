var express = require('express');
var router = express.Router();

const Response = require('./models/response');

var Diff = require('diff');

router.get('/', function(req, res) {
  Response
    .find()
    .populate("payload")
    .sort("-createdAt").limit(100)
    .then((webpages) => {
        //console.log(webpages);
        res.render(
          'responses', {
            title: "Response", 
            webpages, 
          });
      })
      .catch((err) => { 
        console.log(err);
        res.send(err); 
      });
});
  
router.get('/:id', async function(req, res) {
  const id = req.params.id;
    const response = await Response.findById(id)
      .populate('request').populate('webpage')
      .then((document) => {
        //console.log(document);
        return document;
      });
    const webpage = response.webpage;
    const request = response.request;

    var previous, diff;
    if (response.text){
      previous = await Response.find({
        "url":response.url,
        "createdAt":{$lt: response.createdAt},
        //"status":{$ge: 0}
      }).sort("-createdAt")
      .then((document) => {
        console.log(document.length);
        return document;
      });
      if (previous.length){
        previous = previous[0];
        if (previous.text && response.text){
          diff =  Diff.createPatch("", previous.text, response.text, previous._id, response._id) 
        }
      }
    }
  
    /*
    const previous = await Response.find({
        "url":response.url,
        "createdAt":{$lt: response.createdAt}
    }).sort("-createdat").limit(1)
    .then((document) => {
        //console.log(document);
        return document;
      });
    */

    res.render(
      'response', { 
      title: "Response", 
      webpage:webpage,
      request:request,
      response:response,
      previous,
      diff,
      //payload: payload,
      //model:'response',
    });  
});

module.exports = router;
