'use strict';
const Builder = require('./builder');
const path = require('path');
const fs = require('fs-extra');

class SimpleBuilder extends Builder {
  constructor() { }
  static *after (options) {
    yield super.after(options);
    if (options && options.res && options.type === 'html') {
      let res = options.res;
      res.set && res.set('content-type', 'text/html');
    }
  }

  static queryStaticResource (filepath, res, next) {
    // 有些奇怪的地址，类似: a.js?xxx ; //b.js，这些都是无法正确识别的
    filepath = (typeof filepath === 'string' ? filepath : filepath.url).replace(/[#?].*$/, '').replace(/^\/{2,}/, '/');
    const ext = (path.extname(filepath || '') || '').toLowerCase().slice(1);
    if (['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'txt', 'less', 'scss'].indexOf(ext) >= 0) {
      StaticResource.query(filepath, res);
    } else {
      next();
    }
  }
};

module.exports = SimpleBuilder;
