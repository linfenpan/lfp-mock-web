'use strict';

const G = require('../index');

// 如果实在有必要编写，可以考虑 require 一个外部的板块
module.exports = {
  // 配置 get 请求，访问规则为: /xxx.html
  'GET /:page.html': function(req, res, next) {
    res.set('Content-Type', 'text/html');
    res.send('<html><head></head><body>xx</body></html>');
  }
};
