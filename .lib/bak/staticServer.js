'use strict';
const fs = require('fs');
const path = require('path');
const util = require('./common/util');
const iconv = require('iconv-lite');
const urllib = require('urllib');
const config = require('./config');
const superagent = require('superagent');
const Types = require('./types');

const CODE = config.CODE;
const PORT = config.STATIC_PORT || 5000;
const STATIC_DIR = config.STATIC_DIR;



const http = require('http');
http.createServer(function (request, response) {
  let content = '';
  let url = request.url.replace(/[#?].*$/, '');
  let filePath = util.isFileExistAndGetName(STATIC_DIR, url) || '';

  const type = Types.get(filePath);

  console.log(filePath, url, STATIC_DIR);

  new Promise((resolve, reject) => {
    if (filePath) {
      if (/^http/.test(filePath)) {
        const sreq = superagent.get(filePath);
        sreq.pipe(response);
        return reject();
      } else {
        response.writeHead(200, {'Content-Type': type});
        content = fs.readFileSync(filePath);
      }
    } else {
      response.writeHead(404, `url is not found`);
    }
    resolve(content);
  })
  .then(content => {
    console.log(content);
    if (/^text/.test(type)) {
      content = iconv.decode(content, CODE);
    }
    response.write(content);
    response.end();
  })
  .catch(() => {
    // do nothing...
  });
}).listen(PORT, function() {
  console.log('Static Server listening to', PORT);
});
