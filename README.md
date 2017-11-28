# taas-authenticator
A node module which makes it easy to authenticate with Trust as a service based on express.

The module includes two main components; the authenticationSetup, and authenticatedMiddleware.

The middleware makes sure that a user is logged in and will trigger the login if thats not the case.

The setup adds the endpoints needed for the express server in order to make the login work.

## Getting started
Before you try to use the module you need to have a client on TAAS.
A client can get created here[https://sandbox.console.telia.io]

install the npm moduel *taas-authenticator*
```
npm install --save taas-authenticator
```

import the methods *authenticationSetup* and *authenticatedMiddleware*, and specify the settings you want with the second paramter in the setup method.

```
import express from 'express';
import { authenticationSetup, authenticatedMiddleware, users} from 'taas-authenticator';

const app = express();

const settingsObject = {
  clientId: 'yourClientId', //REQUIRED (string)
  clientSecret: 'yourClientSecret', //REQUIRED (string)
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
```

## What the hell does all the settings stuff do?
| Settings values        | What it does           |
|:---------------------- |:-----------------------|
| clientId               | **REQUIRED** The clientId for the project that has been created throught the selfservice portal [https://sandbox.console.telia.io]|
| clientSecret           | **REQUIRED** The clientSecret generated throught the selfservice portal [https://sandbox.console.telia.io]|
| issuer                 | The url to the service that you want a token from |
| callbackUrl            | The url the authentication will redirect the user to after the login has been successfull (full path needed). This must allso be part of the callbacks registrated in the selfservice portal [https://sandbox.console.telia.io] |
| hostUrl                | The url used for where to redirect the user after a logout. This needs to be specified in the selfservice portal [https://sandbox.console.telia.io] |
| requiredAcr            | Value for what level of authentication that is required. Currently the only supported value is acr value 3. This will force the user to have signed in with bankId |
| debug                  | Flag if you want the setup to log out more information |
| url                    | Object containing all the different routs that the setup will add. Use this to customize your urls |
| url.login              | The relative path for where the user should log in |
| url.loginBankId        | The relatice path for where the user should log in with bankId |
| url.callback           | The relatice path for what the server should do when the user is done with the login flow. This needs to match up with the last part of the callback url. If your callback is `http:localhost:4000/auth/callback` this needs to be `/auth/callback`|
| url.failure            | The relatice path for where the user should go if the authentication failed |
| url.success            | The relatice path for where the user should go after sucessfull logging in |

## Authenticated Middleware
Use the middelware for endpoints which you want to protect wiht a login.

## TODO's
Add support for non in-memory sessionstores
