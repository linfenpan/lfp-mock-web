'use strict';
require('colors');
const fs = require('fs-extra');
const path = require('path');
const util = require('./common/util');

let output = {};
module.exports = output;

let DIR, DATA_DIR, CODE, PORT, ROUTER;
let TEMPORARY_DIR, TEMPLATE_TEMPORARY_DIR, TEMPLATE_SOURCE_DIRS, STATIC_TEMPORARY_DIR, STATIC_SOURCE_DIRS;

function reset(options) {
  const cwd = process.cwd();
  // { clean: false, router: '', config: '', port: 5555, openBrowser: false }
  options = Object.assign({  }, options || {});

  if ('port' in options) {
    output.PORT = options.port || 3000;
  }
  if ('clean' in options) {
    output.clean = options.clean;
  }
  if ('openBrowser' in options) {
    output.openBrowser = options.openBrowser;
  }

  if (!options.config) {
    return;
  }

  let config = {};
  const pathOfConf = path.resolve(cwd, options.config);

  if (fs.existsSync(pathOfConf)) {
    config = require(pathOfConf);
    // 路由地址
    ROUTER = path.resolve(cwd, options.router || './router.js');
    // 模板、脚本、样式在编译前的编码
    CODE = config.code || 'utf8';
    // 端口号
    PORT = options.port || PORT;
    // 模板根目录
    DIR = path.resolve(cwd, config.dir || './');
    // 数据文件目录
    DATA_DIR = path.resolve(cwd, config.data || './');
    // 临时文件目录
    TEMPORARY_DIR = config.temporary ? path.resolve(cwd, config.temporary) : path.resolve(cwd, './__tmp__');
    // 模板文件目录
    TEMPLATE_TEMPORARY_DIR = path.resolve(TEMPORARY_DIR, config.templateRoot || './');
    TEMPLATE_SOURCE_DIRS = (config.templates || []).map(item => path.resolve(DIR, item.from));
    // 静态文件目录
    STATIC_TEMPORARY_DIR = path.resolve(TEMPORARY_DIR, config.staticRoot || './__static__');
    STATIC_SOURCE_DIRS = (config.statics || []).map(item => util.isHttpURI(item.from) ? item.from : path.resolve(DIR, item.from));
  } else {
    console.warn(`can not find config file: "${pathOfConf}"`.red);
    return;
  }

  output.config = config;
  output.DIR = DIR;
  output.DATA_DIR = DATA_DIR;
  output.PORT = PORT;
  output.CODE = CODE;
  output.ROUTER = ROUTER;
  output.TEMPORARY_DIR = TEMPORARY_DIR;
  output.TEMPLATE_TEMPORARY_DIR = TEMPLATE_TEMPORARY_DIR;
  output.TEMPLATE_SOURCE_DIRS = TEMPLATE_SOURCE_DIRS;
  output.STATIC_TEMPORARY_DIR = STATIC_TEMPORARY_DIR;
  output.STATIC_SOURCE_DIRS = STATIC_SOURCE_DIRS;
}
reset();
output.reset = reset;
