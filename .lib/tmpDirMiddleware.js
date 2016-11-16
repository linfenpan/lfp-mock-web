'use strict';

const fs = require('fs-extra');
const path = require('path');
const util = require('./common/util');
const colors = require('colors');
const watcher = require('./watcher');
const config = require('./config');
const FileType = { pat: 1, static: 2 };

// config.templates 和 config.statics 有 { from: , [to:] }, 组成的对象列表
let tmpDir, templateDirs, staticDirs;
let staticHttpDirs, staticNormalDirs;

// 修正路径
function fixDirs(dirs, rootFrom, rootTo) {
  return (dirs || []).map(item => {
    let fr = item.from;
    let to = item.to || './';

    return {
      "to": path.resolve(rootTo, to),
      "from": path.resolve(rootFrom, fr)
    };
  });
}

// 复制到临时目录
function copyToTmp(dir, relativePath) {
  if (!fs.existsSync(dir)) {
    return;
  }
  fs.copySync(dir, path.resolve(tmpDir, relativePath || ''));
}

module.exports = {
  init (options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (fs.existsSync(tmpDir)) {
      fs.removeSync(tmpDir);
    }

    process.on('SIGINT', function() {
      // 清空临时目录
      try {
        if (config.clean) {
          fs.removeSync(tmpDir);
        }
      } catch (e) {

      } finally {
        process.exit(0);
      }
    });

    tmpDir = config.TEMPORARY_DIR,
    templateDirs = config.config.templates || [],
    staticDirs = config.config.statics || [];
    staticHttpDirs = [];
    staticNormalDirs = [];

    this._copyToTmp();
    this._watchTmp(callback);
  },

  _copyToTmp () {
    // 修正当前的模板目录
    config.TEMPLATE_SOURCE_DIRS = [];
    templateDirs = fixDirs(templateDirs, config.DIR, config.TEMPLATE_TEMPORARY_DIR);
    templateDirs.forEach(item => {
      copyToTmp(item.from, item.to);
      config.TEMPLATE_SOURCE_DIRS.push(item.to);
    });


    // 提取静态文件的目录，和 http 目录
    staticDirs.forEach(item => {
      let dir = item.from || './';
      (util.isHttpURI(dir) ? staticHttpDirs : staticNormalDirs).push(item);
    });
    staticNormalDirs = fixDirs(staticNormalDirs, config.DIR, config.STATIC_TEMPORARY_DIR);
    staticNormalDirs.forEach(item => {
      copyToTmp(item.from, item.to);
    });
    config.STATIC_SOURCE_DIRS = [config.STATIC_TEMPORARY_DIR].concat(staticHttpDirs.map(item => item.from));
  },

  _watchTmp (callback) {
    // 监听各个目录，并且复制文件
    function watchCallback(type, pathOld, pathNew, filepathWatch) {
      let relativePath = path.relative(pathOld, filepathWatch);

      if (fs.existsSync(filepathWatch)) {
        let filepathNew = path.resolve(pathNew, relativePath);
        fs.ensureFileSync(filepathNew);
        fs.copySync(filepathWatch, filepathNew);
        callback && callback(filepathWatch);
      }
    }
    templateDirs.forEach(item => {
      watcher.watch(item.from, watchCallback.bind(null, FileType.pat, item.from, item.to || config.TEMPLATE_TEMPORARY_DIR));
    });
    staticNormalDirs.forEach(item => {
      watcher.watch(item.from, watchCallback.bind(null, FileType.static, item.from, item.to || config.STATIC_TEMPORARY_DIR));
    });

    console.log('Ready to watch and copy files to template dir'.green.bold);
  }
};
