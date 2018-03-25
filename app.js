
/**
 * Module dependencies
 */

var express = require('express'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  methodOverride = require('method-override'),
  errorHandler = require('express-error-handler'),
  morgan = require('morgan'),
  routes = require('./routes'),
  http = require('http'),
  path = require('path'),
  passport = require('passport'),
  NestStrategy = require('passport-nest').Strategy,
  session = require('express-session');

//Change for production apps.
//This secret is used to sign session ID cookies.
var SECRET_KEY = process.env.SECRET_KEY;

//PassportJS options. See http://passportjs.org/docs for more information.
var passportOptions = {
  failureRedirect: '/auth/failure', // Redirect to another page on failure.
};

passport.use(new NestStrategy({
  // Read credentials from your environment variables.
  clientID: process.env.NEST_ID,
  clientSecret: process.env.NEST_SECRET
}));

/**
* No user data is available in the Nest OAuth
* service, just return the empty user object.
*/
passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

var app = module.exports = express();


/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('dev'));
app.use(bodyParser());
app.use(methodOverride());

app.use(cookieParser(SECRET_KEY));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: SECRET_KEY,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'third_party')));

var env = process.env.NODE_ENV || 'development';

// development only
if (env === 'development') {
  app.use(errorHandler());
}

// production only
if (env === 'production') {
  // TODO
}


/**
 * Routes
 */

// serve index and view partials
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);
//
var usersFilePath = path.join(__dirname, 'config.json');

app.get('/hue-config.json', function(req, res){
	res.json({
	    "bridge_url": process.env.HUE_BRIDGE_URL,
	    "username": process.env.HUE_USERNAME
	});
});

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);

/**
 * Listen for calls and redirect the user to the Nest OAuth
 * URL with the correct parameters.
 */
app.get('/auth/nest', passport.authenticate('nest', passportOptions));

/**
 * Upon return from the Nest OAuth endpoint, grab the user's
 * accessToken and set a cookie so browser can access it, then
 * return the user back to the root app.
 */
app.get('/auth/nest/callback', passport.authenticate('nest', passportOptions),
  function(req, res) {
    res.cookie('nest_token', req.user.accessToken);
    res.redirect('/');
});

/**
 * When authentication fails, present the user with
 * an error requesting they try the request again.
 */
app.get('/auth/failure', function(req, res) {
  console.log('Authentication failed. Status code: ' + res.statusCode);
  res.send('Authentication failed. Please try again.');
});

/**
 * When the user requests to log out, deauthorize their token using the Nest
 * deauthorization API then destroy their local session and cookies.
 * See https://goo.gl/f2kfmv for more information.
 */
app.get('/auth/logout', function(req, res) {
  var token = req.cookies['nest_token'];
  if (token) {
    var reqOpts = {
      hostname: 'api.home.nest.com',
      path: '/oauth2/access_tokens/' + token,
      method: 'DELETE'
    };

    https.request(reqOpts, function(revokeRes) {
      console.log('Log out successful.');
      req.session.destroy();
      res.clearCookie('nest_token');
      res.redirect('/');
    }).on('error', function() {
      console.log('An error occurred attempting to revoke token.');
      res.send('Log out failed. Please try again.');
    }).end();
  } else {
    console.log('Not signed in.');
    res.redirect('/');
  }
});

app.all("/*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
    return next();
});


/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
