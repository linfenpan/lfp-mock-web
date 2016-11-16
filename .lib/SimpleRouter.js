'use strict';
function SimpleRouter(router, config) {
  this.router = router;
  this.config = config || {};
  this.fnMap = {};
  this.init();
}
SimpleRouter.prototype = {
  init() {
    this.combine();
  },

  reset(config) {
    this.config = config;
    this.combine();
  },

  combine(config) {
    config = Object.assign(this.config, config || {});

    Object.keys(config).forEach(key => {
      let tmps = key.split(/\s+/);
      let method = tmps[0];
      let urlSetting = tmps[1];
      let callback = config[key];

      if (tmps <= 1) {
        urlSetting = method;
        method = 'GET';
      }

      if (typeof callback !== 'function') {
        callback = (data => (req, res, next) => {
          res.set('content-type', 'text/plain');
          res.send(data);
        })(callback);
      }

      this.route(method, urlSetting, callback);
    });
  },

  route(method, url, callback) {
    method = method.toLowerCase();
    const key = this.getRouteKey(method, url);
    const fnMap = this.fnMap;
    const router = this.router;
    if (fnMap[key]) {
      fnMap[key] = { method, url, callback };
    } else if (router[method]) {
      router[method](url, function(req, res, next) {
        const obj = fnMap[key];
        if (obj && typeof obj.callback === 'function') {
          return obj.callback(req, res, next);
        } else {
          return next();
        }
      });
      fnMap[key] = { method, url, callback };
    } else {
      console.warn(`no method ${method}, "${url}"`);
    }
  },

  getRouteKey(method, url) {
    return `${method.toLowerCase()} ${url}`;
  }
};

module.exports = SimpleRouter;
