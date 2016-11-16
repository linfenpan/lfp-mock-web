'use strict';
const path = require('path');
const TYPES = {
  "css": "text/css",
  "gif": "image/gif",
  "html": "text/html",
  "ico": "image/x-icon",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "bmp": "image/bmp",
  "js": "text/javascript",
  "json": "application/json",
  "pdf": "application/pdf",
  "png": "image/png",
  "svg": "image/svg+xml",
  "swf": "application/x-shockwave-flash",
  "tiff": "image/tiff",
  "txt": "text/plain",
  "wav": "audio/x-wav",
  "wma": "audio/x-ms-wma",
  "wmv": "video/x-ms-wmv",
  "xml": "text/xml"
};

module.exports = {
  get(filePath) {
    let extname = path.extname(filePath);
    if (extname) {
      extname = extname.slice(1);
    } else {
      extname = 'unknown';
    }

    return TYPES[extname.toLowerCase()] || 'text/plain';
  },
  extend(cf) {
    return Object.assign(TYPES, cf || {});
  }
};
