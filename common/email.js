var config = require('./config');
var logger = require('./logger');
var AWS = require('aws-sdk');

config.required([
  'notification_from_email',
  'send_emails'
]);

function *sendEmail(from, to, subject, message) {
  var ses = new AWS.SES({apiVersion: '2010-12-01'});
  var params = {
    Destination: {
      ToAddresses: [
        to
      ]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Text: {
          Data: message,
          Charset: 'UTF-8'
        }
      }
    },
    Source: from,
  };

  logger.log('debug', 'sending email', {
    to: to,
    from: from,
    subject: subject,
    bodyLength: message.length
  });

  if (config.get('send_emails')) {
    var res = yield function(cb) {
      ses.sendEmail(params, cb);
    };
  }
  else {
    logger.log('warn', 'no email actually sent (disabled in config)', { body: JSON.stringify(message.toString()) });
  }

  return res;
}

function *send(to, subject, message) {
  return yield sendEmail(
    config.get('notification_from_email'),
    to,
    subject,
    message);
}

module.exports = {
  send: send
};
