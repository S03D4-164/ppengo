var express = require('express');
var router = express.Router();

const Website = require('../models/website');

router.get('/', function(req, res) {
  Website.paginate({}, {
    sort:{"createdAt":-1},
    page: req.query.page,
    limit: req.query.limit
  }, function(err, result) {
    //console.log(result)
    res.json(result);
  });
});

router.get('/:id', async function(req, res) {
  await Website.findById(req.params.id)
    .then((document) => {
      return res.json(document);
    })
    .catch((err) => {
      console.log(err)
      return res.json({error:err.message});
    })
});

module.exports = router;
