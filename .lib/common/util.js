'use strict';

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const require1 = require('../require1');

module.exports = {
  isHttpURI (uri) {
    return /^http/.test(uri);
  },

  isFileExistAndGetName (dirs, filename) {
    let result = this.findNextExist(dirs, filename);
    return result.filename;
  },

  findNextExist (dirs, filename, start) {
    if (typeof dirs === 'string') {
      dirs = [dirs];
    }

    let result = {
      start: -1,
      filename: ''
    };

    for (let i = start || 0, max = dirs.length; i < max; i++) {
      let dir = dirs[i];
      let filePath = path.join(dir, filename) || '';
      if (this.isHttpURI(filePath)) {
        result.start = i;
        result.filename = dir + filename;
        break;
      } else if (fs.existsSync(filePath)) {
        result.start = i;
        result.filename = filePath;
        break;
      }
    }

    return result;
  },

  readFile (filePath, code) {
    return this.decode(fs.readFileSync(filePath), code);
  },

  readMock (filePath, defaultData) {
    if (!fs.existsSync(filePath)) {
      return defaultData || {};
    }
    let fn = require1(filePath);
    return typeof fn === 'function' ? fn() : fn;
  },

  decode (bytes, code) {
    return iconv.decode(bytes, code);
  }
};
