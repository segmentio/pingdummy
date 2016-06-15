var crypto = require('crypto');
var config = require('./config');

config.required(['signing_secret']);

var secret = config.get('signing_secret');

function newHmac(extra) {
  return crypto.createHmac('sha256', config.get('signing_secret') + extra);
}

function leftPad(str, length, padChar) {
  var amountToPad = length - str.length;
  var pad = '';
  for (var i = 0; i < amountToPad; i++) {
    pad += padChar;
  }
  return pad + str;
}

// signs content with the global secret, returns the signature
function sign(content) {
  var hmac = newHmac('');
  hmac.update(content);
  return hmac.digest('hex');
}

// signs content with an expiring signature
function signExpiring(content, expiresAt) {
  var timestamp = expiresAt.getTime();
  var encodedTimestamp = leftPad(timestamp.toString(16), 16, '0');
  var hmac = newHmac('!' + encodedTimestamp);
  hmac.update(content);
  return hmac.digest('hex') + encodedTimestamp;
}

// verifies a signature created with signExpiring()
function verifyExpiring(content, encodedSignature) {
  if (encodedSignature.length != 80) {
    return false;
  }
  var sig = encodedSignature.slice(0, 63);
  var ts = encodedSignature.slice(64);
  var expiresAt = new Date(parseInt(ts, 16));
  var expectedSignature = signExpiring(content, expiresAt);

  // omg timing attacks
  if (encodedSignature == expectedSignature) {
    var expiresAtTimestamp = expiresAt.getTime();
    var nowTimestamp = new Date().getTime();
    return expiresAtTimestamp > nowTimestamp;
  }

  return false;
}

module.exports = {
  sign: sign,
  signExpiring: signExpiring,
  verifyExpiring: verifyExpiring
};
