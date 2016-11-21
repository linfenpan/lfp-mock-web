# 前端项目模拟

为了更好的和公司项目合作，基于 express 编写了一个前端 reload 的配置程序。

简单规则如下:
``` javascript
// config.json
{
  "dir": 项目的绝对路径,
  "temporary": 临时存储目录，默认为 __tmp__
  "templates": [
    {
      "from": 项目模板目录，可绝对路径；相对路径，相对于 dir 进行寻址,
      "to": 项目模板，将会被复制到哪个目录，可忽略，不填默认是临时目录
    }
  ],
  "templateRoot": templates 对应的文件，在临时目录的哪个位置。默认为 ./
  "statics": [
    {
      "from": 静态资源的目录，可绝对路径；相对路径，相对于 dir 进行寻址；可为 uri 域名
    }
  ],
  "staticRoot": statics 的文件，临时目录的哪个位置。默认为 __static__
  "data": 数据模拟脚本的路径
  "code": 模板文件的编码，'utf8' 或 'gbk' 之类的
  "pythonOthers": nunjucksBuilder 相关的 python 的拓展， 例如: ['./.python/filter.py']，强制给文件注入全局变量 data[当前渲染数据], evn[当前jinja2的环境变量]
}
```

路由配置如下:
``` javascript
// router.js
'use strict';

const Mock = require('lfp-mock-web');
// 提供了两个 builder, 一个是公司的 patBuilder，
// 一个是 jinja 的builder，nunjucksBuilder，不过必须安装 python 的jinja2 才能使用呢~: Mock.nunjucksBuilder.build('index.html', res, {}); 编译临时目录的 index.html 模板
// PS: builder 不是必要的，只是方便生成数据啦~
const patBuilder = Mock.patBuilder;
const staticResource = Mock.staticResource;

// router.js 每次保存，都会自动重载整个 router.js，所以千万不要在里面，编写任何文件、现成监听的代码。
// 如果实在有必要编写，可以考虑 require 一个外部的板块
module.exports = {
  // 配置 get 请求，访问规则为: /pat/xxx.html
  'GET /pat/:page.html': function(req, res, next) {
    // 根据名字，从临时目录，寻找 pat 文件
    //  return 类似 Promise 的对象
    patBuilder.build(req.params.page, res, {
      // 默认数据
    });
  },
  // 配置静态资源访问规则
  'GET *.:ext': function(req, res, next) {
    const ext = req.params.ext.toLowerCase();
    if (['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'txt', 'less', 'scss'].indexOf(ext) >= 0) {
      // 静态资源转发到本地临时目录
      staticResource.query(req, res, next);
    } else {
      // 继续运行之后的规则
      next();
    }
  }
};
```

运行命令:
```
lfp-mock-web -h
```

# API

通过 ``` var M = require('lfp-mock-web'); ``` 可以获取到一些常用的工具

  - M.queryTemplate(name: 模板名字)，返回模板在临时目录的正确路径
  - M.queryResource(name: 资源名字)，返回资源在临时目录的正确路径，可能会返回 http(s) 的路径
  - M.request(url)，发起 GET 请求，返回一个 Promise 对象，结果为 buffers 或 字符串
  - M.require1(moduleName: 脚本板块名字，带 .js 的, \_\_dirname: 当前运行脚本的目录)，类似于 require，但是每次请求，都会清空require的缓存
  - M.watcher(files: 需要监听的文件、文件列表, callback: 监听的回调函数, types: 监听的类型，默认为 ['change']，类型有: change-文件更新, unlink-文件删除, add-文件新增、添加监听，具体可参考chokidar)
  - M.types.get(name: 文件路径、名字)，返回此文件对应的 content-type 类型
  - M.util.isHttpURI(url)，是否 http 路径
  - M.util.isFileExistAndGetName(dirs: 目录列表, name: 文件名字)，从文件列表中，寻找文件，如果文件存在返回全路径，否则返回空字符

# 更新历史
  * 0.2.1:
    列举本地可用 IP 地址; 新增 open 参数，用于打开第一个IP地址; util.js 中，寻找地址添加空值判断。
  * 0.2.0：
    添加了 queryTemplate/queryResource 两个方法
  * 0.1.9:
    新增跟踪文件的所有变化，新增 builder 返回 thenable[类似promise，具体可npm上，搜索 thenablejs] 对象
  * 0.1.8:
    修正静态文件，编码问题
