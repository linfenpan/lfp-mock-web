'use strict';
const fs = require('fs-extra');
const path = require('path');
const util = require('../../util');
const iconv = require('iconv-lite');
const Builder = require('../simpleBuilder');
const Thenable = require('thenablejs');
const PatBuilder = require('../pat/builder').PatBuilder;
const JinjaBuilder = require('../jinja/builder').JinjaBuilder;


class PatBuilder2 extends PatBuilder {
  static *build (options) {
    yield Builder.build(options);

    const thenable = new Thenable();
    const conf = require('../../../index').config;

    let nameTemplate = options.nameTemplate,
      dataDefault = options.dataDefault,
      req = options.req,
      res = options.res;

    // 读取模板文件
    nameTemplate = path.extname(nameTemplate) ? nameTemplate : nameTemplate + '.pat';
    const basenameTemplate = nameTemplate.replace(path.extname(nameTemplate), '');
    const filepath = util.isFileExistAndGetName(conf.TEMPLATE_TEMPORARY_DIR, `${nameTemplate}`);

    if (filepath) {
      let data = util.readMock(path.join(conf.DATA_DIR, `${basenameTemplate}.js`), null, [req, res]);
      data = Object.assign({}, dataDefault || {}, data || {});
      try {
        // 1. 对文件进行jinja2编译
        let result = yield new Promise(function(resolve, reject) {
          JinjaBuilder.buildPythonFileAndRun(nameTemplate, JSON.stringify([conf.TEMPLATE_TEMPORARY_DIR]), data, function(error, content) {
            if (error) {
              return reject(content);
            }
            resolve(content);
          });
        });

        // 2. 进行 pat 编译 （先创建一个临时文件，使用后再删除）
        const filenamePat = basenameTemplate + '_' + Date.now() + path.extname(nameTemplate);
        const filepathPat = path.join(conf.TEMPLATE_TEMPORARY_DIR, './' + filenamePat);
        
        try {
          fs.ensureFileSync(filepathPat);
          fs.writeFileSync(filepathPat, iconv.encode(result, conf.CODE));
          result = this.renderPatTemplate(filepathPat, Object.assign({
            // 不再支持 <!--#CGIEXT# expand include/head_login.pat --> 的语法了
            __include: function(file, data) {
              return `<!--#CGIEXT# expand ${file} -->`;
            }
          }, data), { compileWithExpand: false });
        } catch (e) {
          throw e;
        } finally {
          fs.removeSync(filepathPat);
        }

        thenable.resolve({ code: 200, content: result });
      } catch (e) {
        console.error(e);
        thenable.resolve({
          code: 500,
          content: `<html><head></head><body><pre>${e}</pre></body></html>`
        });
      }
    } else {
      thenable.resolve({
        code: 404,
        content: `<html><head></head><body><pre>模板不存在: ${nameTemplate}</pre></body></html>`
      });
    }

    return thenable;
  }
};


module.exports = {
  build: function(nameTemplate, res, dataDefault) {
    let req = null;
    if (typeof nameTemplate === 'object') {
      req = nameTemplate;
      nameTemplate = dataDefault;
      dataDefault = arguments[3] || {};
    }

    return PatBuilder2.run(req, res, nameTemplate, dataDefault);
  },

  queryStaticResource(filepath, res, next) {
    return PatBuilder2.requestStatic(filepath, res, next);
  }
};