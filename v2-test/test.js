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

console.log(chalk.green('测试 src/dest/pipe 功能'));
test.src('*.html')
  .dest('./dest1')
  .pipe(header('<!-- By da宗熊 -->'))
  .dest('./dest2')
  .pipe(callback((file, enc, cb) => {
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }

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
test
  .setDest('test/dest-test1')
  .src('*.html')
  .header('<!-- By da宗熊 -->')
  .dest('./dest3')
  .pipe(callback((file, en, cb) => {
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }
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
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }

    let index4 = path.join(__dirname, `./test/dest-test2/dest4/index.html`);
    assert.isOk(fs.existsSync(index4), `${index4} 必须存在`);

    cb();
  }));

console.log(chalk.green('测试 test.setDest(path) 功能'));
test.setDest('./test');
test.src('*.html')
  .dest('./dest-test3/dest5')
  .pipe(callback((file, en, cb) => {
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }

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
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }

    let dest6 = path.join(__dirname, `./test/dest-test5/dest6/index.html`);
    assert.isOk(fs.existsSync(dest6), `${dest6} 必须存在`);

    cb();
  }))


console.log(chalk.green('mw.dest/src 等功能，应该要正常使用'));
mw.setDest('')
  .src('test/src/*.html')
  .dest('test/dest-test6')
  .pipe(callback((file, en, cb) => {
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }

    let filepath = path.join(__dirname, `./test/dest-test6/index.html`);
    assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);

    cb();
  }))
  .header('<!-- By da宗熊 -->')
  .pipe(rename({ suffix: '-2' }))
  .dest('test/dest-test6')
  .pipe(callback((file, en, cb) => {
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }

    let filepath = path.join(__dirname, `./test/dest-test6/index-2.html`);
    assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);
    assert.isOk(fs.readFileSync(filepath).toString().indexOf('<!--') == 0, `${filepath} 应该有注释`);

    cb();
  }));


console.log(chalk.green('test.watch()测试'));
// const watch = require('gulp-watch');
// watch('test/src/*.html', { ignoreInitial: false })
//   .pipe(gulp.dest('test/dest1'))
//   .pipe(callback((file, enc, cb) => {
//     if (file.relative.indexOf('index') < 0) {
//       return cb();
//     }
//
//     let index1 = path.join(__dirname, `./test/dest1/index.html`);
//     assert.isOk(fs.existsSync(index1), `${index1} 必须存在`);
//     cb();
//   }));
test.setDest('')
  .watch('*.html', {ignoreInitial: false}, function() {
    console.log('执行了回调')
  })
  .pipe(callback((file, en, cb) => {
    console.log('文件已经更变了');
    cb();
  }))
  .dest('../dest-watch')
  .pipe(callback((file, en, cb) => {
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }

    let filepath = path.join(__dirname, `./test/dest-watch/index.html`);
    assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);

    cb();
  }));


console.log(chalk.green('mw.task()测试'));
mw.task('test', (done) => {
  // do something
  test.setDest('')
    .src('*.html')
    .dest('../dest-task')
    .pipe(callback((file, en, cb) => {
      if (file.relative.indexOf('index') < 0) {
        return cb();
      }

      cb();
      // task 中，不执行 done，是不能告诉外层，任务已经完成了的~
      done();
    }));
});

mw.run('test', [], () => {
  console.log(chalk.green('mw.task()测试 success'));
  let filepath = path.join(__dirname, `./test/dest-task/index.html`);
  assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);
});


console.log(chalk.green('mw.run()测试'));
// do something
mw.task('test2', (done) => {
  // task 中，不调用 done 的话，是不会触发接下来链式的回调的!!!!
  done();
});
test.setDest('')
  .src('*.html')
  .run('test2')
  .dest('../dest-task2')
  .pipe(callback((file, en, cb) => {
    if (file.relative.indexOf('index') < 0) {
      return cb();
    }

    let filepath = path.join(__dirname, `./test/dest-task2/index.html`);
    assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);

    console.log(chalk.green('mw.run()测试 success'));
    cb();
  }));


console.log(chalk.green('test.watch + test.run'));
mw.task('test3', done => {
  test.setDest('')
    .src('*.html')
    .dest('../dest-watch-run')
    .pipe(callback((file, en, cb) => {
      if (file.relative.indexOf('index') >= 0) {
        console.log(file.relative);
        let filepath = path.join(__dirname, `./test/dest-watch-run/index.html`);
        assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);
        console.log(chalk.yellow('test.watch + test.run success'));
      }

      cb();
    }));
  done();
});

test.watch('index.html', {ignoreInitial: false})
  .run('test3');


console.log(chalk.green('test.watch + test.run 2'));
mw.task('test4', done => {
  test.setDest('')
    .src('*.html')
    .dest('../dest-watch-run-2')
    .pipe(callback((file, en, cb) => {
      console.log(file.relative);
      if (file.relative.indexOf('index') >= 0) {
        let filepath = path.join(__dirname, `./test/dest-watch-run-2/index.html`);
        assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);
        console.log(chalk.yellow('test.watch + test.run success 2'));
      }

      cb();
    }));
  done();
});

test.watch('a.html', {ignoreInitial: false}, () => {
  test.run('test4');
});


console.log(chalk.green('多目录混合合作'));
mw.setDest('test/dest-multi');
const dirSrc = mw.dir('test/src');
const dirCom = mw.dir('test/com');
mw.task('multi1', (done) => {
  dirSrc.src('*.html')
    .dest('./')
    .pipe(callback((file, en, cb) => {
      if (file.relative.indexOf('index') < 0) {
        return cb();
      }

      let filepath = path.join(__dirname, `./test/dest-multi/index.html`);
      assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);

      filepath = path.join(__dirname, `./test/dest-multi/header/header.html`);
      assert.isOk(!fs.existsSync(filepath), `${filepath} 不该存在`);

      cb();
    }));
  done();
});
mw.task('multi2', (done) => {
  dirCom.src('**')
    .dest('./')
    .pipe(callback((file, en, cb) => {
      if (file.relative.indexOf('index') < 0) {
        return cb();
      }
      cb();
    }));
  done();
});
let counter = 0;
mw.run('multi1', 'multi2', () => {
  counter++;
  if (counter >= 2) {
    let filepath = path.join(__dirname, `./test/dest-multi/index.html`);
    assert.isOk(fs.readFileSync(filepath).toString().trim() === '', `${filepath} 应该是空文件!`);
    console.log(chalk.yellow('多文件测试通过'));
  }
});

gulp.task('multi1', (done) => {
  gulp.src('test/src/*.html')
    .pipe(gulp.dest('test/dest-multi'))
    .pipe(callback((file, en, cb) => {
      if (file.relative.indexOf('index') < 0) {
        return cb();
      }

      let filepath = path.join(__dirname, `./test/dest-multi/index.html`);
      assert.isOk(fs.existsSync(filepath), `${filepath} 必须存在`);

      filepath = path.join(__dirname, `./test/dest-multi/header/header.html`);
      assert.isOk(!fs.existsSync(filepath), `${filepath} 不该存在`);
      cb();
    }));
  done();
});
gulp.task('multi2', (done) => {
  gulp.src('test/com/**')
    .pipe(gulp.dest('test/dest-multi'))
    .pipe(callback((file, en, cb) => {
      cb();
    }));
  done();
});

gulp.run(['multi1', 'multi2'], () => {
  // 任务中，每次调用 done，都执行一次，略坑~
  console.log('xxxxx');
});


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
