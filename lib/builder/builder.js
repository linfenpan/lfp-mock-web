'use strict';
const co = require('co');

class Builder {
  constructor() { }

  static *before (options) { }
  static *build (options) { }
  static *after (options) { }

  static run (req, res, options) {
    const ctx = this;
    const middle = Object.assign(options || {}, { req, res });

    return co(function*() {
      Object.assign(middle, yield this.before(middle) || {});
      Object.assign(middle, yield this.build(middle) || {});
      Object.assign(middle, yield this.after(middle) || {});

      return middle;
    }.bind(this)).catch(e => {
      console.error(e.stack);
    });
  }
};

module.exports = Builder;
