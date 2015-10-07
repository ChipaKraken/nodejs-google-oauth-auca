var express = require('express');
var passport = require('passport');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var path = require('path');
var mongoose = require('mongoose');
var app = express();

var GOOGLE_CLIENT_ID = "-=GOOGLE_CLIENT_ID=-";
var GOOGLE_CLIENT_SECRET = "-=GOOGLE_CLIENT_SECRET=-";

mongoose.connect('mongodb://localhost/Users');
var User = mongoose.model('User', {
  google_id: String,
  name: String,
  email: String,
  photo: String,
  gender: String,
});
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://127.0.0.1:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      var email = profile.emails[0]['value'];
      if (email.split('@')[1] != "auca.kg") {
        return done("User: "+email+" is not from AUCA");
      }
      var user = new User({
        google_id: profile.id,
        name: profile.displayName,
        email: email,
        photo: profile.photos[0]['value'],
        gender: profile.gender
      });
      User.find({google_id:user.google_id},function (err,docs) {
        if (!docs.length) {
          user.save(function (err, data) {
            if (err) return console.error(err);
            return done(null, user)
          });
        }else {
          return done(null, user)
        }
      });

      return done(null, user);
    });
  }
));

app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser('lorem ipsum'));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  console.log(req.cookies.google_id);
  res.render('home',{title: 'Exchange'});
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.email'] }),
  function(req, res){
    // The request will be redirected to Google for authentication, so this
    // function will not be called.
});
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.cookie('google_id',res.req.user.google_id, { maxAge: 900000, httpOnly: true});
    res.redirect('/application');
});
app.get('/logout', function(req, res){
  res.clearCookie('google_id', {httpOnly: true});
  res.redirect('/');
});
function isLoggedin (path) {
  return function (req, res, next) {
    if (req.cookies.google_id == undefined) {
      return res.redirect(path);
    } else {
      return next();
    }
  }
}
var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
