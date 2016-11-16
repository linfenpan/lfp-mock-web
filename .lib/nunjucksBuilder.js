'use strict';
const path = require('path');
const util = require('./common/util');
const fs = require('fs-extra');
const exec = require('child_process').exec;
const config = require('./config');


// python 的中间目录，以及中间的保存目录
const dirMiddle = path.join(__dirname, '../.python/');
const dirMiddleSave = path.join(process.cwd(), './.python/', 'run.py');
// python 编译的模板文件
const pythonTemplate = fs.readFileSync(path.join(dirMiddle, './_run.py')).toString();
const contentOther = (config.pythonOthers || []).map(dir => {
  let filepath = path.resolve(process.cwd(), './' + dir);
  if (fs.existsSync(filepath)) {
    return fs.readFileSync(filepath).toString();
  }
  return '';
}).join('\n');

// 生成临时文件，并且运行
function buildPythonFileAndRun(nameTemplate, paths, data, callback) {
  let options = {
    paths, data, contentOther, nameTemplate
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

module.exports = {
  build(name, res, defaultData) {
    // 读取模板文件
    const filePath = util.isFileExistAndGetName(config.TEMPLATE_SOURCE_DIRS, `${name}`);
    if (filePath) {
      let data = util.readMock(path.join(config.DATA_DIR, path.basename(name, path.extname(name)) + '.js'));
      data = Object.assign({}, defaultData || {}, data || {});

      buildPythonFileAndRun(name, JSON.stringify(config.TEMPLATE_SOURCE_DIRS), JSON.stringify(data), function(error, content) {
        res.set('content-type', 'text/html');
        if (error) {
          res.status(500).send(`<html><head></head><body><pre>${content}</pre></body></html>`);
        } else {
          res.send(content);
        }
      });
    } else {
      res.send(404, `can not find ${name}`);
    }
  },
};
