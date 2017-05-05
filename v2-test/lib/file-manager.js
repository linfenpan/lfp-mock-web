'use strict';
const Gulpd = require('./gulp-d');
const gulpCallback = require('gulp-fncallback');

// @notice: 因为 gulp 的任务，是没有顺序的，所以需要一个管理器，来控制执行顺序
class TaskQueue {
  constructor() {
    this.list = [];
    this.isRuning = false;
  }

  add(src, callback) {
    this.list.push({ src, callback });
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
    let item = this.list.shift();
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
          (file, encode, cb) => cb(),
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
  }

  match(files, callback) {
    let src = this.src(files);
    if (typeof callback === 'string') {
      let dest = callback;
      callback = function (src) {
        return src.dest(dest);
      };
    }
    queue.add(src, callback);
    queue.run();

    return this;
  }
}

module.exports = FileManager;
