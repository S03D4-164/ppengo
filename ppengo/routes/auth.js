var express = require('express');
var passport = require('passport');
var router = express.Router();

var User = require('./models/user');

router.get('/', async function (req, res) {
    res.render('auth', {
        user : req.user,
    });
});

router.post('/user/:username', async function (req, res) {
    var loginUser = await User.findById(req.user._id);
    if(loginUser.admin || loginUser.username===req.params.username){
        await User.findOne({username:req.params.username})
        .then(async function(user){
            await user.setPassword(req.body.password);
            await user.save();
            res.render('auth', {
                user : user,
                message: "password chaged."
            });
        });
    }
    res.render('auth', {
        user : req.user,
        message: "no permission."
    });    
});

router.get('/user/:username', async function (req, res) {
    var loginUser = await User.findById(req.user._id);
    if(loginUser.admin || loginUser.username===req.params.username){
        await User.findOne({username:req.params.username})
        .then((user)=>{
            console.log(user)
            res.render('auth', {
                user : user,
            });
        });
    }else{
        res.render('auth', {
            user : req.user,
            message: "no permission."
        });
    }
});

router.get('/register', function(req, res) {
    res.render('register', {
    });
});

router.post('/register', async function(req, res, next) {
    if (typeof user !== 'undefined'){
        if(!user.admin){
            res.render('auth', {
                user : req.user,
                message: "no permission."
            });    
        }
    }else if (typeof user === 'undefined'){
        User.find().then((doc)=>{
            if(doc.length>0){
                res.render('auth', {
                    user : req.user,
                    message: "no permission."
                });    
            }
        });    
    }
    var username = req.body.username;
    var password = req.body.password;

    User.register(new User({ username : username }), password, function(err, account) {
        if (err) {
            console.log(err);
            return res.render('register', { account : account });
        }
        /*
        passport.authenticate('local')(req, res, function () {
            res.redirect(req.baseUrl);
        });
        */
        res.render('auth', {
            user : req.user,
            message: "registered: " + account.username
        });
    });
});

router.post('/', passport.authenticate('local'), function(req, res) {
    //res.redirect(req.baseUrl);
    res.render('auth', {
        user : req.user,
        message: "user authenticated."
    });
});

router.get('/logout', function(req, res) {
    req.logout();
    //res.redirect(req.baseUrl);
    res.render('auth', {
        user : req.user,
        message: "user logged out."
    });
});

module.exports = router;