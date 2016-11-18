'use strict';

const fs = require('fs-extra');
const path = require('path');
const util = require('./common/util');
const colors = require('colors');
const watcher = require('./watcher');
const config = require('./config');

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
    function watchCallback(dirOld, dirNew, typeOfWatch, filePathOld) {
      // change 文件更变
      // add 文件添加监听，添加文件
      // unlink 删除文件
      let relativePath = path.relative(dirOld, filePathOld);
      let filepathNew = path.resolve(dirNew, relativePath);

      switch (typeOfWatch) {
        case 'change':
          if (fs.existsSync(filePathOld)) {
            fs.ensureFileSync(filepathNew);
            fs.copySync(filePathOld, filepathNew);
            callback && callback(typeOfWatch, filePathOld);
          }
          break;
        case 'add':
          if (fs.existsSync(filePathOld) && !fs.existsSync(filepathNew)) {
            fs.ensureFileSync(filepathNew);
            fs.copySync(filePathOld, filepathNew);
            callback && callback(typeOfWatch, filePathOld);
          }
          break;
        case 'unlink':
          if (fs.existsSync(filepathNew)) {
            fs.removeSync(filepathNew);
            callback && callback(typeOfWatch, filePathOld);
          }
          break;
        default:
          // do nothing...
      }
    }
    templateDirs.forEach(item => {
      watcher.watch(item.from, watchCallback.bind(null, item.from, item.to || config.TEMPLATE_TEMPORARY_DIR), 'all');
    });
    staticNormalDirs.forEach(item => {
      watcher.watch(item.from, watchCallback.bind(null, item.from, item.to || config.STATIC_TEMPORARY_DIR), 'all');
    });

    console.log('Ready to watch and copy files to template dir'.green.bold);
  }
};
