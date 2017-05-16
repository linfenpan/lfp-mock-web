'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const express = require('express');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const util = require('./util');
const require1 = require('./common/require1');
const chokidar = require('chokidar');
const DynamicRouter = require('./server/router/dynamic');


class Server {
  constructor(opts) {
    this.opts = Object.assign({ port: 3000, limit: '50mb', favicon: '', livereload: true }, opts || {});
    this.app = express();
    this.initMiddleware();
    this.initDynamicRouter();
    this.hadStart = false;
  }

  initMiddleware() {
    const app = this.app,
      opts = this.opts;

    if (opts.favicon !== false) {
      app.use(favicon(opts.favicon || path.join(__dirname, '../image', 'favicon.ico')));
    }

    app.use(bodyParser.json({limit: opts.limit}));
    app.use(bodyParser.urlencoded({ extended: false, limit: opts.limit }));
    app.use(cookieParser());

    if (opts.livereload) {
      this.addLiverelaod();
    }

    return this;
  }

  initDynamicRouter() {
    this.dynamicRouter = new DynamicRouter();
    this.app.use('/', this.dynamicRouter.router);

    return this;
  }

  addLiverelaod() {
    const app = this.app;
    const url = '/.public/reload';
    const reloader = this.reloader = require('./server/reload/reload')(url);

    // url 作为轮询地址
    app.get(url, reloader.request);
    // 注入 轮询 代码
    app.use(reloader.inject);
  }

  reload () {
    if (this.reloader) {
      this.reloader.reload();
    }
  }

  // 设置静态文件访问规则，及路径
  setStatic(file, dirname) {
    this.app.use(file || '/static', express.static(dirname));
    return this;
  }

  addMiddleware(middleware) {
    this.app.use(middleware);
    return this;
  }

  // 更新路由访问规则，如: server.addRule('get', '/', function(req, res, next) {});
  addRule(type, url, fn) {
    this.dynamicRouter.addRule(type, url, fn);
    return this;
  }

  get(url, fn) {
    return this.addRule('get', url, fn);
  }

  post(url, fn) {
    return this.addRule('post', url, fn);
  }

  all(url, fn) {
    return this.addRule('all', url, fn);
  }

  // TODO 添加转发
  transmit(url, callback) {

  }

  // 添加路由文件，整个路由文件，应该接受监听，如果其中一个路由更变了，应该按顺序更新所有路由规则
  addRouterRile(filepath) {
    console.log('增加路由监听:' + filepath);
    if (!this.filesRouter) { this.filesRouter = []; }

    if (fs.existsSync(filepath)) {
      this.filesRouter.push(filepath);
    } else {
      console.log(chalk.red(`路由文件: ${filepath} 不存在`));
    }

    this.updateAllRouter();

    return this;
  }

  updateAllRouter() {
    if (!this.filesRouter || this.filesRouter.length <= 0) { return; }

    const watcher = this.watcherRouter
      || (this.watcherRouter = chokidar.watch([]));

    const files = this.filesRouter;
    const updateByFile = function() {
      files.forEach((filepath) => {
        if (fs.existsSync(filepath)) {
          const router = require1(filepath, process.cwd());
          if (util.type(router) != 'object') {
            return console.log(chalk.red(`路由文件返回内容必须是对象，本次忽略此文件: ${filepath}`));
          }
          Object.keys(router).forEach(key => {
            // key => GET /*.html
            let params = key.split(' ');
            let type = params[0].toLowerCase();
            let url = params[1].toLowerCase();
            this.addRule(type, url, router[key]);
          });
        } else {
          console.log(chalk.red(`路由文件: ${filepath} 不存在`));
        }
      });
      // 路由更新完毕后，刷新页面
      this.reload();
    }.bind(this);

    updateByFile();
    watcher.unwatch(files);
    watcher.add(files);
    watcher.on('change', (filepath) => {
        console.log(chalk.green(`路由文件被更新: ${filepath}`));
        updateByFile();
      });

    return this;
  }

  start() {
    if (this.hadStart) { return this; }
    const app = this.app;
    app.use((req, res, next) => {
      res.status(404).send('<html><head><title>404</title></head><body>404</body></html>');
    });

    this.hadStart = true;
    const port = this.opts.port;
    app.listen(port, function() {
      let ips = util.getIps();
      let firstAddress = `http://${ips[0]}:${port}`;
      ips.forEach(ip => {
        console.log(chalk.green('  http://' + ip + ':' + port));
      });
      console.log(chalk.green.bold('Hit CTRL-C to stop the server'));
    });

    return this;
  }
}

module.exports = Server;
