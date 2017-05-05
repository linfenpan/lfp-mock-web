'use strict';
const path = require('path');
const gulp = require('gulp');
const watch = require('gulp-watch');
const header = require('gulp-header');
const rename = require('gulp-rename');
const callback = require('gulp-fncallback');
const gulpSequence = require('gulp-sequence')

class MockWeb {
  constructor(opts) {
    this.opts = Object.assign({
      // 源目录
      src: '',
      // 目标目录
      dest: ''
    }, opts || {});

    if (!this.opts.dest) {
      this.setDest(this.opts.dest);
    }

    this.gulp = gulp;
  }

  setDest(dest) {
    this.opts.dest = dest || this.opts.src;
    return this;
  }

  // 子元素重写这个方法
  getDest() {
    return this.opts.dest;
  }

  dir(src) {
    let mw = new MockWeb({ src: this.path(src), dest: this.opts.dest });

    // 子实例，共享下面两个方法
    // mw.setDest = this.setDest.bind(this);
    // mw.getDest = () => this.opts.dest;

    return mw;
  }

  path(filepath, dirname) {
    return path.isAbsolute(filepath) ? filepath : path.join(typeof dirname === 'string' ? dirname : this.opts.src, filepath);
  }

  src(files) {
    if (typeof files === 'string') {
      files = [files];
    }
    var _files = files.map((file) => {
      return this.path(file);
    });

    this.gulp = gulp.src(_files);
    return this;
  }

  watch(files, opts, fn) {
    if (typeof opts === 'function') {
      fn = opts;
      opts = {};
    }

    if (typeof files === 'string') {
      files = [files];
    }
    var _files = files.map((file) => {
      return this.path(file);
    });

    this.gulp = watch(_files, Object.assign({ ignoreInitial: true }, opts), fn);
    return this;
  }

  task(name, tasks, cb) {
    if (typeof tasks === 'function') {
      cb = tasks;
      tasks = [];
    }
    if (!cb) {
      cb = function() {};
    }
    if (tasks.length > 0) {
      tasks = gulpSequence.apply(gulpSequence, tasks);
    }

    gulp.task(name, tasks, cb);
    return this;
  }

  // 循序执行任务
  sequence() {
    return gulpSequence.apply(gulpSequence, arguments)
  }

  run() {
    let tasks = arguments.length ? [].slice.call(arguments, 0) : [];
    let runTask = (cb) => {
      let args = tasks.slice(0);
      let last = args[args.length - 1];
      if (typeof last === 'function') {
        let length = args.length;
        args[length - 1] = () => {
          last.apply(this, arguments);
          cb && cb.apply(this, []);
        };
      } else {
        args.push(() => {
          cb && cb.apply(this, []);
        });
      }
      gulp.start.apply(gulp, args);
    };

    if (this.gulp.pipe) {
      this.pipe(callback((file, en, cb) => {
        runTask(cb);
      }));
    } else {
      runTask();
    }

    return this;
  }

  pipe() {
    this.gulp = this.gulp.pipe.apply(this.gulp, arguments);
    return this;
  }
}

MockWeb.gulp = gulp;

// 拓展原型
MockWeb.extend = (exts) => {
  const proto = MockWeb.prototype;
  Object.keys(exts).forEach(key => {
    let fn = exts[key];
    proto[key] = function() {
      this.pipe( fn.apply(this, arguments) );
      return this;
    }
  });
};

// 拓展
MockWeb.extend({
  dest: function(filepath) {
    return gulp.dest( this.path(filepath, this.getDest()) );
  },
  callback: function(cb) {
    return callback(cb);
  },
  rename: function(opts) {
    return rename(opts);
  },
  header: function(opts) {
    return header(opts);
  }
});


module.exports = MockWeb;
