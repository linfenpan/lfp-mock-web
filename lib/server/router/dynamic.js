'use strict';

const co = require('co');
const noop = function(req, res, next) { next(); }
const express = require('express');
const parseUrl = require('parseurl');

class DynamicRouter {
  constructor() {
    const ctx = this;
    ctx.router = express.Router();
    // [{method, path, callback}]
    ctx.rules = [];
    ctx.bindRouter();
  }

  bindRouter() {
    let rules = [];
    const run = function(req, res, callback) {
      co(function*() {
        let url = parseUrl(req).pathname, method = req.method.toLowerCase();

        for (let i = 0, max = rules.length; i < max; i++) {
          let rule = rules[i], keys = [];
          let fn = rule.callback;
          // @notice 从 express/lib/router/layer 复制了一份相同的逻辑出来，以防以后代码被更新
          let layer = new Layer(rule.path, {
            sensitive: false,
            strict: false,
            end: false
          });

          if (layer.match(url) && (rule.method === method || rule.method === 'all')) {
            if (rule.path === '/' && url !== '/') {
              continue;
            }

            // 给 req，添加 params 参数
            req.params = layer.params;
            yield new Promise((resolve, reject) => {
              fn(req, res, function next(error) {
                if (error) {
                  reject(error);
                } else {
                  resolve();
                }
              });
            });
          }
        }

        // 跑到这里，就应该继续运行了
        callback();
      }.bind(this))
      .catch(error => {
        callback(error);
      });
    }

    this.router.all('*', function(req, res, next) {
      rules = this.rules.slice(0);
      run(req, res, next);
    }.bind(this));
  }

  addRule(method, path, callback) {
    method = (method || '').toLowerCase();
    let rule = this.existRule(method, path);
    if (rule) {
      rule.callback = callback || rule.callback || noop;
    } else {
      this.rules.push({ method, path, callback: callback || noop });
    }
    return this;
  }

  existRule(method, path) {
    const rules = this.rules;
    for (let i = 0, max = rules.length; i < max; i++) {
      let rule = rules[i];
      if (rule.method === method && rule.path === path) {
        return rule;
      }
    }
    return false;
  }

  clearRules() {
    this.rules = [];
    return this;
  }

  get(path, callback) {
    return this.addRule('get', path, callback);
  }

  post(path, callback) {
    return this.addRule('post', path, callback);
  }

  all(path, callback) {
    return this.addRule('all', path, callback);
  }
};


/**
 * Module dependencies.
 * @private
 */

const pathRegexp = require('path-to-regexp');
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */
function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = 'Failed to decode param \'' + val + '\'';
      err.status = err.statusCode = 400;
    }

    throw err;
  }
}

/**
 * Module exports.
 * @public
 */
class Layer {
  constructor(path, options) {
    if (!(this instanceof Layer)) {
      return new Layer(path, options);
    }

    const opts = options || {};

    this.params = undefined;
    this.path = undefined;
    this.regexp = pathRegexp(path, this.keys = [], opts);
    this.regexp.fast_slash = false;
    // if (path === '/' && opts.end === false) {
    //   this.regexp.fast_slash = true;
    // }
  }

  /**
   * Check if this route matches `path`, if so
   * populate `.params`.
   *
   * @param {String} path
   * @return {Boolean}
   * @api private
   */
  match(path) {
    if (path == null) {
      // no path, nothing matches
      this.params = undefined;
      this.path = undefined;
      return false;
    }

    if (this.regexp.fast_slash) {
      // fast path non-ending match for / (everything matches)
      this.params = {};
      this.path = '';
      return true;
    }

    var m = this.regexp.exec(path);

    if (!m) {
      this.params = undefined;
      this.path = undefined;
      return false;
    }

    // store values
    this.params = {};
    this.path = m[0];

    var keys = this.keys;
    var params = this.params;

    for (var i = 1; i < m.length; i++) {
      var key = keys[i - 1];
      var prop = key.name;
      var val = decode_param(m[i]);

      if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
        params[prop] = val;
      }
    }

    return true;
  }
}


module.exports = DynamicRouter;
