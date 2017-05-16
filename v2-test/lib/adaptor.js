'use strict';
/** 适配以前版本的命令行 + 配置文件 */
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const util = require('./util');
const chokidar = require('chokidar');

module.exports = function(mw) {
  bindInintConf(mw);
  bindUtils(mw);
};

// 后面的所有数据，通过 mw.conf 来驱动
function bindInintConf(mw) {
  const getDefaultConf = function() {
    return {
      port: 3000,
      code: 'utf8',
      // 编译项目的绝对路径
      dir: process.cwd(),
      // 配置文件
      config: path.join(process.cwd(), './config.json'),
      // 路由文件
      router: path.join(process.cwd(), './router.js'),
      // 数据文件保存目录
      data: path.join(process.cwd(), './data'),
      // 临时文件保存目录
      temporary: path.join(process.cwd(), './__tmp__'),
      // 静态文件，在临时目录下，保存的相对路径
      staticRoot: './__static__',
      // 模板文件，在临时目录下，保存的相对路径
      templateRoot: './__template__',
      clean: true,
      livereload: true,
      openBrowser: false
    };
  };

  let hadInit = false;
  mw.config = mw.conf = getDefaultConf();
  mw.initConfig = mw.initConf = function(conf) {
    if (hadInit) {
      throw new Error('禁止调用多次 inintConfig 方法');
    }
    hadInit = true;

    mw.conf = Object.assign(getDefaultConf(), conf || {});
    mw.mockweb = new OldMockWeb(mw);
    return mw.mockweb;
  };
}

function bindUtils(mw) {
  // Builder, SimpleBuilder, queryTemplate, queryResource, request, require1, watcher
}

class OldMockWeb {
  constructor(mw) {
    this.mw = mw;
    const conf = this.config = this.conf = mw.conf;

    // 监听 config.js 文件，如果有更变，则自动重新编译 config.js
    if (!fs.existsSync(conf.config)) { throw new Error(`配置文件，必须存在: ${conf.config}`); }
    this.initByConf();
    this.watchConf();

    // 创建服务器
    this.initServer();

    // 监听 router.js 文件，如果有更变，则自动重新加载路由
    this.initRouter();
  }

  initByConf() {
    const conf = this.conf;
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(conf.config).toString());
    } catch (e) {
      console.log(chalk.red('配置文件格式有问题'));
      console.log(e.stack || e.message);
      return;
    }
    Object.assign(conf, data);

    // 兼容以前代码!!
    const cwd = process.cwd();
    conf.CODE = conf.code;
    conf.ROUTER = conf.router = path.resolve(cwd, conf.router);
    conf.PORT = conf.port;
    conf.DIR = path.resolve(cwd, conf.dir);
    // 数据文件目录
    conf.DATA_DIR = path.resolve(cwd, conf.data);
    // 临时文件目录
    conf.TEMPORARY_DIR = path.resolve(cwd, conf.temporary);
    // 模板文件目录
    conf.TEMPLATE_TEMPORARY_DIR = path.resolve(conf.TEMPORARY_DIR, conf.templateRoot);
    conf.TEMPLATE_SOURCE_DIRS = (conf.templates || []).map(item => path.resolve(conf.DIR, item.from));
    // 静态文件目录
    conf.STATIC_TEMPORARY_DIR = path.resolve(conf.TEMPORARY_DIR, conf.staticRoot);
    conf.STATIC_SOURCE_DIRS = (conf.statics || []).map(item =>
        util.isHttpURI(item.from) ? item.from : path.resolve(conf.DIR, item.from)
      );

    this.copyResourceAndWatch();

    return this;
  }

  watchConf() {
    chokidar.watch(this.conf.config)
      .on('change', () => {
        if (this.initByConf()) {
          console.log(chalk.green('配置文件更新成功'));
          this.reload();
        }
      });
    return this;
  }

  copyResourceAndWatch() {
    const context = this;
    const conf = this.conf;
    const list = [].concat(conf.TEMPLATE_SOURCE_DIRS, conf.STATIC_SOURCE_DIRS)
      .filter(filepath =>
        !util.isHttpURI(filepath)
      );

    // 已经监听过的，不要重复监听了
    if (!this._resouceWatchMap) {
      this._resouceWatchMap = {};
    }
    const watchMap = this._resouceWatchMap;

    const object2Array = function(obj) {
      if (util.type(obj) === 'object') {
        let map = obj;
        obj = Object.keys(map).map((key) => {
          return { from: key, to: map[key] };
        });
      }
      return obj;
    };

    const getRelativePath = function(filepath, dirname) {
      return path.relative(dirname, filepath);
    }

    const addWatch = function(list, toDir) {
      (list || []).forEach(data => {
        let from = path.resolve(conf.DIR, data.from);
        let to = path.resolve(toDir, data.to || './');

        // 已经监听过的，忽略吧
        if (watchMap[from + ' ' + to]) {
          return;
        }
        // 监听当前文件
        chokidar.watch(from, { awaitWriteFinish: true })
          .on('add', (filepath) => {
            fs.copySync(from, to);
            context.reload();
          })
          .on('change', (filepath) => {
            fs.copySync(from, to);
            context.reload();
          })
          .on('unlink', (filepath) => {
            if (fs.existsSync(to)) {
              fs.removeSync(to);
            }
            fs.copySync(from, to);
            context.reload();
          });
      });
    };

    const templates = object2Array(conf.templates || []);
    const statics = object2Array(conf.statics || []).filter(item => !util.isHttpURI(item.from));

    addWatch(templates, conf.TEMPLATE_TEMPORARY_DIR);
    addWatch(statics, conf.STATIC_TEMPORARY_DIR);
  }

  initServer() {
    const conf = this.conf;
    const server = this.server = this.mw.createServer({
      port: conf.port,
      livereload: conf.livereload
    });

    // 静态文件访问路径
    server.setStatic('/', conf.STATIC_TEMPORARY_DIR);

    return this;
  }

  initRouter() {
    if (this.conf.router) {
      this.server.addRouterRile(this.conf.router);
    }
    return this;
  }

  reload() {
    if (this.server) {
      this.server.reload();
    }
  }

  start() {
    if (this.server) {
      this.server.start();
    }
  }
}
