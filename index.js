const passport = require('passport');
const { Strategy } = require('passport-openidconnect');
const session = require('express-session');
const _ = require('lodash');
const request = require('superagent');
const moment = require('moment');
const winston = require('winston');
const jwt = require('jsonwebtoken');
  

const scope = ['oidc'];
const users = [];
  
let SUCCESSURL;
let FAILUREURL;
let IDPAPIURL;
let CLIENTID;
let CLIENTSECRET;
let ISSUER;
let CALLBACK;
let LOGINURL;
let LOGINBANKURL;
let CALLBACKPATH;
let LOGOUTURL;
let HOSTURL;
let DEBUG;
let REQUIREDACR;

function authenticationSetup(app, settings) {

  settings.url = settings.url ? settings.url : {};

  DEBUG = settings.debug ? settings.debug : false;
  
  SUCCESSURL = settings.url.successUrl ? settings.url.successUrl : '/';
  FAILUREURL = settings.url.failure ? settings.url.failure : '/failure';
  LOGINURL = settings.url.login ? settings.url.login : '/login';
  LOGINBANKURL = settings.url.loginBankId ? settings.url.loginBankId : '/loginbankid';
  LOGOUTURL = settings.url.logout ? settings.url.logout : '/logout';
  CALLBACKPATH = settings.url.callback ? settings.url.callback : '/auth/callback';
  
  ISSUER = settings.issuer ? settings.issuer : 'https://sandbox.login.telia.io/realms/telia';
  IDPAPIURL = `${ISSUER}/protocol/openid-connect`;

  CALLBACK = settings.callbackUrl ? settings.callbackUrl : 'http://localhost:4000/auth/callback'
  HOSTURL = settings.hostUrl ? settings.hostUrl : 'http://localhost:4000/';

  CLIENTID = settings.clientId;
  CLIENTSECRET = settings.clientSecret;
  REQUIREDACR = settings.requiredAcr;

  passport.use(
    'openid-connect-bankid',
    new Strategy({
      issuer: ISSUER,
      authorizationURL: `${IDPAPIURL}/auth`,
      tokenURL: `${IDPAPIURL}/token`,
      userInfoURL: `${IDPAPIURL}/userinfo`,
      clientID: CLIENTID,
      clientSecret: CLIENTSECRET,
      callbackURL: CALLBACK,
      scope,
      acr_values: 3,
      prompt: REQUIREDACR === 3 ? 'login' : '',
    },
    (iss, sub, profile, jwtClaims, accessToken, refreshToken, params, done) => {
      users[profile.preferred_username] = profile;
      profile.accessToken = accessToken;
      done(null, profile);
    },
  ));

  passport.use(
    'openid-connect',
    new Strategy({
      issuer: ISSUER,
      authorizationURL: `${IDPAPIURL}/auth`,
      tokenURL: `${IDPAPIURL}/token`,
      userInfoURL: `${IDPAPIURL}/userinfo`,
      clientID: CLIENTID,
      clientSecret: CLIENTSECRET,
      callbackURL: CALLBACK,
      scope
    },
    (iss, sub, profile, jwtClaims, accessToken, refreshToken, params, done) => {
      profile.refreshToken = refreshToken;
      profile.accessToken = accessToken;
      users[profile.preferred_username] = profile;
      done(null, profile);
    },
  ));

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  const sess = settings.session ? settings.session : {
    secret: 'its all for you',
    resave: true,
    saveUninitialized: true,
    cookie: {
      user: {},
    },
  };

  app.use(session(sess));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get(LOGINURL, passport.authenticate('openid-connect'));
  app.get(LOGINBANKURL, passport.authenticate('openid-connect-bankid'));
  app.get(CALLBACKPATH, (req, res, next) => {
    passport.authenticate('openid-connect', (err, user, info) => { // eslint-disable-line

      if (err) {
        if (DEBUG){
          winston.log('error', `Error when fetching admin token: ${JSON.stringify(err)}`);
        }
        return next(err);
      }

      if (info.state && info.state.clientSecret) {
        delete info.state.clientSecret;
      }
      if (DEBUG){
        winston.log('info', `Info during authentication: ${JSON.stringify(info)}`);
      }
      if (!user) {
        return res.redirect(FAILUREURL);
      }

      let acr = jwt.decode(user.accessToken).acr;
      user.acr = acr;

      req.login(user, (err) => {
        if (err) {
          if (DEBUG){
            winston.log('error', `Faild to log in user: ${JSON.stringify(err)}`);
          }
          return next(err);
        }
        if (DEBUG){
          winston.log('info', 'user successfully logged in');
        }
        return res.redirect(SUCCESSURL);
      });
    })(req, res, next);
  });

  app.get(LOGOUTURL, (req, res) => {
  if (req.isAuthenticated()) {
    const encodedUri = encodeURIComponent(`${HOSTURL}`);
    req.logout();
    res.redirect(`${ISSUER}/protocol/openid-connect/logout?redirect_uri=${encodedUri}`);
  }
});
}

const sessionHasExpired = (profile) => {
  if (profile.tokenExpiration) {
    if (moment(moment.utc()).isBefore(profile.tokenExpiration)) {
      return false;
    }
    return true;
  }
  return true;
};

const tryFetchingNewToken = profile => new Promise((resolve, reject) => {
  request.post(`${idpApiUrl}/token`)
    .type('form')
    .send({
      grant_type: 'refresh_token',
      refresh_token: profile.refreshToken,
      client_id: CLIENTID,
      client_secret: CLIENTSECRET,
    }).end((err, res) => {
      if (err || !res.ok) {
        if (DEBUG){
          winston.log(
            'error',
            `Error when fetching new refresh token: ${JSON.stringify(err.response ? err.response.text : err)}`,
          );
        }
        reject();
      } else {
        profile.refreshToken = res.body.refresh_token;
        profile.accessToken = res.body.access_token;
        let acr = jwt.decode(res.body.access_token).acr;
        profile.acr = acr;

        resolve();
      }
    });
});

const validateAndInspectUserToken = (profile, resolve, reject, req) => {
  request.post(`${IDPAPIURL}/token/introspect`)
    .type('form')
    .send({
      grant_type: 'implicit',
      token: profile.accessToken,
      client_id: CLIENTID,
      client_secret: CLIENTSECRET,
    }).end((err, res) => {
      if (err || !res.ok) {
        if (DEBUG){
          winston.log('error', `Error when validating access token: ${JSON.stringify(err.response ? err.response.text : err)}`);
        }
        req.logout();
        reject();
      } else if (!res.body.active) {
        tryFetchingNewToken(profile).then(() => {
          resolve();
        }).catch(() => {
          reject();
        });
      } else {
        profile.tokenExpiration = res.body.exp * 1000;
        resolve();
      }
    });
};

const userIsAuthenticated = req => new Promise((resolve, reject) => {
  const profile = req.session.passport.user;

  if (sessionHasExpired(profile)) {
    validateAndInspectUserToken(profile, resolve, reject, req);
  } else {
    resolve();
  }
});

function authenticatedMiddleware(req, res, next) {
  if (!_.isEmpty(req.session.passport)) {
    if(req.session.passport.user.acr < REQUIREDACR){
      switch (REQUIREDACR) {
        case 0: res.redirect(LOGINURL); break;
        case 1: res.redirect(LOGINURL); break;
        case 2: res.redirect(LOGINURL); break;
        case 3: res.redirect(LOGINBANKURL); break;
      }
    } else {
      userIsAuthenticated(req).then(() => {
        next();
      }).catch(() => {
        res.redirect(SUCCESSURL);
      });
    }
  } else {
    next();
  }
}

exports.authenticatedMiddleware = authenticatedMiddleware;
exports.authenticationSetup = authenticationSetup;
exports.users = users;
