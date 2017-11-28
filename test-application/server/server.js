import winston from 'winston';
import app from './app';

app.listen(4000, () => {
  // eslint-disable-next-line
  winston.log('info','Server is listening on port 4000')
});
