import express from 'express';
import path from 'path';
import { authenticationSetup, authenticatedMiddleware, users} from '../../index.js';

const app = express();

const settingsObject = {
  clientId: '4e51740507c74006', //REQUIRED (string)
  clientSecret: '9a038f3d-0764-4522-a3d9-42ec22379bf6', //REQUIRED (string)
  issuer: 'https://sandbox.login.telia.io/realms/telia', //optional (string) will default to this value 
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
  requiredAcr: 0 //optional (number) 
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
