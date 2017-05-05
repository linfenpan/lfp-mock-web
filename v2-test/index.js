'use strict';
const mw = require('./lib/mock-web');
const path = require('path');

const fm = {
  src: mw.createFileManager({
    src: path.join(__dirname, './test/src'),
    dest: path.join(__dirname, './test/dest')
  }),
  com: mw.createFileManager({
    src: path.join(__dirname, './test/com'),
    dest: path.join(__dirname, './test/dest')
  })
};

fm.src.match('./*.html', (src, done) => {
  return src.header('<!-- hello -->\n').dest('./');
});
fm.com.match(['*.html', '*/*.html'], './');
