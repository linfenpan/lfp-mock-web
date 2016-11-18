'use strict';

module.exports = ['require1', 'combine', 'config', 'request', 'patBuilder', 'nunjucksBuilder', 'staticResource', 'toNunjucks', 'watcher', 'types'].reduce((res, file) => {
  res[file] = require(`./.lib/${file}`);
  return res;
}, {});

exports.util = require(`./.lib/common/util`);
