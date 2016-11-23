'use strict';
const path = require('path');
const util = require('./common/util');
const fs = require('fs-extra');
const exec = require('child_process').exec;
const config = require('./config');
const Thenable = require('thenablejs');


// python 的中间目录，以及中间的保存目录
const dirMiddle = path.join(__dirname, '../.python/');
const dirMiddleSave = path.join(process.cwd(), './.python/', 'run.py');
// python 编译的模板文件
const pythonTemplate = fs.readFileSync(path.join(dirMiddle, './_run.py')).toString();
let contentOther = '';

// 生成临时文件，并且运行
function buildPythonFileAndRun(nameTemplate, paths, data, callback) {
  contentOther = (config.config && config.config.pythonOthers || []).map(dir => {
    let filepath = path.resolve(process.cwd(), './' + dir);
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath).toString();
    }
    return '';
  }).join('\n');

  let options = {
    paths, data: JSON.stringify(safeJSON(data)), contentOther, nameTemplate
  };
  let content = pythonTemplate.replace(/\${([^}]+)}/g, (str, key) => {
    return options[key] || '';
  });

  fs.ensureFileSync(dirMiddleSave);
  fs.writeFileSync(dirMiddleSave, content);

  callback = callback || function(er, str) { console.log(str) };
  exec(`python ${dirMiddleSave}`, (error, stdout, stderr) => {
    if (error) {
      callback(error, stderr);
      return;
    }
    callback(error, stdout.replace(/(START)(=+)(@+)\2\1([\s\S]*)(END)\2\3\2\5/g, '$4'));
  });
}

// 最深检测 50 层，过场则无视了
function safeJSON(data, _deep) {
  _deep = _deep || 0;
  if (_deep >= 50) {
    return data;
  }

  let result = data;
  if (!data) {
    return data;
  } else if (Array.isArray(data)) {
    data = data.slice(0);
    data.forEach((val, index) => {
      data[index] = safeJSON(val, _deep);
    });
    return data;
  } else if (typeof data === 'object'){
    data = Object.assign({}, data);
    Object.keys(data).forEach(key => {
      data[key] = safeJSON(data[key], _deep + 1);
    });
    return data;
  } else if (typeof data === 'string') {
    return data.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  }
  return data;
}

module.exports = {
  build(name, res, defaultData) {
    const thenable = new Thenable();

    if (!util.isResponseObject(res)) {
      defaultData = res;
      res = null;
    }

    name = path.extname(name) ? name : name + '.html';
    const basename = path.basename(name, path.extname(name));

    // 读取模板文件
    const filePath = util.isFileExistAndGetName(config.TEMPLATE_SOURCE_DIRS, `${name}`);
    if (filePath) {
      let data = util.readMock(path.join(config.DATA_DIR, basename + '.js'));
      data = Object.assign({}, defaultData || {}, data || {});

      buildPythonFileAndRun(name, JSON.stringify(config.TEMPLATE_SOURCE_DIRS), data, function(error, content) {
        if (error) {
          thenable.reject({
            code: 500,
            content: `<html><head></head><body><pre>${content}</pre></body></html>`
          });
        } else {
          thenable.resolve({ content });
        }
      });
    } else {
      thenable.reject({
        code: 404,
        content: `<html><head></head><body><pre>can not find ${name}</pre></body></html>`
      });
    }

    thenable.then(
      (data) => {
        if (res) {
          res.set('content-type', 'text/html');
          res.status(data.code || 200).send(data.content.trim() || '<html><head></head><body></body></html>');
        }
      },
      (error) => {
        if (res) {
          res.set('content-type', 'text/html');
          res.status(error.code || 404).send(error.content);
        }
      }
    );

    return thenable;
  },
};
