var koa = require('koa');
var router = require('koa-router')();
var request = require('co-request');
var common = require('pingdummy-common');

var logger = common.logger;
var config = common.config;
var httpUserAgent = 'Pingdummy Beacon 0.0.1';

// instantiate the base koa instance
var app = module.exports = koa();
app.use(require('koa-logger')());

// route table
router
  .get('/ping/:url', pingGet)
  .get('/', healthcheck);

app.use(router.routes());

logger.log('info', 'Attaching SIGINT listener.');
process.on('SIGINT', function() {
    process.exit();
});

function *healthcheck(next){
  this.status = 200;
}

function *pingGet(next) {
  logger.log('debug', 'pingGet', { url: this.params.url });

  var result;

  try {
    var result = yield request({
      url: this.params.url,
      timeout: config.get("worker:timeout_millis"),
      headers: { 'User-Agent': httpUserAgent }
    });
  }
  catch (err) {
    logger.log('debug', 'performCheck soft error', {
      url: this.params.url,
      err: err.toString()
    });
    return 0;
  }

  logger.log('debug', 'pingGet response', {
    url: this.params.url,
    responseCode: result.statusCode
  });

  this.body = JSON.stringify({"statusCode": result.statusCode});
}

if (!module.parent) {
  logger.log('info', 'App starting up...');

  app.listen(3001);

  logger.log('info', 'App now listening on port.');
}