'use strict'

function injectAtSend(res, options) {
  const send = res.send.bind(res);
  const opts = Object.assign({
    type: /^text\/html/i,
    injects: [
      // ['<head>', '内容', 'before|after|replace']
    ]
  }, options || {});

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

    if (opts.type.test(header)) {
      if (Buffer.isBuffer(body)) {
        body = body.toString('utf8');
      }
      opts.injects.forEach(arr => {
        try {
          let tag = arr[0], inject = arr[1], place = (arr[2] || 'after').toLowerCase();
          if (body.indexOf(tag) >= 0) {
            switch (place) {
              case 'before':
                body = body.replace(tag, inject + tag);
                break;
              case 'after':
                body = body.replace(tag, tag + inject);
                break;
              case 'replace':
                body = body.replace(tag, inject);
                break;
              default:
                // nothing
            }
          }
        } catch (e) {
          console.log('注入失败');
          console.log(e);
        }
      });
    }
    return send(body);
  };
}

module.exports = options => {
  return (req, res, next) => {
    injectAtSend(res, options);
    next();
  }
}
