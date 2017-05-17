'use strict';
const path = require('path');
const config = require('./config');
const Server = require('./server');

const mw = {
  _src: process.cwd(),
  _dest: path.join(process.cwd(), '_template'),
  config: config
};

// 启动服务器，设置端口、是否开启 livereload、是否使用 Https 之类的
mw.createServer = function (opts) {
  return new Server(opts);
}

require('./adaptor')(mw);

module.exports = mw;
