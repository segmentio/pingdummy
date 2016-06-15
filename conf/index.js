var path = require('path');
var nconf = require('nconf');

/**
 * Returns the config for the environment, `env`
 *
 * @param {String} env  the environment string
 */

module.exports = function(env){
	var provider = new nconf.Provider();
	// overrides passed in via arguments and env vars take precedent
	provider.argv();
	provider.env();

	var defaultsConfigPath = path.join(__dirname, 'defaults.json');
	var envConfigPath = path.join(__dirname, env + '.json');

	[envConfigPath, defaultsConfigPath].forEach(function(path) {
  	provider.add(path, { type: 'file', file: path });
	});

	return provider;
}