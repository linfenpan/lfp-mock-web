'use strict';

const chokidar = require('chokidar');

// 速度非常快
// 文件和目录是区分开的
// add 和 addDir, unlink 和 unlinkDir
var watcher = chokidar.watch(['E://project/charon_pat_static/pat/xyq', 'E://project/charon_pat_static/htdocs/foreground/xyq']).on("all", function(event, path){
    // 命令一执行，就会调用1次add咧
   console.log(event, path);
});
var log = console.log.bind(console);
// 同时，也可以分开 1 个个事件进行监听
watcher
    .on("add", function(path){log("添加文件:" + path)})
    .on("change", function(path){log("文件更变:" + path)})
    .on("unlink", function(path){log("删除文件:" + path)})
    // 更多事件
    .on("addDir", function(path){log("添加目录:" + path)})
    .on("unlinkDir", function(path){log("删除目录:" + path)})
    .on("error", function(path){log("发生错误:" + path)})
    .on("ready", function(){log("准备完成")})
    // 非常深层次的更变，把父级别的变化，都放倒这里来，平时不推荐使用
    // .on("raw", function(event, path, details){log("raw", event, path, details)})