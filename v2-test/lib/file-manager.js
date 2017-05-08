'use strict';
const Gulpd = require('./gulp-d');
const gulpCallback = require('gulp-fncallback');
const gulpBatch = require('gulp-batch');

// @notice: 因为 gulp 的任务，是没有顺序的，所以需要一个管理器，来控制执行顺序
class TaskQueue {
  constructor() {
    this.srcList = [];
    this.isRuning = false;
  }

  add(src, callback) {
    this.srcList.push({ src, callback });
    return this;
  }

  run() {
    if (this.isRuning) {
      // nothing
    } else {
      this.next();
    }
    return this;
  }

  next() {
    this.isRuning = true;
    let item = this.srcList.shift();
    if (!item) {
      this.isRuning = false;
      return;
    }

    let isDone = false;
    let doNext = () => {
      if (!isDone) { this.next(); }
      isDone = true;
    };

    let result = item.callback(item.src, doNext);
    if (result === void 0) {
      // 什么都没返回，就立刻往下执行吧
      doNext();
    } else if (result) {
      if (result.pipe) {
        // 如果是 Steam，继续 pipe 一个 callback
        result.pipe(gulpCallback(
          (file, encode, cb) => { cb(); },
          (cb) => { cb(); doNext(); }
        ));
      } else if (result.then) {
        // 如果是 promise ，则等待完成
        result.then(doNext);
      }
    }
  }
}

const queue = new TaskQueue();

class FileManager extends Gulpd {
  constructor(opts) {
    super(opts);
    this.watchTimer = null;
    this.watchList = [];
  }

  match(files, callback) {
    if (typeof callback === 'string') {
      let dest = callback;
      callback = function (src) {
        return src.dest(dest);
      };
    }
    queue.add(this.src(files), callback).run();
    this.startWatchTimer();

    return this;
  }

  live(files, callback) {
    if (typeof callback === 'string') {
      let dest = callback;
      callback = function (src) {
        return src.dest(dest);
      };
    }

    // 执行一遍不同的任务
    this.match(files, callback);

    // 添加一个 watch 任务
    this.watchList.push({ files, callback });
    this.startWatchTimer();

    return this;
  }

  startWatchTimer() {
    clearTimeout(this.watchTimer);
    this.watchTimer = setTimeout(() => {
      let list = this.watchList.splice(0);
      list.forEach(item => {
        item.callback(this.watch(item.files), function() {});
      });
    }, 200);
  }
}

module.exports = FileManager;
