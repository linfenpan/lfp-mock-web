'use strict';
const require1 = require('./require1');
const path = require('path');

module.exports = function combine(deps, dir) {
  let res = {};
  if (deps && Array.isArray(deps)) {
    deps.forEach(dep => {
      let tmp = dep;
      if (typeof dep === 'string') {
        tmp = require1(dep, dir);
        if (typeof tmp === 'function') {
          tmp = tmp();
        }
      }
      Object.assign(res, tmp || {});
    });
  }
  return res;
};
