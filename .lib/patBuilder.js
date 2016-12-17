'use strict';
const fs = require('fs-extra');
const path = require('path');
const util = require('./common/util');
const config = require('./config');
const Builder = require('./builder/simpleBuilder');
const Thenable = require('thenablejs');
const nunjucks = require('nunjucks');
const toNunjucks = require('./toNunjucks');

const template = new nunjucks.Environment(new nunjucks.FileSystemLoader(process.cwd()), {
  tags: {
    blockStart: '{#',
    blockEnd: '#}',
    variableStart: '{{',
    variableEnd: '}}',
    commentStart: '{@',
    commentEnd: '@}'
  }
});

const defaultOptions = {
  HTMLENCODE: function(str) {
    return str;
  },
  __include: function(file, data) {
    const filePath = util.isFileExistAndGetName(config.TEMPLATE_SOURCE_DIRS, file);
    if (filePath) {
      let html;
      try {
        html = util.readFile(filePath, config.CODE);
        html = toNunjucks(html);
        return template.renderString(html, data || {});
      } catch (e) {
        console.error(e);
        console.log(file);
        console.log(html);
      }
    }
    return `<p>缺少文件 #${file}</p>`;
  },
  __comments: function(key) {
    return `<!--${key}-->`;
  }
};

// PAT 模板编译器
class PatBuilder extends Builder {
  static readFile(filePath) {
    let content = util.readFile(filePath, config.CODE);
    // 替换掉 include 的内容
    while (/<!--#CGIEXT#\s+expand\s+['"]?(.*?)['"]?\s*-->/.test(content)) {
      content = content.replace(/<!--#CGIEXT#\s+expand\s+['"]?(.*?)['"]?\s*-->/gm, function(str, pathInclude) {
        let realFilePath = util.isFileExistAndGetName(config.TEMPLATE_SOURCE_DIRS, pathInclude);
        if (realFilePath) {
          return util.readFile(realFilePath, config.CODE);
        }

        return `<h1>${pathInclude} not exist!!</h1>`;
      });
    }
    return content;
  }

  static *build(options) {
    yield super.build(options);

    const thenable = new Thenable();
    let nameTemplate = options.nameTemplate,
      dataDefault = options.dataDefault,
      req = options.req,
      res = options.res;

    // 读取模板文件
    nameTemplate = path.extname(nameTemplate) ? nameTemplate : nameTemplate + '.pat';
    const basenameTemplate = path.basename(nameTemplate, path.extname(nameTemplate));
    const filepath = util.isFileExistAndGetName(config.TEMPLATE_SOURCE_DIRS, `${nameTemplate}`);

    if (filepath) {
      let html = this.readFile(filepath);
      html = toNunjucks(html);

      let data = util.readMock(path.join(config.DATA_DIR, `${basenameTemplate}.js`), null, [req, res]);
      data = Object.assign({}, defaultOptions, dataDefault || {}, data || {});
      data.__ctx__ = data;
      try {
        const result = template.renderString(html, data);
        thenable.resolve({
          code: 200,
          content: result
        });
      } catch (e) {
        console.error(e);
        thenable.resolve({
          code: 500,
          content: `<html><head></head><body><pre>${html}</pre></body></html>`
        });
      }
    } else {
      thenable.resolve({
        code: 404,
        content: `<html><head></head><body><pre>模板不存在: ${nameTemplate}</pre></body></html>`
      });
    }

    return thenable;
  }

  static *after(data) {
    yield super.after(data);
    const res = data.res;
    if (res) {
      res.status(data.code || 200);
      res.send(data.content || '<html><head></head><body></body></html>');
    }
  }

  static run(req, res, nameTemplate, dataDefault) {
    const options = {
      nameTemplate,
      dataDefault,
      req, res,
      type: 'html'
    };

    return super.run(req, res, options);
  }
};


module.exports = {
  build: function(nameTemplate, res, dataDefault) {
    let req = null;
    if (typeof nameTemplate === 'object') {
      req = nameTemplate;
      nameTemplate = defaultData;
      defaultData = arguments[3] || {};
    }

    return PatBuilder.run(req, res, nameTemplate, dataDefault);
  },

  queryStaticResource(filepath, res, next) {
    return PatBuilder.queryStaticResource(filepath, res, next);
  }
};
