'use strict';
const path = require('path');
const gulp = require('gulp');
const watch = require('gulp-watch');

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

  pipe() {
    this.gulp = this.gulp.pipe.apply(this.gulp, arguments);
    return this;
  }
}

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
  }
});


module.exports = MockWeb;
