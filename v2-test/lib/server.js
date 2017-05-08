'use strict';

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const util = require('./util');


class Server {
  constructor(opts) {
    this.opts = Object.assign({ port: 3000, limit: '50mb', favicon: '', livereload: true }, opts || {});
    this.app = express();
    this.initMiddleware();
  }

  initMiddleware() {
    const app = this.app,
      opts = this.opts;

    if (opts.favicon !== false) {
      app.use(favicon(opts.favicon || path.join(__dirname, '../images', 'favicon.ico')));
    }

    app.use(bodyParser.json({limit: opts.limit}));
    app.use(bodyParser.urlencoded({ extended: false, limit: opts.limit }));
    app.use(cookieParser());

    if (opts.livereload) {
      this.addLiverelaod();
    }

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

  start() {
    const app = this.app;
    app.use((req, res, next) => {
      res.send(404, 'can not find anything');
    });

    const port = this.opts.port;
    app.listen(port, function() {
      let ips = util.getIps();
      let firstAddress = `http://${ips[0]}:${port}`;
      ips.forEach(ip => {
        console.log(chalk.green('  http://' + ip + ':' + port));
      });
      // if (firstAddress && config.openBrowser) {
      //   let url = typeof config.openBrowser === 'string' ? path.join(firstAddress, './', config.openBrowser) : firstAddress;
      //   util.openBrowser(url, function() {
      //     console.log(`open: ${firstAddress}`.green.bold);
      //   });
      // }
      console.log(chalk.green.bold('Hit CTRL-C to stop the server'));
    });

    return this;
  }
}

module.exports = Server;
