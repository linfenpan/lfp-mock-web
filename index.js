'use strict';
const Thenable = require('thenablejs');

const output = ['require1', 'combine', 'config', 'request', 'patBuilder', 'nunjucksBuilder', 'staticResource', 'toNunjucks', 'watcher', 'types'].reduce((res, file) => {
  res[file] = require(`./.lib/${file}`);
  return res;
}, {});

output.util = require(`./.lib/common/util`);

output.queryTemplate = function(name) {
  const ctx = this;
  const util = ctx.util;
  const config = ctx.config;
  return util.isFileExistAndGetName(config.TEMPLATE_SOURCE_DIRS, name);
};

output.queryResource = function(name) {
  const ctx = this;
  const util = ctx.util;
  const config = ctx.config;
  return util.isFileExistAndGetName(config.STATIC_SOURCE_DIRS, name);
};

module.exports = output;
