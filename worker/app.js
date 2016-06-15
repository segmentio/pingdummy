var httpUserAgent = 'Pingdummy Worker 0.0.1';

var states = {
  UP: { action: 'has recovered' },
  DOWN: { action: 'is not responding' },
};

////////////

var co = require('co');
var common = require('pingdummy-common');
var datetime = require('node-datetime');
var models = require("pingdummy-db/models");
var request = require('co-request');
var url = require('url');
var winston = require('winston');

var logger = common.logger;
var config = common.config;

////////////

function *runWorker() {
  // cache the parallelism value because it'll mess up pagination if it changes
  // in the middle.
  var parallelism = config.get("worker:parallelism");
  var lastUrl = '';

  while (true) {
    // build up N functions, where N <= parallelism, and then
    // execute them in a fashion that blocks this function, to
    // limit parallelism.
    var urls = yield models.Url.findAll({
      where: { url: { $gte: lastUrl } },
      // uses limit+1 to avoid the tail query with 0 results
      limit: parallelism+1
    });
    var fns = [];

    logger.log('info', 'runWorker: executing checks on page', {
      count: urls.length
    });

    for (var i = 0; i < urls.length && i < parallelism; i++) {
      (function() {
        var urlModel = urls[i];
        fns.push(function *() {
          var pingTime = datetime.create().getTime();

          // Have beacon service execute the ping and get status code.
          var beaconServicePingUrl =
              config.get("beacon:uri") + "/ping/" + encodeURIComponent(urlModel.url);
          logger.log('info', 'runWorker: submitting request to beacon service', {
            beaconServicePingUrl: beaconServicePingUrl
          });

          var result = yield request({
            url: beaconServicePingUrl,
            timeout: config.get("worker:timeout_millis"),
            headers: { 'User-Agent': httpUserAgent }
          });
          logger.log('info', 'runWorker: got response from beacon service', {
            statusCode: result.statusCode
          });

          var statusCode = result.statusCode;

          yield saveCheckHistory(urlModel.url, pingTime, statusCode);

          // Send if URL check was not successful.
          var success = statusCode == 200;
          if (!success) {
            yield sendNotifications(urlModel.url, states.DOWN);
          }
        });
      })();
    }

    yield fns;

    // ran out of URLs to check
    if (urls.length < parallelism+1) {
      return;
    }
    else {
      lastUrl = urls[parallelism].url;
    }
  }
}

function *sendNotifications(checkUrl, state) {
  var lastId = 0;
  var pageSize = 1000;
  while (true) {
    var checks = yield models.HealthcheckConfig.findAll({
      where: {
        id: { $gte: lastId },
        url: checkUrl,
        emailValidated: true
      },
      // again, limit+1 here to avoid the 0 result tail query
      limit: pageSize+1,
    });

    for (var i = 0; i < checks.length && i < pageSize; i++) {
      var check = checks[i];
      var [subject, content] = formatNotificationEmail(check, state);
      yield common.email.send(check.ownerEmail,
                              subject,
                              content);
    }

    // ran out of notifications to send
    if (checks.length < pageSize+1) {
      return;
    }
  }
}

function unsubscribeUrl(email, checkUrl) {
  var baseUrl = url.resolve(config.get('site_url'), '/unsubscribe');
  var urlObject = url.parse(baseUrl, true);
  delete urlObject.search;
  urlObject.query = { email: email, url: checkUrl };
  var paramdUrl = url.format(urlObject);
  var expiresAt = new Date(new Date().getTime() + config.get('links_expire_in_millis'));
  return common.url.signed(paramdUrl, expiresAt);
}

function formatNotificationEmail(checkModel, state) {
  var content = '';
  content += 'A site that you registered to receive notifications for ';
  content += state.action + '.\n';
  content += 'URL: ' + checkModel.url + '\n';
  content += ''
  content += 'If you received this email in error or would no longer like to';
  content += 'receive notifications, follow the link below to unsubscribe:\n';
  content += unsubscribeUrl(checkModel.ownerEmail, checkModel.url);
  var subject = '[' + stringifyState(state) + '] pingdummy: ' + checkModel.url;
  return [subject, content];
}

function *saveCheckHistory(checkUrl, pingTime, statusCode) {
  logger.log('info', 'saveCheckHistory',
      { url: checkUrl,
        pingTime: pingTime,
        statusCode: statusCode });

  yield models.BeaconHistory.create({
    url: common.url.normalize(checkUrl),
    pingTime: pingTime,
    statusCode: statusCode
  });
}

function stringifyState(state) {
  for (var key in states) {
    var val = states[key];
    if (val == state) {
      return key;
    }
  }
  throw 'Inconceivable';
}

logger.log('info', 'Attaching SIGINT listener.');
process.on('SIGINT', function() {
    process.exit();
});

logger.log('info', 'Syncing models, creating DB tables if necessary.');
models.sequelize.sync();

logger.log('info', 'Starting Worker...');
setInterval(function() {
  var last = 0;
  var running = false; // these calls are async so we need to block overlaps
  return function() {
    var now = new Date().getTime();
    var workerIntervalMillis = config.get("worker:max_interval_seconds") * 1000;
    if ((last + workerIntervalMillis) < now && !running) {
      var term = function(x) {
        logger.log('info', 'worker: END run');
        running = false;
        last = now;
      }
      co(function *() {
        running = true;
        logger.log('info', 'worker: BEGIN run');
        yield runWorker();
      }).then(term, function(err) {
        logger.log('error', 'Error during Worker run', { error: err.toString() });
        term();
      });
    }
  };
}(), 10);
