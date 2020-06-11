var
  cors = require('cors'),
  http = require('http'),
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  CryptoJS = require('crypto-js');
 
var app = express();
 
const CLIENT_ID = 'bdf1ef6a64c0498a87a9ed6d9040845a';
const CLIENT_SECRET = 'aa4e3ca4f54f410fb4a131448cefade3';
const ENCRYPTION_SECRET = 'mysecret';
const redirect_uri = 'http://localhost:8888/callback'

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

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cors({
  origin: true,
  credentials: true
}));

app.get('/',(req,res) => {
  res.send({"status":"Online"});
})
// Route to obtain a new Token
app.post('/exchange', (req, res) => {
  console.log(req.body)
  const params = req.body;
  if (!params.code) {
    return res.json({
      "error": "Parameter missing"
    });
  }

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: params.code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
    },
    json: true
  };
  request.post(authOptions, function(error, response, body) {
    console.log('Successfully retrieved the fields for the first time!!!');
    console.log(body);
    res.send(body)
  })

})

// Get a new access token from a refresh token
app.post('/refresh', (req, res) => {
  const params = req.body;
  if (!params.refresh_token) {
    return res.json({
      "error": "Parameter missing"
    });
  }

    // requesting access token from refresh token
    var refresh_token = params.refresh_token;
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: { 'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
      json: true
    };
  
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        console.log('Successfully retrieved token from refresh token');
        console.log(body)
        res.send(body);
      }
    });
})
app.get('/token', function(req, res) {
  User.findOne({ 'id': req.query.id }, function (err, user) {
    res.send({
      'access_token': user.access_token
    });
  });
});

app.get('/callback', function(req, res) {
console.log(req.body);
})
const port = 8888
app.listen(port, () => console.log(`Example app listening at http://81.181.189.89:${port}`))