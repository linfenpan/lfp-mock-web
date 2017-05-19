'use strict';
const path = require('path');
const Server = require('./server');

const mw = { x: 1 };

// 启动服务器，设置端口、是否开启 livereload、是否使用 Https 之类的
mw.createServer = function (opts) {
  return new Server(opts);
}

require('./adaptor')(mw);

module.exports = mw;
