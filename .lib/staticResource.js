'use strict';
const fs = require('fs-extra');
const path = require('path');
const util = require('./common/util');
const config = require('./config');
const request = require('./request');
const Types = require('./types');

// 请求转发，尝试遍历所有静态目录，寻找资源
function forwardRequest(url, res, start) {
  let result = util.findNextExist(config.STATIC_SOURCE_DIRS, url, start || 0);
  let filename = result.filename;
  if (filename) {
    let type = Types.get(filename);
    // console.log(filename);

    if (/^http/.test(filename)) {
      request(filename)
        .then(
          data => {
            try {
              let targetFile = path.join(config.STATIC_TEMPORARY_DIR, url);
              fs.ensureDirSync(path.dirname(targetFile));
              fs.writeFileSync(targetFile, data.slice(0));
            } catch (e) {
              console.log(`create ${url} failed`);
            }

            decode(res, data, type);
          },
          error => forwardRequest(url, res, result.start + 1)
        );
    } else {
      decode(res, fs.readFileSync(filename), type);
    }
  } else {
    setNotFound(res, req);
  }
}

function decode(res, data, type) {
  let content = data;
  if (/^text/.test(type)) {
    let str = content.toString();
    if (str.indexOf('�') >= 0) {
      // 尝试解析编码
      let codes = [config.CODE, 'gbk', 'utf-8'];
      str = util.decode(content, codes) || str;
      content = str;
    }
  }
  res.send(content);
}

function query(req, res) {
  // 有些奇怪的地址，类似: a.js?xxx ; //b.js，这些都是无法正确识别的
  let url = (typeof req === 'string' ? req : req.url).replace(/[#?].*$/, '').replace(/^\/{2,}/, '/');
  console.log('寻址地址', path.normalize(url));

  let filepath = util.isFileExistAndGetName(config.STATIC_SOURCE_DIRS, path.normalize(url)) || '';
  let type = Types.get(filepath);

  res.set('content-type', type);
  if (filepath) {
    forwardRequest(url, res);
  } else {
    setNotFound(url, res);
  }
}

function setNotFound(url, res) {
  res.status(404).send(`can not find ${url}`);
}

module.exports = {
  query
};
