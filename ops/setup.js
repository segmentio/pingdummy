var co = require('co');
var AWS = require('aws-sdk');

var common = require('pingdummy-common');
var config = common.config;
var logger = common.logger;

function *verifyFromAddress() {
  config.required(['notification_from_email']);
  var ses = new AWS.SES({apiVersion: '2010-12-01'});
  var fromEmail = config.get('notification_from_email');

  logger.log('info', 'Verifying notification from address', { email: fromEmail });

  var getIdentityResponse = yield function(cb) {
    return ses.getIdentityVerificationAttributes({Identities: [fromEmail]}, cb);
  };

  if (getIdentityResponse != null &&
      fromEmail in getIdentityResponse.VerificationAttributes &&
      getIdentityResponse.VerificationAttributes[fromEmail].VerificationStatus == 'Success') {
    logger.log('info', 'Email address already verified.');
    return;
  }

  var verifyResponse = yield function(cb) {
    return ses.verifyEmailAddress({EmailAddress: fromEmail}, cb);
  };

  logger.log('info', 'Sent verification, please click the link in the email from AWS.');
}

co(function* () {
  yield verifyFromAddress();
}).catch(function(err) {
  logger.log('error', 'error verifying email address', err);
});
