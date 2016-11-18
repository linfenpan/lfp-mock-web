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

# 更新历史

  * 0.1.9:
    新增跟踪文件的所有变化，新增 builder 返回 thenable[类似promise，具体可npm上，搜索 thenablejs] 对象
  * 0.1.8:
    修正静态文件，编码问题
