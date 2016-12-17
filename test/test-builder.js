'use strict';

const path = require('path');
const Mocker = require('../index');
const Builder = require('../.lib/builder/simpleBuilder');

Mocker.initConfig({
  config: path.resolve(__dirname, './config.json'),
  openBrowser: false,
  clean: false
});

class HtmlBuilder extends Builder {
  static *before (options) {
    yield super.before(options);

    if (options.html) {
      options.html = '<!-- create by da宗熊 -->\n' + options.html;
    }
    console.log('before build');
  }

  static *build (options) {
    yield super.build(options);
    console.log('build');
  }

  static *after (options) {
    yield super.after(options);
    console.log('after build');
    if (options.html) {
      options.html += '<!-- happy ending -->';
    }
  }

  static run (req, res, next, templateName) {
    let stream = super.queryTemplateByName(templateName);

    if (stream) {
      super.run(req, res, { html: stream.toString() })
        .then(result => {
          console.log(result.html);
        });
    } else {
      next();
    }
  }
};

HtmlBuilder.run(null, null, function() { console.log('can\'t find anything') }, 'test.html');
