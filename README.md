# 前端项目模拟
PS: 若想精细化定制自己的项目，请使用 [server-similation-toolkit](https://www.npmjs.com/package/server-similation-toolkit)。

为了更好的和公司项目合作，基于 express 编写了一个前端 reload 的配置程序。


简单规则如下:
``` javascript
// config.json
{
  "dir": 项目的绝对路径,
  "temporary": 临时存储目录，默认为 __tmp__
  "staticRoot": statics 的文件，临时目录的哪个位置。默认为 __static__
  "templateRoot": templates 对应的文件，在临时目录的哪个位置。默认为 __template__
  "templates": [
    {
      "from": 项目模板目录，可绝对路径；相对路径，相对于 dir 进行寻址,
      "to": 项目模板，将会被复制到哪个目录，可忽略，不填默认是临时目录
    },
    // 字符串配置，该目录文件，都复制到临时目录
    "./xxx",
    // 对象配置
    {
      // ./xxx 目录的文件，都复制到 临时目录的 ./xxx2 目录
      "./xxx": "./xxx2"
    }
  ],
  "statics": [
    // 参考 templates 的配置
    {
      "from": 静态资源的目录，可绝对路径；相对路径，相对于 dir 进行寻址；可为 uri 域名
    }
  ],
  "data": 数据模拟脚本的路径，默认是 data 目录
  "code": 模板文件的编码，'utf8' 或 'gbk' 之类的
  "pythonOthers": jinjaBuilder 相关的 python 的拓展， 例如: ['./.python/filter.py']，强制给文件注入全局变量 data[当前渲染数据], evn[当前jinja2的环境变量]
}
```

路由配置，有两种形式。

形式一，对象:
``` javascript
// router.js
'use strict';
// router.js 每次保存，都会自动重载整个 router.js，所以千万不要在里面，编写任何文件、现成监听的代码。
// 如果实在有必要编写，可以考虑 require 一个外部的板块
const MockWeb = require('lfp-mock-web');
module.exports = {
  // 配置 get 请求，访问规则为: /xxx.html
  'GET /:page.html': function(req, res, next) {
    res.set('Content-Type', 'text/html');
    res.send('<html><head></head><body>xx</body></html>');
  },
  // 配置静态资源访问规则
  'GET *.:ext': function(req, res, next) {
    // 尝试在临时目录，寻找静态资源，如果没有，则返回 404
    MockWeb.requestStatic(req, res, next);
  }
};
```

形式二，函数:
```javascript
// router.js
'use strict';
module.exports = function(router) {
  // router 有 get/post/all/addRule 4个方法，其中 get/post/all 是 addRule 的语法糖
  // @example: router.addRule('get', '/:page.html', (req, res, next) => {});
  router.get('/:page.html', (req, res, next) => {
    res.set('Content-Type', 'text/html');
    res.send('<html><head></head><body>xx</body></html>');
  });

  // 尝试寻找静态资源
  router.get('*', (req, res, next) => {
    G.requestStatic(req, res, next);
  });
};
```


运行命令:
```
lfp-mock-web -h
```

## API

通过 ``` var G = require('lfp-mock-web'); ``` 可以获取到一些常用的工具。注意，旧版的 api，每个进程，仅支持单个模拟站点。如果调用了多次 inintConfig() 方法，将抛出错误。

  - G.initConfig() || G.createServerByConf()，初始化程序配置，参数: { port: express的端口号, config: '配置文件路径', router: '路由文件路径', clean: 关闭程序是否清空临时目录, openBrowser: 是否打开浏览器 }
  - 通过 ``` const server = initConfig(); server.start(); ``` 启动模拟站点
  - G.Builder，模板编译器的基类
  - G.SimpleBuilder，模板编译器的基类，集成了静态资源查询、模板路径查询等功能
  - [个人项目使用] G.nunjucksBuilder || G.jinjaBuilder，jinja模板编译 Builder，如果要使用，先安装 python 和 jinja2
  - [个人项目使用] G.patBuilder，pat模板编译 Builder，如果你懂这个模板的语法，可以用哈~
  - G.request(url)，发起 GET 请求，返回一个 Promise 对象，结果为 buffers 或 字符串
  - G.request.transmit(options, req)，创建一个转发的请求，返回一个 Promise 对象，结果为 buffers 或 字符串。其中 options 参考 http.request 方法，path 和 method 已经内置处理
  - G.proxy 等于 require('http-proxy-middleware')
  - G.require1(moduleName: 脚本板块名字，带 .js 的, \_\_dirname: 当前运行脚本的目录)，类似于 require，但是每次请求，都会清空require的缓存
  - G.util 内置的一些小工具，有: type(obj: Object)，isHttpURI(url: String)，getIps()，openBrowser(url: String, callback: Function)
  - mw.requestStatic(req, res, next) 在临时目录的静态资源文件夹中，寻找静态资源，如果找不到，则根据 config.json 中配置的 statics 中的外部域名，继续寻找


## 废弃 API:
  - ~~G.util.isHttpURI(url)，是否 http 路径~~
  - ~~G.startExpress()，必须在 initConfig 后使用，启动 express 模拟站点~~
  - ~~G.queryTemplate(name: 模板名字)，返回模板在临时目录的正确路径~~
  - ~~G.queryResource(name: 资源名字)，返回资源在临时目录的正确路径，可能会返回 http(s) 的路径~~
  - ~~G.watcher(files: 需要监听的文件、文件列表, callback: 监听的回调函数, types: 监听的类型，默认为 ['change']，类型有: change-文件更新, unlink-文件删除, add-文件新增、添加监听，具体可参考chokidar)~~
  - ~~G.types.get(name: 文件路径、名字)，返回此文件对应的 content-type 类型~~ 请使用 res.type() 设置类型
  - ~~G.util.isFileExistAndGetName(dirs: 目录列表, name: 文件名字)，从文件列表中，寻找文件，如果文件存在返回全路径，否则返回空字符~~

## node 程序，启动站点模拟

``` javascript
const webMocker = require('lfp-mock-web');
// 初始配置
const mw = webMocker.initConfig({
  port: 3000,
  config: './config.json',
  router: './router.js',
  clean: true,
  openBrowser: true
});
// 启动模拟
mw.start();
```

## 编写Builder

定义:
``` javascript
'use strict';

const Builder = require('lfp-mock-web').SimpleBuilder;

class HtmlBuilder extends Builder {
  constructor() { }

  // 如果没有内容，可忽略
  static *before(options) {
    // options = {req, res, type: 'html', filepath}
    yield super.before(options);
    console.log('before build');
  }

  static *build(options) {
    // options = {req, res, type: 'html', filepath}
    yield super.build(options);
    const content = '-->额外内容<--';
    return { content };
  }

  // 如果没有内容，可忽略
  static *after(options) {
    // options = {req, res, type: 'html', filepath, content}
    yield super.after(options);
    console.log('after build');
  }

  static run(req, res, filepath) {
    // 自动按 before/build/after 顺序调用
    // 返回一个 Promise/a+ 规范的对象
    return super.run(req, res, {
      type: 'html', // SimpleBuilder的after方法，检测到 type=html，会自动设置 res.set('content-type', 'html/text');
      filepath
    });
  }
};

module.exports = HtmlBuilder;
```
使用:
``` javascript
HtmlBuilder.run(req, res, {
  filepath: '/test.html'
}).then(data => {
  // content === '-->额外内容<--'
  res.send(data.content);
});
```


# 更新历史
* 1.0.7：
  修复 watch 文件时，偶尔导致文件内容为空的BUG
* 1.0.4:
  快捷方式复制BUG
* 1.0.3:
  升级 patBuilder，让其支持 jinja2 语法
* 1.0.2:
  修复 jinjaBuilder 不能识别参数的问题；修复静态脚本、样式编码问题
* 1.0.1:
  修复 config.json 中，不能文件复制到目录的BUG
* 1.0.0:
  破坏性升级！from 字段支持 glob 表达式; router配置，支持函数形式
* 0.3.5:
  修正 ie无法 reload 的问题，占用 /.public/ 下的所有请求!!!
* 0.3.3:
  修正静态资源无法找到时，无法正常返回404状态的问题
* 0.3.2:
  清理静态资源多余的log
* 0.3.1:
  bug fix
* 0.3.0：
  重构两个 Builder，添加了模板编译的基类，Builder 和 SimpleBuilder；同时，开放了非命令行启动相关的api。
* 0.2.9:
  修正文件更改过快，导致重载页面后，文件没有更新
* 0.2.8:
  紧急修正域名静态资源，无法获取的问题
* 0.2.7:
  修正 util.isFileExistAndGetName 方法，遇到文件配置，不是目录的BUG
* 0.2.6:
  --open 默认改为 false， util.decode 第二个参数，可接收编码数组，如 util.decode(bytes, ['utf8', 'gbk']) 或 util.decode(bytes, 'gbk');
  request 添加 GET 和 POST 请求转发的辅助函数，request.transmit(options, req); 其中 options 参考 http.request 方法的参数，其中的 path 和 method 内置已经处理，data 为额外的参数配置对象。
* 0.2.5:
  --open 可接收字符串参数，util.getIps() 返回ipv4地址
* 0.2.4:
  修正 nunjucksBuilder 模拟的 json 数据，在 python 文件中，解析不正确，改为读取 json 文件。
* 0.2.3:
  修正 nunjucksBuilder 模拟的 json 数据，在 python 文件中，解析不正确
* 0.2.2:
  修正 pythonOthers 参数，获取不正确
* 0.2.1:
  列举本地可用 IP 地址; 新增 open 参数，用于打开第一个IP地址; util.js 中，寻找地址添加空值判断。
* 0.2.0:
  添加了 queryTemplate/queryResource 两个方法
* 0.1.9:
  新增跟踪文件的所有变化，新增 builder 返回 thenable[类似promise，具体可npm上，搜索 thenablejs] 对象
* 0.1.8:
  修正静态文件，编码问题

# NEXT
  [√] 添加 -lv, --livereload 的参数，用于关闭 livereload 的功能

  [ ] 支持 config 和 router 参数，传入对象，进行配置

  [√] 与gulp/grunt配合使用时，文件监听过快，偶尔导致资导向到临时目录失败 [修复]

  [x] 优化静态资源查询策略，支持 location.search 和 hash 的绝对路径地址

  [√] 支持 glob 表达式，简化站点配置
