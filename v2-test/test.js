'use strict';
const chalk = require('chalk');
const assert = require('chai').assert;
const plugins = require('gulp-load-plugins')();
const gulp = require('gulp');
const path = require('path');
const fs = require('fs-extra');

const MockWeb = require('./index');
// dest 为空，值为 src
const mw = new MockWeb({ dest: 'test/dest-test1/' });

const test = mw.dir('test/src/');
const header = require('gulp-header');
const rename = require('gulp-rename');
const callback = require('gulp-fncallback');

// 删除目录 dest 开头的所有目录
function clearAllTestDir () {
  let dir = path.join(__dirname, './test');
  let files = fs.readdirSync(dir);
  files.forEach(function(file) {
    let fullpath = path.join(dir, file);
    let stat = fs.statSync(fullpath);
    if (stat.isDirectory() && file.indexOf('dest') == 0) {
      fs.removeSync(fullpath);
    }
  });
}
clearAllTestDir();

// gulp.src('test/src/*.html')
//   .pipe(gulp.dest('test/dest1'))
//   .pipe(callback((file, enc, cb) => {
//     let index1 = path.join(__dirname, `./test/dest1/index.html`);
//     assert.isOk(fs.existsSync(index1), `${index1} 必须存在`);
//     cb();
//   }));

console.log(chalk.green('测试 src/dest/pipe 功能'));
test.src('*.html')
  .dest('./dest1')
  .pipe(header('<!-- By da宗熊 -->'))
  .dest('./dest2')
  .pipe(callback((file, enc, cb) => {
    let index1 = path.join(__dirname, `./test/dest-test1/dest1/index.html`);
    let index2 = path.join(__dirname, `./test/dest-test1/dest2/index.html`);

    assert.isOk(fs.existsSync(index1), `${index1} 必须存在`);
    assert.isOk(fs.existsSync(index2), `${index2} 必须存在`);

    assert.isOk(fs.readFileSync(index1).toString().indexOf('<!--') != 0, `${index1} 不该有注释`);
    assert.isOk(fs.readFileSync(index2).toString().indexOf('<!--') == 0, `${index2} 应该有注释`);

    cb();
  }));

console.log(chalk.green('测试 MockWeb.extend 功能'));
MockWeb.extend({
  header: header
});
test.src('*.html')
  .header('<!-- By da宗熊 -->')
  .dest('./dest3')
  .pipe(callback((file, en, cb) => {
    let index3 = path.join(__dirname, `./test/dest-test1/dest3/index.html`);

    assert.isOk(fs.existsSync(index3), `${index3} 必须存在`);
    assert.isOk(fs.readFileSync(index3).toString().indexOf('<!--') == 0, `${index3} 应该有注释`);

    cb();
  }));

console.log(chalk.green('测试 test.setDest(\'\') 功能'));
// 空，即 dest = src
test.setDest('');
test.src('*.html')
  .dest('../dest-test2/dest4')
  .pipe(callback((file, en, cb) => {
    let index4 = path.join(__dirname, `./test/dest-test2/dest4/index.html`);
    assert.isOk(fs.existsSync(index4), `${index4} 必须存在`);

    cb();
  }));

console.log(chalk.green('测试 test.setDest(path) 功能'));
test.setDest('./test');
test.src('*.html')
  .dest('./dest-test3/dest5')
  .pipe(callback((file, en, cb) => {
    let dest5 = path.join(__dirname, `./test/dest-test3/dest5/index.html`);
    assert.isOk(fs.existsSync(dest5), `${dest5} 必须存在`);

    cb();
  }));

console.log(chalk.green('mw.setDest() 不该影响 test 的功能'));
mw.setDest('test/dest-test4');
test.setDest('');
test.src('*.html')
  .dest('../dest-test5/dest6')
  .pipe(callback((file, en, cb) => {
    let dest6 = path.join(__dirname, `./test/dest-test5/dest6/index.html`);
    assert.isOk(fs.existsSync(dest6), `${dest6} 必须存在`);

    cb();
  }))


console.log(chalk.green('mw.dest/src 等功能，应该要正常使用'));
mw.setDest('')
  .src('test/src/*.html')
  .dest('test/dest-test6')
  .pipe(callback((file, en, cb) => {
    let filepath = path.join(__dirname, `./test/dest-test6/index.html`);
    assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);

    cb();
  }))
  .header('<!-- By da宗熊 -->')
  .pipe(rename({ suffix: '-2' }))
  .dest('test/dest-test6')
  .pipe(callback((file, en, cb) => {
    let filepath = path.join(__dirname, `./test/dest-test6/index-2.html`);
    assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);
    assert.isOk(fs.readFileSync(filepath).toString().indexOf('<!--') == 0, `${filepath} 应该有注释`);

    cb();
  }));


//
// // 当前文件所在目录
// mw.src('*.css')
//   // 当这个样式更变时，同时运行某个任务
//   .run(['task1']);
//
//
// // 注册某个 任务
// mw.task('task1', function(done) {
//   // do something
//   // done(error?);
// });
//
//
// // 监听某个文件变化
// mw.watch('*.tmpl', () => {
//   mw.run(['task1', 'task2'], () => { console.log('finish'); });
// });
//
//
// mw.exend({
//   minify: function() {
//
//   }
// });
