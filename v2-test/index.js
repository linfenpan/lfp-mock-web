'use strict';
const path = require('path');
const gulp = require('gulp');
const watch = require('gulp-watch');

class MockWeb {
  constructor(opts) {
    this.opts = Object.assign({
      dirname: ''
    }, opts || {});

    this.gulp = gulp;
  }

  dir(dirname) {
    return new MockWeb({ dirname });
  }

  path(filepath) {
    return path.isAbsolute(filepath) ? filepath : path.join(this.opts.dirname, filepath);
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
    return gulp.dest( this.path(filepath) );
  }
});


module.exports = MockWeb;
