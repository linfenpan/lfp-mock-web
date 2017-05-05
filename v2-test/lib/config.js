'use strict';

const path = require('path');

module.exports = {
  PORT: 3000,
  CODE: 'utf8',
  PATH_TEMPLATE: path.join(process.cwd(), './__tmp__')
};
