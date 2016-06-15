var url = require('url');
var sign = require('./sign');

// takes a URL string and returns a pingdummy-normalized version as a string
function normalize(inputUrl) {
  // url.parse will lowercase the protocol & hostname by itself
  var urlObject = url.parse(inputUrl);

  delete urlObject.auth;
  delete urlObject.port;
  delete urlObject.host; // in order for port deletion to compose properly,
                         // have to delete host too
  delete urlObject.hash;
  delete urlObject.query;
  delete urlObject.search;

  return url.format(urlObject);
}

// returns a signed version of a URL. doesn't take into consideration
// the origin (protocol, hostname, port, etc).
function signed(urlToSign, expiresAt) {
  var urlObject = url.parse(urlToSign, true);
  var signature = sign.signExpiring(urlObject.path, expiresAt);
  urlObject.query['__code'] = signature;
  delete urlObject.search;
  return url.format(urlObject);
}

// returns true if the signature in signed()-generated URL is valid
function verifySignature(requestUrl) {
  var urlObject = url.parse(requestUrl, true);
  var sig = urlObject.query['__code'];
  delete urlObject.query['__code'];
  delete urlObject.search;
  urlObject = url.parse(url.format(urlObject));
  return sign.verifyExpiring(urlObject.path, sig);
}

module.exports = {
  normalize: normalize,
  signed: signed,
  verifySignature: verifySignature
};
