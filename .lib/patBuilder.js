'use strict';
const toNunjucks = require('./toNunjucks');
const nunjucks = require('nunjucks');
const path = require('path');
const util = require('./common/util');
const fs = require('fs-extra');
const Thenable = require('thenablejs');

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

const config = require('./config');

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

function readFile(filePath) {
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

module.exports = {
  build: function(name, res, defaultData) {
    // 读取模板文件
    name = path.extname(name) ? name : name + '.pat';
    const basename = path.basename(name, path.extname(name));
    const filePath = util.isFileExistAndGetName(config.TEMPLATE_SOURCE_DIRS, `${name}`);
    const thenable = new Thenable();

    if (!util.isResponseObject(res)) {
      defaultData = res;
      res = null;
    }

    if (filePath) {
      let html = readFile(filePath);
      html = toNunjucks(html);

      let data = util.readMock(path.join(config.DATA_DIR, `${basename}.js`));
      data = Object.assign({}, defaultOptions, defaultData || {}, data || {});
      data.__ctx__ = data;

      try {
        const result = template.renderString(html, data);
        thenable.resolve({
          content: result
        });
      } catch (e) {
        console.error(e);
        thenable.reject({
          code: 500,
          content: `<html><head></head><body><pre>${html}</pre></body></html>`
        });
      }
    } else {
      thenable.reject({
        code: 404,
        content: `<html><head></head><body><pre>can not find ${name}</pre></body></html>`
      });
    }

    thenable.then(
      (data) => {
        if (res) {
          res.set('content-type', 'text/html');
          res.status(data.code || 200).send(data.content.trim() || '<html><head></head><body></body></html>');
        }
      },
      (error) => {
        if (res) {
          res.set('content-type', 'text/html');
          res.status(error.code || 404).send(error.content);
        }
      }
    );

    return thenable;
  }
};
