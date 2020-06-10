/*
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = 'bdf1ef6a64c0498a87a9ed6d9040845a'; // Your client id
var client_secret = 'aa4e3ca4f54f410fb4a131448cefade3'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var refresh_token_global = ''
/*
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();


var mongoose = require('mongoose');
mongoose.connect('mongodb+srv://admin:admin@cluster0-nwyig.mongodb.net/gunsnroses?retryWrites=true&w=majority', {useNewUrlParser: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB Cloud successfully!')
});
var userSchema = new mongoose.Schema({
  display_name: String,
  email: String,
  profile_image: String,
  country: String,
  access_token: String, 
  refresh_token: String,
  authorization_code: String,
  explicit_content: { filter_enabled: Boolean,filter_locked: Boolean },
  external_urls: { spotify: String},
  followers: { href: String, total: Number},
  href: String,
  id: String,
  images : Array,
  product: String,
  type: String,
  uri: String
});
var User = mongoose.model('User', userSchema);

// app.use(express.static(__dirname + '/public'))
//    .use(cors())
//    .use(cookieParser());
app.use(cors())

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email ugc-image-upload user-read-playback-state user-modify-playback-state user-read-currently-playing streaming app-remote-control playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-library-modify user-library-read user-top-read user-read-playback-position user-read-recently-played user-follow-read user-follow-modify';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter
  console.log('Here is my auth code')
  console.log(req.query.code)
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
            refresh_token_global = refresh_token
            
        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
          var user = new User({ 
          access_token: access_token,
          refresh_token: refresh_token,
          authorization_code: code,
          ...body
         });
         user.save(function (err, user) {
          if (err) return console.error(err);
          console.log(user)
          console.log('User saved successfully!');
        });
        });
        
        
        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  User.findOne({ 'id': req.query.id }, function (err, user) {
    if (err) return handleError(err);

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: user.refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {




          user.updateOne({"id":req.query.id}, { "access_token": body.access_token }, function(
            err,
            result
          ) {
            if (err) {
              res.send(err);
            } else {
              console.log(req.query.id + " now has access token " + body.access_token);
              res.send({
                'access_token': body.access_token
              });
            }
          });
      
    }
  });
  });

});
function callback (err, numAffected) {
  console.log('Updated ' + numAffected + " document successfully!")
}

app.get('/token', function(req, res) {
  User.findOne({ 'id': req.query.id }, function (err, user) {
    res.send({
      'access_token': user.access_token
    });
  });
});



console.log('Listening on 8888');
app.listen(8888);
