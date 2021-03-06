'use strict';
const Builder = require('../simpleBuilder');
const path = require('path');
const util = require('../../util');
const fs = require('fs-extra');
const spawn = require('child_process').spawn;
const Thenable = require('thenablejs');


// python 的中间目录，以及中间的保存目录
const dirMiddle = path.join(__dirname, './.python/');
// python 编译的模板文件
const pythonTemplate = fs.readFileSync(path.join(dirMiddle, './_run.py')).toString();
let contentOther = '';

// jinja 模板运行 Builder
class JinjaBuilder extends Builder {
  // 生成临时文件，并且运行
  static buildPythonFileAndRun(nameTemplate, paths, data, callback) {
    const conf = require('../../../index').config;

    contentOther = (conf && conf.pythonOthers || []).map(dir => {
      let filepath = path.resolve(process.cwd(), './' + dir);
      if (fs.existsSync(filepath)) {
        return fs.readFileSync(filepath).toString();
      }
      return '';
    }).join('\n');

    const saveDir = conf.TEMPORARY_DIR || process.cwd();

    const filepathData = path.join(saveDir, `./.data_${Date.now()}.json`);
    fs.ensureFileSync(filepathData);
    fs.writeFileSync(filepathData, JSON.stringify(data || {}, null, 1));

    let options = {
      paths, 
      pathData: JSON.stringify(filepathData), 
      contentOther, 
      nameTemplate,
      encoding: conf.CODE || 'utf-8'
    };
    let content = pythonTemplate.replace(/\${([^}]+)}/g, (str, key) => {
      return options[key] || '';
    });

    const fileMiddleSave = path.join(saveDir, `./.run_${Date.now()}.py`);
    fs.ensureFileSync(fileMiddleSave);
    fs.writeFileSync(fileMiddleSave, content);

    callback = callback || function(er, str) { console.log(str) };

    const run = spawn('python', [fileMiddleSave]);
    let result = ''
    run.stdout.on('data', (data) => {
      result += util.decode(data, conf.CODE)
    });
    run.on('close', () => {
      fs.removeSync(filepathData);
      fs.removeSync(fileMiddleSave);

      callback(null, result.replace(/(START)(=+)(@+)\2\1([\s\S]*)(END)\2\3\2\5/g, '$4'));
    });
    run.on('error', (error) => {
      callback(error, error);
    });
  }

  static *build(options) {
    yield super.build(options);

    const thenable = new Thenable();
    const conf = require('../../../index').conf;

    let nameTemplate = options.nameTemplate,
      dataDefault = options.dataDefault,
      req = options.req,
      res = options.res;

    if (!util.isResponseObject(res)) {
      dataDefault = res;
      res = null;
    }

    nameTemplate = path.extname(nameTemplate) ? nameTemplate : nameTemplate + '.html';
    const basenameTemplate = path.basename(nameTemplate, path.extname(nameTemplate));

    // 读取模板文件
    const filepath = util.isFileExistAndGetName(conf.TEMPLATE_TEMPORARY_DIR, `${nameTemplate}`);
    if (filepath) {
      let data = util.readMock(path.join(conf.DATA_DIR, basenameTemplate + '.js'), null, [req, res]);
      data = Object.assign({}, dataDefault || {}, data || {});

      this.buildPythonFileAndRun(nameTemplate, JSON.stringify([conf.TEMPLATE_TEMPORARY_DIR]), data, function(error, content) {
        if (error) {
          thenable.resolve({
            code: 500,
            content: `<html><head></head><body><pre>${content}</pre></body></html>`
          });
        } else {
          thenable.resolve({ code: 200, content });
        }
      });
    } else {
      thenable.resolve({
        code: 404,
        content: `<html><head></head><body><pre>不存在模板: ${nameTemplate}</pre></body></html>`
      });
    }

    return thenable;
  }

  static *after(data) {
    yield super.after(data);
    const res = data.res;
    if (res) {
      res.status(data.code || 200).send(data.content || '<html><head></head><body></body></html>');
    }
  }

  static run(req, res, nameTemplate, dataDefault) {
    const options = {
      nameTemplate,
      dataDefault,
      req, res,
      type: 'html'
    };

    return super.run(req, res, options);
  }
};

module.exports = {
  JinjaBuilder: JinjaBuilder,

  build(nameTemplate, res, dataDefault) {
    let req = null;
    if (typeof nameTemplate === 'object') {
      req = nameTemplate;
      nameTemplate = dataDefault;
      dataDefault = arguments[3] || {};
    }
    return JinjaBuilder.run(req, res, nameTemplate, dataDefault);
  },

  queryStaticResource(filepath, res, next) {
    return JinjaBuilder.requestStatic(filepath, res, next);
  }
};
