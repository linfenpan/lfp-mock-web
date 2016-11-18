'use strict';
const chokidar = require('chokidar');

module.exports = {
  watch(files, callback, events) {
    if (typeof callback !== 'function') {
      return;
    }
    if (typeof files === 'string') {
      files = [files];
    }
    events = events || ['change'];
    if (typeof events === 'string') {
      events = [events];
    }

    const watcher = chokidar.watch(files);
    events.forEach(evt => {
      watcher.on(evt, callback);
    });
  }
};
