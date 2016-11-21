'use strict';

const SimpleRouter = require('./.lib/SimpleRouter');
const express = require('express');
const require1 = require('./.lib/require1');
const watcher = require('./.lib/watcher');
const config = require('./.lib/config');
const colors = require('colors');
const reload = require('reload');
const path = require('path');
const util = require('./.lib/common/util');
const pkg = require('./package.json');
const app = express();
const fs = require('fs');
const os = require('os');

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
  // 监听端口
  // 尝试列出所有 ip 地址
  // 打开第一个 ip 地址链接
  const server = app.listen(port, () => {
    const port = server.address().port;
    console.log(`listening port: ${port}`.green);

    const ifaces = os.networkInterfaces();
    let firstAddress;
    Object.keys(ifaces).forEach(key => {
      ifaces[key].forEach(details => {
        if (details.family === 'IPv4') {
          if (!firstAddress) {
            firstAddress = 'http://' + details.address + ':' + port;
          }
          console.log(('  http://' + details.address + ':' + port).green);
        }
      });
    });
    if (firstAddress && config.openBrowser) {
      util.openBrowser(firstAddress, function() {
        console.log(`open: ${firstAddress}`.green.bold);
      });
    }
    console.log('Hit CTRL-C to stop the server');
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
  require('./.lib/tmpDirMiddleware').init(function(type, path) {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      console.log(`${type}: ${path}`.gray);
      reloadWeb();
    }, 10);
  });

  // 监听数据文件变化
  watcher.watch([config.DATA_DIR], reloadWeb);
  // 监听路由文件变化
  if (config.ROUTER && fs.existsSync(config.ROUTER)) {
    console.log(`watching route file: ${path.basename(config.ROUTER)}`.green);
    simpleRouter.combine(require1(config.ROUTER));
    watcher.watch(config.ROUTER, path => {
      simpleRouter.combine(require1(config.ROUTER));
      reloadWeb();
    });
  }
}
