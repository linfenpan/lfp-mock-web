'use strict';

const SimpleRouter = require('./.lib/SimpleRouter');
const express = require('express');
const require1 = require('./.lib/require1');
const watcher = require('./.lib/watcher');
const config = require('./.lib/config');
const colors = require('colors');
const reload = require('reload');
const path = require('path');
const pkg = require('./package.json');
const app = express();
const fs = require('fs');

const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/.public/', express.static(path.join(__dirname, '.public')));

// 注入重新加载的脚本
app.use(require('./.lib/connect')({
  injects: [
    '<script src="/.public/reload.js"></script>'
  ]
}));

// 注入自动重启的路由
const router = express.Router();
app.use('/', router);
const simpleRouter = new SimpleRouter(router, {
  'GET /test': 'test success'
});

app.use((req, res, next) => {
  res.send(404, 'can not find anything');
});

exports.start = function(port) {
  const server = app.listen(port, () => {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Example app listening at port:%s'.bold.green, port);
  });

  const reloadServer = reload(server, app);

  function reloadWeb() {
    // 刷新太快, ws 会挂掉~
    try {
      reloadServer.reload();
    } catch(e) {
      console.log('ignore one reload');
    }
  }

  // 监听所有需要的地方
  let reloadTimer;
  require('./.lib/tmpDirMiddleware').init(function(path) {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      console.log(`change: ${path}`.gray);
      reloadWeb();
    }, 10);
  });

  // 监听数据文件变化
  watcher.watch([config.DATA_DIR], reloadWeb);

  if (config.ROUTER && fs.existsSync(config.ROUTER)) {
    console.log(`watching route file: ${path.basename(config.ROUTER)}`.green);
    simpleRouter.combine(require1(config.ROUTER));
    watcher.watch(config.ROUTER, path => {
      simpleRouter.combine(require1(config.ROUTER));
      reloadWeb();
    });
  }
}
