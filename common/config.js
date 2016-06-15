var conf = require('pingdummy-conf');
var path = require('path');
var env = require('./env');

var provider = conf(env.current);

module.exports = {
  get: provider.get.bind(provider),
  required: provider.required.bind(provider)
}
