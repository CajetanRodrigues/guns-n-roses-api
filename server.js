var
  cors = require('cors'),
  http = require('http'),
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  CryptoJS = require('crypto-js');
 
var app = express();
 
const API_URL = "https://accounts.spotify.com/api/token";
const CLIENT_ID = 'bdf1ef6a64c0498a87a9ed6d9040845a';
const CLIENT_SECRET = 'aa4e3ca4f54f410fb4a131448cefade3';
const CLIENT_CALLBACK_URL = 'devdacticspotify://callback';
const ENCRYPTION_SECRET = 'gunsandroses';
 
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cors({
  origin: true,
  credentials: true
}));
const spotifyRequest = params => {
    return new Promise((resolve, reject) => {
        request.post(API_URL, {
          form: params,
          headers: {
            "Authorization": "Basic " + new Buffer(CLIENT_ID + ":" + CLIENT_SECRET).toString('base64')
          },
          json: true
        }, (err, resp) => err ? reject(err) : resolve(resp));
      })
      .then(resp => {
        if (resp.statusCode != 200) {
          return Promise.reject({
            statusCode: resp.statusCode,
            body: resp.body
          });
        }
        return Promise.resolve(resp.body);
      })
      .catch(err => {
        return Promise.reject({
          statusCode: 500,
          body: JSON.stringify({})
        });
      });
  };

  // Route to obtain a new Token
app.post('/exchange', (req, res) => {
 
    const params = req.body;
    if (!params.code) {
      return res.json({
        "error": "Parameter missing"
      });
    }
   
    spotifyRequest({
        grant_type: "authorization_code",
        redirect_uri: CLIENT_CALLBACK_URL,
        code: params.code
      })
      .then(session => {
        let result = {
          "access_token": session.access_token,
          "expires_in": session.expires_in,
          "refresh_token": encrypt(session.refresh_token)
        };
        return res.send(result);
      })
      .catch(response => {
        return res.json(response);
      });
  });
   
  // Get a new access token from a refresh token
  app.post('/refresh', (req, res) => {
    const params = req.body;
    if (!params.refresh_token) {
      return res.json({
        "error": "Parameter missing"
      });
    }
   
    spotifyRequest({
        grant_type: "refresh_token",
        refresh_token: decrypt(params.refresh_token)
      })
      .then(session => {
        return res.send({
            "access_token": session.access_token,
            "expires_in": session.expires_in
        });
      })
      .catch(response => {
        return res.json(response);
      });
  });
  // Helper functions
function encrypt(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_SECRET).toString();
  };
   
  function decrypt(text) {
    var bytes = CryptoJS.AES.decrypt(text, ENCRYPTION_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  };
   
console.log('Listening on 5000');
app.listen(5000);