function test(req, res, next) {
  var end, write;
  write = res.write;
  end = res.end;
  res.flush = noop;
  res.chunks = '';
  res.write = function(chunk, encoding) {
    var e, header, length;
    header = res.getHeader("content-type");
    length = res.getHeader("content-length");
    if ((/^text\/html/.test(header)) || !header) {
      if (Buffer.isBuffer(chunk)) {
        chunk = chunk.toString("utf8");
      }
      if (!~chunk.indexOf("</head>")) {
        return write.call(res, chunk, "utf8");
      }
      chunk = chunk.replace("</head>", options.inject.join('') + "</head>");
      if (length) {
        length = parseInt(length);
        length += Buffer.byteLength(options.inject.join(''));
        try {
          res._header = null;
          res.setHeader("content-Length", length);
          this._implicitHeader();
        } catch (_error) {
          e = _error;
        }
      }
      return write.call(res, chunk, "utf8");
    } else {
      return write.call(res, chunk, encoding);
    }
  };
  res.end = function(chunk, encoding) {
    if (chunk != null) {
      this.write(chunk, encoding);
    }
    return end.call(res);
  };
  
  return next();
};