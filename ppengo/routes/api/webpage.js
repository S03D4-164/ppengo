var express = require('express');
var router = express.Router();

const Webpage = require('../models/webpage');

router.get('/', function(req, res) {
    Webpage.paginate({}, {
      select:{
        "_id": 1,
        "createdAt": 1,
        "url": 1,
        "status": 1,
        "title": 1,
        "remoteAddress.ip": 1,
        "remoteAddress.geoip": 1,
        "wappalyzer": 1,
      },
      sort:{"createdAt":-1},
      page: req.query.page,
      limit: req.query.limit
    }, function(err, result) {
      //console.log(result)
      res.json(result);
    });
  });
  
  router.get('/:id', async function(req, res) {
    await Webpage.findById(req.params.id)
      .then((document) => {
        return res.json(document);
      })
      .catch((err) => {
        console.log(err)
        return res.json({error:err.message});
      })
  });

  module.exports = router;
