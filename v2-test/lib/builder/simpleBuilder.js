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

  static requestStatic (req, res, next) {
    require('../../index').requestStatic(req, res, next);
  }
};

module.exports = SimpleBuilder;
