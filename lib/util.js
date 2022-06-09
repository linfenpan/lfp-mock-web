'use strict';
const os = require('os');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const require1 = require('./common/require1');

module.exports = {
  type(obj) {
    const strType = Object.prototype.toString.call(obj);
    return strType.split(' ')[1].slice(0, -1).toLowerCase();
  },

  isHttpURI (uri) {
    return /^http/.test(uri);
  },

  isResponseObject (obj) {
    return typeof obj === 'object' && obj.set && obj.send && obj.status;
  },

  isDir (fullpath, notExistValue) {
    if (fs.existsSync(fullpath)) {
      let stat = fs.statSync(fullpath);
      return stat.isDirectory();
    }
    return notExistValue;
  },

  // 从文件 dirs 列表中，寻找 filename 文件，如果存在，则返回 文件名字
  isFileExistAndGetName (dirs, filename) {
    let result = this.findNextExist(dirs || [], filename);
    return result.filename;
  },

  // 从 dirs 列表中，寻找 filename 文件，开始索引为 start
  findNextExist (dirs, filename, start) {
    dirs = dirs || [];

    if (typeof dirs === 'string') {
      dirs = [dirs];
    }

    let result = {
      start: -1,
      filename: ''
    };

    for (let i = start || 0, max = dirs.length; i < max; i++) {
      let dir = dirs[i];
      if (!this.isHttpURI(dir) && !this.isDir(dir)) {
        dir = path.dirname(dir);
      }
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

  readMock (filePath, defaultData, args) {
    if (!fs.existsSync(filePath)) {
      return defaultData || {};
    }
    let fn = require1(filePath);
    return typeof fn === 'function' ? fn.apply(null, args || []) : fn;
  },

  decode (bytes, code) {
    if (Array.isArray(code)) {
      let codes = code;
      for (let i = 0, max = codes.length; i < max; i++) {
        let result = this.decode(bytes, codes[i]);
        if(result.indexOf('�') < 0) {
          return result;
        }
      }
      return bytes.toString();
    }
    return iconv.decode(bytes, code);
  },

  openBrowser (target, callback) {
    var map, opener;
    map = {
      'darwin': 'open',
      'win32': 'start '
    };
    opener = map[process.platform] || 'xdg-open';
    return require("child_process").exec(opener + ' ' + target, callback || function() {});
  },

  getIp () {
    return this.getIps()[0];
  },

  getIps () {
    var interfaces = os.networkInterfaces();
    var ips = [];
    for (var devName in interfaces) {
      var iface = interfaces[devName];
      for (var i = 0; i < iface.length; i++) {
        var alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          ips.push(alias.address);
        }
      }
    }
    return ips;
  }
};
