'use strict';
const http = require('http');
const colors = require('colors');
const querystring = require('querystring');
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

/**
  * 请求转发，这个板块
  * @param {Object} http.request的参数，{ host: 域名, port: 端口, path: 路径, data: post 的数据 }
  * @param {HttpRequest} 请求对象
  * @param {HttpResponse} 相应对象
*/
function transmit(params, req) {
  params = params || {};
  let options = Object.assign({
    host: '',
    port: 80,
    path: req.url,
    method: req.method
  }, params || {});

  options.path += (params.data ? ( options.path.indexOf('?') >= 0 ? '&' : '?' ) + querystring.stringify(params.data || {}) : '');

  options.headers = Object.assign({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': 0
  }, params && params.headers || {});

  let dataSend = Object.assign({}, params.data || {}, req.body);
  dataSend = querystring.stringify(dataSend);
  options.headers['Content-Length'] = Buffer.byteLength(dataSend);

  return new Promise((resolve, reject) => {
    console.log(`transmit to: http://${options.host}:${options.port}${options.path}, method: ${options.method}`.green);
    let transmitReq = http.request(options, smitRes => {
      let helper = new BufferHelper();
      smitRes.on('data', chunk => {
        helper.concat(chunk);
      }).on('end', () => {
        const buffers = helper.toBuffer();
        if (smitRes.statusCode !== 200) {
          reject(buffers);
        } else {
          resolve(buffers);
        }
      });
    });

    transmitReq.on('error', e => {
      reject(e.message);
    });

    transmitReq.write(dataSend);
    transmitReq.end();
  });
}
request.transmit = transmit;

// 使用 http-proxy-middleware 板块，进行请求转发
request.proxy = require('http-proxy-middleware');

module.exports = request;
