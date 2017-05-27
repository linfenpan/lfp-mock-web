'use strict';
const path = require('path');

module.exports = function(name, dir) {
  if (dir) {
    name = path.isAbsolute(name) ? name : path.join(dir, name);
  }
  try {
    delete require.cache[require.resolve(name)];
  } catch (e) { }
  return require(name);
}
