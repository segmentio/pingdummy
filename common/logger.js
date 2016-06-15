var winston = require('winston');
var config = require('./config');
var env = require('./env');

config.required(['log_level']);

var logger = new (winston.Logger)({
  level: config.get('log_level'),
  transports: [
    new (winston.transports.Console)()
  ]
})

logger.log('info', 'logger started', {
  level: logger.level,
  environment: env.current});

module.exports = logger; 
