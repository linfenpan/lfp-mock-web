'use strict';
const mw = require('./lib/mock-web');
const path = require('path');
const callback = require('gulp-fncallback');

// const fm = {
//   src: mw.createFileManager({
//     src: path.join(__dirname, './test/src'),
//     dest: path.join(__dirname, './test/dest')
//   }),
//   com: mw.createFileManager({
//     src: path.join(__dirname, './test/com'),
//     dest: path.join(__dirname, './test/dest')
//   })
// };
//
// fm.src.live('./*.html', (src, done) => {
//   return src.header('<!-- hello -->\n').dest('./');
// });
// fm.com.live(['*.html', '*/*.html'], './');

const server = mw.createServer({ port: 3005, livereload: true });
server.setStatic('/static', path.join(__dirname, './test/dest'));

server.app.get('/', (req, res, next) => {
  res.set('Content-Type', 'text/html');
  res.send('<html><head></head><body>200</body></html>');
});

// setTimeout(function() {
//   server.reload();
// }, 3000);

server.start();
