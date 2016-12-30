'use strict';
const Thenable = require('thenablejs');

const output = ['require1', 'combine', 'config', 'request', 'patBuilder', 'nunjucksBuilder', 'staticResource', 'toNunjucks', 'watcher', 'types'].reduce((res, file) => {
  res[file] = require(`./.lib/${file}`);
  return res;
}, {});

output.util = require('./.lib/common/util');
output.Builder = require('./.lib/builder/builder');
output.SimpleBuilder = require('./.lib/builder/simpleBuilder');

output.queryTemplate = function(name, dirs) {
  const ctx = this;
  const util = ctx.util;
  const config = ctx.config;
  return util.isFileExistAndGetName(dirs || config.TEMPLATE_SOURCE_DIRS, name);
};

output.queryResource = function(name) {
  const ctx = this;
  const util = ctx.util;
  const config = ctx.config;
  return util.isFileExistAndGetName(config.STATIC_SOURCE_DIRS, name);
};

/**
  * 初始化配置
  * @param {Object} [options] {port: 端口号, config: 配置文件, router: 路由文件, clean: 是否自动清理临时目录, openBrowser: 打开浏览器}
*/
output.initConfig = function(options) {
  this.config.reset(Object.assign({
    config: null,
    router: null
  }, options || {}));
};

/**
  * 启动 express
  * 一定要在调用 initConfig 之后使用
*/
output.startExpress = function() {
  require('./app').start(this.config.PORT);
};

module.exports = output;
