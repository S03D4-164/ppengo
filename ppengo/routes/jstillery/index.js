var express = require('express');
var router = express.Router();

router.get('/',  function(req, res) {
    res.render(
        'jstillery', {
        title:"JStillery",
    });
});

module.exports = router;
