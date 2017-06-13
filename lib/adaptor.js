'use strict';
/** 适配以前版本的命令行 + 配置文件 */
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const util = require('./util');
const download = require('download');
const chokidar = require('chokidar');
const isGlob = require('is-glob');
const globParent = require('glob-parent');

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
  mw.initConfig = mw.createServerByConf = function(conf) {
    if (hadInit) {
      throw new Error('禁止调用多次 inintConfig || createServerByConf 方法');
    }
    hadInit = true;

    mw.conf = mw.config = Object.assign(getDefaultConf(), conf || {});
    mw.mockweb = new OldMockWeb(mw);
    return mw.mockweb;
  };
}

function bindUtils(mw) {
  mw.Builder = require('./builder/builder');
  mw.SimpleBuilder = require('./builder/simpleBuilder');
  mw.nunjucksBuilder = mw.jinjaBuilder = require('./builder/jinja/builder');
  mw.patBuilder = require('./builder/pat/builder');

  mw.require1 = require('./common/require1');
  mw.combine = require('./common/combine');
  mw.request = require('./common/request');
  mw.proxy = require('http-proxy-middleware');
  mw.util = util;

  // 在静态目录，寻找静态资源，如果找不到，则开始找外部域名目录
  mw.requestStatic = function(req, res, next) {
    // 查找静态文件，有问题，需要改为从该目录，寻找文件，如果文件存在，则返回，否则，忽略之~
    // 有些奇怪的地址，类似: a.js?xxx ; //b.js，这些都是无法正确识别的
    let url = (typeof req === 'string' ? req : req.url).replace(/[#?].*$/, '').replace(/^\/{2,}/, '/').replace(/^\/+/, '');
    let filepath = path.join(mw.conf.STATIC_TEMPORARY_DIR, './' + url);

    if (fs.existsSync(filepath)) {
      sendFile(res, filepath, mw.conf.CODE);
    } else {
      // 寻找是否有外部绝对路径，如果有，则去绝对路径下载资源，下载之后，保存到临时目录，然后返回客户端
      const dirUrls = mw.conf.STATIC_SOURCE_DIRS.filter(url => util.isHttpURI(url));
      downloadAndSaveImage(dirUrls, url, mw.conf.STATIC_TEMPORARY_DIR, (err, filepath) => {
        if (err) {
          next();
        } else {
          sendFile(res, filepath, mw.conf.CODE);
        }
      });
    }
  };

  // 在临时目录，寻找模板
  mw.queryTemplate = function(filename) {
    return util.isFileExistAndGetName(mw.conf.TEMPLATE_TEMPORARY_DIR, filename);
  };
}

// 下载及保存文件
// @param {Array} [dirUrls] 外部目录链接列表
// @param {String} [filename] 文件名字
// @param {String} [savedir] 需要保存的目录
// @param {Function} [callback] 结果回调，callback(error, filepath);
function downloadAndSaveImage(dirUrls, filename, savedir, callback) {
  const dir = dirUrls.shift();
  if (dir) {
    const url = (/\/$/.test(dir) ? dir : dir + '/') + (/^\//.test(filename) ? filename.replace(/^\/*/, '') : filename);
    console.log(chalk.cyan('download:' + url));
    download(url).then(
      (data) => {
        const filepath = path.join(savedir, './' + filename);
        fs.ensureFileSync(filepath);
        fs.writeFileSync(filepath, data);
        callback(null, filepath);
      },
      (err) => {
        downloadAndSaveImage(dirUrls, filename, savedir, callback);
      }
    );
  } else {
    callback(404);
  }
}

// 根据编码，发送文件
function sendFile(res, filepath, code) {
  // 如果是脚本、或者样式，发现编码不正确，应该修正之~~~~
  const extname = path.extname(filepath).slice(1);
  res.type(extname);
  const contentType = res.get('content-type');
  
  if (fs.existsSync(filepath) && (extname == 'js' || extname == 'css' || /text/.test(contentType))) {
    // 进行 gbk 和 utf8 转码
    const codes = ['utf8', 'gbk'];
    code && codes.push(code);
    const content = util.readFile(filepath, codes);
    res.send(content);
  } else {
    res.sendFile(filepath);
  }
}

// 配置对象，转为为数组
//  { from: '', to: '' }      => { from: '', to: '' }
//  './xxx'                   => { from: './xxx', to: '' }
//  { './x': '', './y': '' }  => [ { from: './x', to: '' }, { from: './y', to: '' } ]
const confObject2Array = function(obj) {
  const type = util.type(obj);
  if (type === 'object') {
    let map = obj;
    return Object.keys(map).map((key) => {
      return { from: key, to: map[key] };
    });
  } else if (type === 'array'){
    const result = [];
    obj.forEach((item) => {
      switch (util.type(item)) {
        case 'string':
          result.push({ from: item, to: '' });
          break;
        case 'object':
          if (item.from) {
            result.push({ from: item.from, to: item.to });
          } else {
            Object.keys(item).forEach(key => result.push({ from: key, to: item[key] }));
          }
          break;
      }
    });
    return result;
  }

  return [];
};

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

    // 监听数据文件
    this.watchMockData();

    // 清空临时目录
    if (this.conf.clean) {
      this.cleanAfterExit();
    }
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
    conf.ROUTER = path.resolve(cwd, conf.router);
    conf.PORT = conf.port;
    conf.DIR = path.resolve(cwd, conf.dir);
    // 数据文件目录
    conf.DATA_DIR = path.resolve(cwd, conf.data);
    // 临时文件目录
    conf.TEMPORARY_DIR = path.resolve(cwd, conf.temporary);
    // 模板文件目录
    conf.TEMPLATE_TEMPORARY_DIR = path.resolve(conf.TEMPORARY_DIR, conf.templateRoot);
    conf.TEMPLATE_SOURCE_DIRS = confObject2Array(conf.templates || []).map(item => path.resolve(conf.DIR, item.from));
    // 静态文件目录
    conf.STATIC_TEMPORARY_DIR = path.resolve(conf.TEMPORARY_DIR, conf.staticRoot);
    conf.STATIC_SOURCE_DIRS = confObject2Array(conf.statics || []).map(item =>
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

    // 已经监听过的，不要重复监听了
    if (!this._resouceWatchMap) {
      this._resouceWatchMap = {};
    }
    const watchMap = this._resouceWatchMap;

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

        let is_glob_expr = isGlob(from) || !fs.existsSync(from);
        let copyAndReload = function(filepath) {
          if (is_glob_expr) {
            const dirParent = globParent(from);
            const filepathRelative = path.relative(dirParent, filepath);
            fs.copySync(filepath, path.join(to, filepathRelative));
          } else {
            const dirParent = from;
            const filepathRelative = path.relative(dirParent, filepath);
            fs.copySync(filepath, path.join(to, filepathRelative));
          }
          context.reload();
        }

        if (!is_glob_expr && fs.existsSync(from)) {
          console.log(chalk.green(`copy from: ${from}`));
          // 目录 -> 目录，文件 -> 文件
          if (path.extname(from)) {
            if (path.extname(to)) {
              fs.copySync(from, to);
            } else {
              fs.copySync(from, path.join(to, path.basename(from)));
            }
          } else {
            fs.copySync(from, to);
          }
        }

        // 监听当前文件
        chokidar.watch(from, { ignoreInitial: is_glob_expr ? false : true })
          .on('add', function(filepath) {
            if (is_glob_expr) {
              console.log(chalk.green(`copy from: ${filepath}`));
            }
            copyAndReload(filepath);
          })
          .on('change', function(filepath) {
            console.log('file change');
            copyAndReload(filepath);
          })
          .on('unlink', function(filepath) {
            if (is_glob_expr) {
              const dirParent = globParent(from);
              const filepathRelative = path.relative(dirParent, filepath);
              const filepathTo = path.join(to, filepathRelative);
              fs.existsSync(filepathTo) && fs.removeSync(filepathTo);
            } else {
              let filepathRelative = path.relative(from, filepath);
              if (!filepathRelative) {
                filepathRelative = path.basename(filepath);
              }
              const filepathTo = path.join(to, filepathRelative);
              fs.existsSync(filepathTo) && fs.removeSync(filepathTo);
            }
            context.reload();
          });
      });
    };

    const templates = confObject2Array(conf.templates || []);
    const statics = confObject2Array(conf.statics || []).filter(item => !util.isHttpURI(item.from));

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
    server.setStatic('/.static', conf.STATIC_TEMPORARY_DIR);

    return this;
  }

  initRouter() {
    if (this.conf.ROUTER) {
      this.server.addRouterRile(this.conf.ROUTER);
    }
    return this;
  }

  watchMockData() {
    if (this.conf.DATA_DIR && fs.existsSync(this.conf.DATA_DIR)) {
      chokidar.watch(this.conf.DATA_DIR)
        .on('change', () => {
          this.reload();
        });
    }

    return this;
  }

  reload() {
    clearTimeout(this.timerReload);
    this.timerReload = setTimeout(() => {
      if (this.server) {
        console.log(chalk.green('refresh..'));
        this.server.reload();
      }
    }, 50);
  }

  cleanAfterExit() {
    const context = this;
    process.on('SIGINT', function() {
      console.log('在正清空临时目录...');
      // 清空临时目录
      try {
        if (context.conf.clean) {
          fs.removeSync(context.conf.TEMPORARY_DIR);
        }
      } catch (e) {
        // nothing~
      } finally {
        process.exit(0);
      }
    });

    context.cleanAfterExit = function() {};
  }

  setStatic(url, dirname) {
    if (this.server) {
      this.server.setStatic(url, dirname);
    }

    return this;
  }

  start() {
    if (this.server) {
      this.server.start(() => {
        if (this.conf.openBrowser) {
          const ip = util.getIps()[0];
          const page = typeof this.conf.openBrowser === 'string' ? this.conf.openBrowser : '';
          util.openBrowser(`http://${ip}:${this.conf.port}/${page}`);
        }
      });
    }
  }
}
