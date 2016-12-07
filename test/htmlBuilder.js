'use strict';

const path = require('path');
const mocker = require('../index');

mocker.initConfig({
  config: path.resolve(__dirname, './config.json'),
  openBrowser: false,
  clean: false
});


const Builder = require('./builder');
class HtmlBuilder extends Builder {
  static *beforeBuild (options) {
    yield super.beforeBuild(options);

    if (options.html) {
      options.html = '<!-- create by da宗熊 -->\n' + options.html;
    }
    console.log('before build');
  }

  static *build (options) {
    yield super.build(options);

    console.log('build');
  }

  static *afterBuild (options) {
    yield super.afterBuild(options);

    console.log('after build');
    if (options.html) {
      options.html += '\n<!-- happy ending -->';
    }
  }

  static run (req, res, next, templateName) {
    let stream = super.queryTemplateByName(templateName);

    if (stream) {
      super.run(req, res, { html: stream.toString() })
        .then(result => {
          console.log(result);
        });
    } else {
      next();
    }
  }
}

HtmlBuilder.run(null, null, function() { console.log('can\'t find anything') }, 'test.html');
