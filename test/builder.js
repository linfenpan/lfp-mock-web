'use strict';
const mocker = require('../index');
const co = require('co');
const fs = require('fs-extra');

class Builder {
  constructor() {

  }

  static initRouter (router) {
    router.combine({
      ['GET *.:ext'] (req, res, next) {
        const ext = req.params.ext.toLowerCase();
        if (['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'txt', 'less', 'scss'].indexOf(ext) >= 0) {
          staticResource.query(req, res, next);
        } else {
          next();
        }
      }
    });
  }

  static *beforeBuild (options) { }
  static *build (options) { }
  static *afterBuild (options) {
    if (options && options.type === 'html' && options.res && options.res.set) {
      options.res.set('content-type', 'text/html');
    }
    console.log('base after builder');
  }
  static run (req, res, options) {
    const ctx = this;
    const middle = Object.assign(options || {}, { req, res });

    return new Promise((resolve, reject) => {
      co(function*() {
        Object.assign(middle, yield this.beforeBuild(middle) || {});
        Object.assign(middle, yield this.build(middle) || {});
        Object.assign(middle, yield this.afterBuild(middle) || {});

        resolve(middle);
      }.bind(this));
    });
  }

  static queryTemplateByName (templateName) {
    let template = mocker.queryTemplate(templateName);
    if (template) {
      return fs.readFileSync(template);
    }
    return null;
  }
}

module.exports = Builder;
