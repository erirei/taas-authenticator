import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import cookieParser from 'cookie-parser';
import { authenticationSetup, authenticatedMiddleware, users} from 'taas-authenticator';

const app = express();

const settingsObject = {
  clientId: '4c95d32c8b23463d', //REQUIRED (string)
  clientSecret: '628df37d-ae0a-48ec-a956-e8418117d7bc', //REQUIRED (string)
  issuer: 'https://login.telia.io/realms/telia', //optional (string) will default to this value 
  callbackUrl:'http://localhost:4000/auth/callback', //optional will default to this value
  debug: false, //optional (boolean) will default to this value
  hostUrl: 'http://loclahost:4000/', //optional (string) will default to this value
  url: { //optional (string) will default to this value
    login: '/login', //optional (string) will default to this value
    loginBankId: '/loginBankId', //optional (string) will default to this value
    callback: '/auth/callback', //optional (string) will default to this value
    logout: '/logout', //optional (string) will default to this value
    failure: '/failure', //optional (string) will default to this string
    success: '/' //optional (string) will default to this string
  },
  requiredAcr: 3 //optional (number) 
}

authenticationSetup(app, settingsObject);
app.use(authenticatedMiddleware);

app.get('/*', (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(path.resolve(__dirname, '../dist/index.html'));
  } else {
    res.redirect('/login');
  }
});

export default app;
