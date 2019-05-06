var express = require('express');
var router = express.Router();

const Response = require('./models/response');

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
    const previous = await Response.find({
        "url":response.url,
        "createdAt":{$lt: response.createdAt}
    }).sort("-createdat").limit(1)
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
      //payload: payload,
      //model:'response',
    });  
});

module.exports = router;
