'use strict';
const Gulpd = require('./gulp-d');
const gulpCallback = require('gulp-fncallback');
const gulpBatch = require('gulp-batch');

// @notice: 因为 gulp 的任务，是没有顺序的，所以需要一个管理器，来控制执行顺序
class TaskQueue {
  constructor() {
    this.list = [];
    this.isRuning = false;
  }

  add(src, callback) {
    this.list.push({ src, callback });
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
      console.log(!!result.pipe);

      if (result.pipe) {
        // 如果是 Steam，继续 pipe 一个 callback
        result.pipe(gulpCallback(
          (file, encode, cb) => { console.log(3); cb(); },
          (cb) => { console.log(4); cb(); doNext(); }
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
    if (typeof callback === 'string') {
      let dest = callback;
      callback = function (src) {
        return src.dest(dest);
      };
    }
    queue.add(this.src(files), callback).run();
    return this;
  }

  live(files, callback) {
    let src = this.watch(files, { ignoreInitial: false }, () => {
      return this.match(files, callback);
    });

    return this;
  }
}

module.exports = FileManager;
