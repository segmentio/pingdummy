var common = require('pingdummy-common');
var koa = require('koa');
var models = require('pingdummy-db/models');
var parse = require('co-body');
var path = require('path');
var querystring = require('querystring');
var url = require('url');
var views = require('co-views');

var logger = common.logger;

// instantiate the base koa instance
var app = module.exports = koa();

app.use(require('koa-logger')());
app.use(require('koa-session')(app));
app.use(require('koa-flash')());

var router = require('koa-router')();

// setup the common render path
var frontendConfig = common.config.get('frontend');
var _render = views(__dirname + '/views', {
  locals: {
    config: frontendConfig,
  },
  map: {
    html: 'swig'
  }
});

// optionally dynamically generate assets using middleware (useful for dev)
if (frontendConfig.dynamic_assets) {
  var webpackMiddleware = require('koa-webpack-dev-middleware');
  var webpack = require('webpack');
  app.use(webpackMiddleware(
    webpack(require('./webpack.config')), {
      noInfo: false,
      quiet: false,
      lazy: true,
      watchOptions: {
        aggregateTimeout: 300,
        poll: true
      },
      publicPath: "/assets/",
      stats: {
        color: true
      }
    })
  );
}
else {
  var mount = require('koa-mount');
  var assetsApp = koa();
  assetsApp.use(require('koa-static')(path.join(__dirname, 'public/assets')));
  app.use(mount('/assets', assetsApp));
}

// route table
router.get('home', '/', home);
router.get('/register', getRegister);
router.post('/register', postRegister);
router.get('verify', '/verify', verifyRegistration);
router.get('/healthcheck', getHealthCheck);
router.get('showHealthcheck', '/healthcheck/:url', getHealthCheckForUrl);
router.get('/unsubscribe', getUnsubscribe);

app.use(router.routes());
app.keys = [common.config.get('signing_secret')];

function *render(ctx, path, opts) {
  opts = opts || {};
  opts.locals = opts.locals || {};
  if (ctx && ctx.flash) {
    opts.locals['flash'] = ctx.flash;
  }
  return yield _render(path, opts);
}

function *home(next) {
  this.body = yield render(this, 'home');
}

function *getRegister(next) {
  this.body = yield render(this, 'register');
}

function signedRouteUrl(routeKey, query) {
  var routePath = router.url(routeKey);
  var baseUrl = url.resolve(common.config.get("site_url"), routePath);
  var urlObject = url.parse(baseUrl, true);
  delete urlObject.search;
  urlObject.query = query;
  var materializedUrl = url.format(urlObject);
  var expiresAt = new Date(new Date().getTime() + common.config.get('links_expire_in_millis'));
  return common.url.signed(materializedUrl, expiresAt);
}

function *postRegister(next) {
  var post = yield parse(this);
  var postEmail = post.email;
  var postUrl = common.url.normalize(post.url);
  var verifyLink = signedRouteUrl('verify', { url: postUrl, email: postEmail });

  var emailSent = yield common.email.send(
    postEmail,
    '[pingdummy] Verify Registration',
    yield render(null, 'email_verify_registration', { verifyLink: verifyLink }));

  this.body = yield render(this, 'success', { email: postEmail });
}

function *verifyRegistration(next) {
  if (common.url.verifySignature(this.request.href)) {
    var created = yield models.HealthcheckConfig.create({
      ownerEmail: this.query.email,
      url: this.query.url,
      emailValidated: true
    });

    if (created) {
      var [urlModel, created] = yield models.Url.findCreateFind({
        where: { url: this.query.url },
        defaults: { url: this.query.url },
      });

      logger.log('debug', 'upserted URL', { created: created });
      this.redirect(router.url('showHealthcheck', { url: this.query.url }));
      return;
    }
  }
  else {
    logger.log('info', 'verifyRegistration: bad signature', { params: this.params });
  }

  this.redirect(router.url('home'));
}

function *getUnsubscribe(next) {
  this.flash = { type: 'warning', message: 'Failed to unsubscribe you :(' };

  if (common.url.verifySignature(this.request.href)) {
    var deleted = yield models.HealthcheckConfig.destroy({
      where: {
        ownerEmail: this.query.email,
        url: this.query.url
      }
    });

    this.flash = { type: 'success',
                   message: 'Successfully unsubscribed ' + this.query.email };
  }
  else {
    logger.log('info', 'unsubscribe failed: bad signature', { params: this.params });
  }

  this.redirect(router.url('home'));
}

function *getHealthCheck(next) {
  this.body = yield render(this, 'healthchecks');
}

function *getHealthCheckForUrl(next) {
  // Get last 100 health checks for specified URL.
  var normalizedUrl = common.url.normalize(this.params.url);
  beaconHistory = yield models.BeaconHistory.findAll({
    where: {
      url: normalizedUrl
    },
    limit: 100,
    order: [
      ['ping_time', 'DESC'],
    ]
  });

  // Convert dates to a more human readable format.
  var dateFormat = require('dateformat');
  var beaconHistoryReadable = [];
  for (var i = 0; i < beaconHistory.length; i++) {
    var entry = {
      'pingTime': dateFormat(beaconHistory[i]['pingTime']),
      'statusCode': beaconHistory[i]['statusCode'],
      'wasSuccessful': (beaconHistory[i]['statusCode'] == 200) ? true : false
    };
    beaconHistoryReadable.push(entry);
  }
  context = new Object();
  context.beaconHistory = beaconHistoryReadable;
  context.url = normalizedUrl;
  this.body = yield render(this, 'healthchecks_sites', context);
}

logger.log('info', 'Attaching SIGINT listener.');
process.on('SIGINT', function() {
    process.exit();
});

if (!module.parent) {
  logger.log('info', 'App starting up...');

  app.listen(3000);

  logger.log('info', 'App now listening on port.');
}
