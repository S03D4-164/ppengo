var createError = require('http-errors');
var express = require('express');
var paginate = require('express-paginate');
var path = require('path');

var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var bodyParser = require('body-parser');
var session = require('express-session');

const logger = require("./routes/logger")
const mongoose = require('mongoose');
const mongoStore = require('connect-mongo')(session);
mongoose.connect('mongodb://mongodb/wgeteer', {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true 
}).then(() =>  logger.debug('[mongoose] connect completed'))
.catch((err) => logger.error(err));
mongoose.set('debug', function (coll, method, query, doc) {
  logger.debug(coll + " " + method + " " + JSON.stringify(query) + " " + JSON.stringify(doc));
});

const User = require('./routes/models/user');
var passport = require('passport');

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var app = express();

var morgan = require('morgan');
app.use(morgan('combined'));

var rootPath = "/ppengo/";

var mongo_express = require('mongo-express/lib/middleware')
var mongo_express_config = require('./config/mongo_express_config.js')
app.use(rootPath + 'mongo_express/', mongo_express(mongo_express_config))

var Agenda = require('agenda');
var Agendash = require('agendash');
var agenda = new Agenda({
  db: {
    address: 'mongodb://mongodb/wgeteer',
    collection: 'agendaJobs',
    options: {
        useNewUrlParser: true,
    },
  }
});

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json({ limit: '32mb' }));

app.use(paginate.middleware(100, 100));
app.use(rootPath + "api", require('./routes/api'));

app.use(rootPath, express.static(path.join(__dirname, 'public')));
app.use(rootPath + 'js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use(rootPath + 'js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use(rootPath + 'css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap

app.use(cookieParser());
//app.use(csrf({ cookie: true }));
var csrfFuc = csrf({ cookie: true });

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: new mongoStore({ mongooseConnection: mongoose.connection })
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req,res,next){
  var ignoreUris = ['^\/ppengo/api\/.*$']
  for (var i=0,len=ignoreUris.length; i<len; i++) {
      if(req.url.match(ignoreUris[i])){
          next();
          return;
      }
  }
  csrfFuc(req,res,next);

})


app.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.user = req.user;
  var token = req.csrfToken();
  res.locals.csrfToken = token;
  next();
});

app.use(rootPath + 'dash/',
  function (req, res, next) {
    if (!req.user) res.send(401);
    else next();
  },
  Agendash(agenda)
);

var indexRouter = require('./routes/index');
app.use(rootPath, indexRouter);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.locals.moment = require('moment');

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
