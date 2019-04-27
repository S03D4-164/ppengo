var express = require('express');
var passport = require('passport');
var router = express.Router();

var User = require('./models/user');

router.get('/', function (req, res) {
    console.log(res.locals);
    res.render('index', {
        //user : req.user,
        //csrfToken:req.csrfToken(),
    });
});

/*
router.get('/register', csrfProtection, function(req, res) {
    res.render('register', {
        csrfToken:req.csrfToken(),
    });
});

router.post('/register', parseForm, csrfProtection, async function(req, res, next) {

    User.register(new User({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
            return res.render('register', { account : account });
        }

        passport.authenticate('local')(req, res, function () {
            res.redirect(req.baseUrl);
        });
    });
});

router.get('/login', csrfProtection, function(req, res) {
    res.render('login', {
         user : req.user,
         csrfToken:req.csrfToken(),
    });
});
*/

router.post('/login', passport.authenticate('local'), function(req, res) {
    res.redirect(req.baseUrl);
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect(req.baseUrl);
});

module.exports = router;