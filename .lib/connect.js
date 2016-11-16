'use strict';
const types = require('./types');

module.exports = options => {
  options = Object.assign({
    // 需要注入的代码
    injects: []
  }, options || {});
  return function connect(req, res, next) {
    const end = res.end.bind(res);
    const send = res.send.bind(res);

    res.send = function(code, body) {
      if (arguments.length <= 1) {
        body = code;
        code = null;
      }

      if (code) {
        res.status(code);
      }

      const header = res.get('content-type');
      let length = res.get('content-length');

      if (/^text\/html/.test(header)) {
        if (Buffer.isBuffer(body)) {
          body = body.toString('utf8');
        }
        if (!~body.indexOf('<head>')) {
          return send(body);
        }

        const injectHTML = options.injects.join('');
        body = body.replace('<head>', '<head>\n' + injectHTML);

        if (length) {
          length = parseInt(length);
          length += Buffer.byteLength(injectHTML);
          res.set('content-length', length);
        }
        return send(body);
      } else {
        return send(body);
      }
    };

    res.end = function(data, encoding) {
      if (data != null) {
        this.write(data, encoding);
      }
      return end();
    };

    return next();
  };
}
