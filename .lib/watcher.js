'use strict';
const chokidar = require('chokidar');

module.exports = {
  watch(files, callback) {
    if (typeof callback !== 'function') {
      return;
    }
    if (typeof files === 'string') {
      files = [files];
    }
    
    const watcher = chokidar.watch(files);
    watcher.on('change', callback);
  }
};