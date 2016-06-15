"use strict";

var fs = require("fs");
var path = require("path");
var Sequelize = require("sequelize");
var common = require('pingdummy-common');
var logger = common.logger;

// bootstrap database from config
common.config.required([
  'database:uri',
  'database:options'
]);
var dbConfig = common.config.get('database');

// transform any storage path to be relative to the pingdummy root dir
var dbConfigOptions = dbConfig.options;
if ('storage' in dbConfigOptions) {
  dbConfigOptions.storage = path.join(
    __dirname,
    '..',
    '..',
    dbConfigOptions.storage);
}

dbConfigOptions.logging = function(str) {
  logger.log('debug', '[Sequelize] ' + str);
}

var sequelize = new Sequelize(dbConfig.uri, dbConfigOptions);
var db = {};

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js");
  })
  .forEach(function(file) {
    var model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
