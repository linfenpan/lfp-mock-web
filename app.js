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

const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use('/.public/', express.static(path.join(__dirname, '.public')));

// 注入重新加载的脚本
const reloadContent = fs.readFileSync(path.resolve(__dirname, './.public/reload_inline.js')).toString();
const reloader = {
  list: [],
  lastModifyTime: Date.now(),
  pushResponse (res) {
    this.list.push(res);
  },
  removeResponse (res) {
    let index = this.list.indexOf(res);
    if (index >= 0) {
      this.list.splice(index, 1);
    }
    return index;
  },
  sendModifyTime (res) {
    res.send({ time: this.lastModifyTime });
  },
  reload: function() {
    this.lastModifyTime = Date.now();
    let res = this.list.pop();
    while (res) {
      this.sendModifyTime(res);
      res = this.list.pop();
    }
  },
}
app.get('/.public/reload', function(req, res, next) {
  if (req.query.last) {
    reloader.pushResponse(res);
    setTimeout(function() {
      if (reloader.removeResponse(res) >= 0) {
        res.send({});
      }
    }, 3000);
  } else {
    reloader.sendModifyTime(res);
  }
});
app.use(require('./.lib/connect')({
  injects: [
    '<script>'+ reloadContent +'</script>'
  ]
}));

// 注入自动重启的路由
const router = express.Router();
app.use('/', router);
const simpleRouter = new SimpleRouter(router, {
  // 'GET /test': 'test success'
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

    let ips = util.getIps();
    let firstAddress = `http://${ips[0]}:${port}`;
    ips.forEach(ip => {
      console.log(('  http://' + ip + ':' + port).green);
    });
    if (firstAddress && config.openBrowser) {
      let url = typeof config.openBrowser === 'string' ? path.join(firstAddress, './', config.openBrowser) : firstAddress;
      util.openBrowser(url, function() {
        console.log(`open: ${firstAddress}`.green.bold);
      });
    }
    console.log('Hit CTRL-C to stop the server');
  });


  function reloadWeb() {
    reloader.reload();
  }

  // 监听模板、静态资源
  require('./.lib/tmpDirMiddleware').init(function(type, path) {
    console.log(`${type}: ${path}`.gray);
    reloadWeb();
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
