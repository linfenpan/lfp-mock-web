'use strict';
const fs = require('fs');
const path = require('path');
const injectHTML = require('../middleware/injectHTML');

const commentReg = /("([^\\\"]|\\.)*")|('([^\\\']|\\.)*')|(\/{2,}.*?(\r|\n))|(\/\*(\s|.)*?\*\/)/g;
// 删除注释、删除换行
const livereloadStr = fs.readFileSync(path.join(__dirname, './inline.js'))
  .toString()
  .replace(commentReg, function(word) {
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? "" : word;
  })
  .replace(/\n\s*|\r\s*/g, '');

// @params {string} [reloadUrl] 轮询的链接，默认是 /.public/reload
// @params {int} [timeSpace] 轮询的时间间隔，默认是 10s
module.exports = function(reloadUrl, timeSpace) {
  const reloader = {
    list: [],
    lastModifyTime: Date.now(),
    pushResponse (res) {
      this.list.push(res);
    },
    removeResponse (res) {
      let index = this.list.indexOf(res);
      if (index >= 0) {
        this.list.splice(index, 1);
      }
      return index;
    },
    sendModifyTime (res) {
      res.send({ time: this.lastModifyTime });
    },
    reload: function() {
      this.lastModifyTime = Date.now();
      let res = this.list.pop();
      while (res) {
        this.sendModifyTime(res);
        res = this.list.pop();
      }
    }
  };

  // 刷新页面
  function reload() {
    reloader.reload();
  }

  // 轮询中间键，用法: app.get('/xxxx', reload)
  function request(req, res, next) {
    if (req.query.last) {
      reloader.pushResponse(res);
      setTimeout(function() {
        if (reloader.removeResponse(res) >= 0) {
          res.send({});
        }
      }, timeSpace || 10000);
    } else {
      reloader.sendModifyTime(res);
    }
  }

  // live reload 注入，用法: app.use(inject);
  function inject(req, res, next) {
    return injectHTML({
      injects: [
        ['<head>', '<script>'+ livereloadStr.replace('LIVE_RELOAD_URL', reloadUrl || '/.public/reload') +'</script>', 'after']
      ]
    })(req, res, next);
  }

  return { inject, request, reload };
}
