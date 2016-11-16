'use strict';
const toNunjucks = require('./toNunjucks');
const nunjucks = require('nunjucks');
const path = require('path');
const util = require('./common/util');
const fs = require('fs-extra');

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
    const filePath = util.isFileExistAndGetName(config.TEMPLATE_SOURCE_DIRS, `${name}.pat`);
    console.log(filePath);
    if (filePath) {
      let html = readFile(filePath);
      html = toNunjucks(html);

      let data = util.readMock(path.join(config.DATA_DIR, `${name}.js`));
      data = Object.assign({}, defaultOptions, defaultData || {}, data || {});
      data.__ctx__ = data;

      try {
        const result = template.renderString(html, data);
        res.set('content-type', 'text/html');
        res.send(result);
      } catch (e) {
        console.error(e);
        res.set('content-type', 'text/html');
        res.status(500).send(`<html><head></head><body><pre>${html}</pre></body></html>`);
      }
    } else {
      res.send(404, `can not find ${name}`);
    }
  }
};
