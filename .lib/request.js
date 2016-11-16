'use strict';
const http = require('http');
const BufferHelper = require('bufferhelper');

/**
 * GET 方式，请求一个资源
 * @param {String} url 请求的资源
 * @returns {Promise}
 */
function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let helper = new BufferHelper();
      res.on('data', chunk => {
        helper.concat(chunk);
      })
      .on('end', () => {
        const buffers = helper.toBuffer();
        if (res.statusCode !== 200) {
          reject(buffers);
        } else {
          resolve(buffers);
        }
      });
    })
    .on('error', e => {
      reject(e.message);
    });

    req.setTimeout(2000, () => {
      reject('time out');
    });
  });
}

module.exports = request;
