;(function(){
	var ajax, newAjax;
	if (window.XMLHttpRequest){// code for IE7+, Firefox, Chrome, Opera, Safari
	    newAjax = function(){
	        return new XMLHttpRequest()
	    };
	}else{// code for IE6, IE5
	    newAjax = function(){
	        return new ActiveXObject("Microsoft.XMLHTTP");
	    }
	};
	function stringify(obj){
		if(obj){
			var list = [];
			for(var i in obj){
				if(obj.hasOwnProperty(i)){
					list.push(i + "=" + obj[i]);
				}
			}
			return list.join("&");
		}
		return "";
	};
  function merge(obj, target) {
    for (var i in target) {
      if (target.hasOwnProperty(i)) {
        obj[i] = target[i];
      }
    }
    return obj;
  }
  function toJSON(str) {
    return (new Function('return ' + str))();
  }
  // params = { method: 'GET', url: '', sync: false, data: 数据, fail: fn, success: fn, always: fn }
  var ajax = function(params){
    params = params || {};
    merge(params, {
      method: (params.method || 'GET').toUpperCase(),
      url: params.url || '',
      // 是否异步
      async: params.sync === true ? false : true
    });

    var xmlHttp = newAjax();
    xmlHttp.onreadystatechange = function(){
      // 4 = "loaded"
      // 200 = "OK"
      if(xmlHttp.readyState == 4){
        xmlHttp.onreadystatechange = null;
        if(xmlHttp.status == 200 || xmlHttp.status == 302){
          params.success && params.success.call(this, this.responseText);
        }else{
          params.fail && params.fail.call(this);
        }
        params.always && params.always.call(this);
      }
    };
    var dataParams = typeof params.data == "string" ? params.data : stringify(params.data);
    if(params.method == "POST"){
      xmlHttp.open("POST", params.url, params.sync || true);
      // 把提交的数据，设置为表单格式提交
      xmlHttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
      xmlHttp.send(dataParams);
    }else{
      params.url += params.url.indexOf("?") > 0 ? "" : "?";
      params.url += dataParams;
      // 发送数据
      xmlHttp.open("GET", params.url, params.sync || true);
      xmlHttp.send(null);
    }
  };

  var lastModifyTime = '';
  function checkAndReload() {
    ajax({
      url: '/.public/reload',
      method: 'GET',
      data: { last: lastModifyTime },
      success: function(data) {
        data = toJSON(data);
        if (!lastModifyTime) {
          lastModifyTime = data.time || '';
        } else if (data && data.time && data.time != lastModifyTime) {
          window.location.reload();
        }
        checkAndReload();
      },
      fail: function() {
        checkAndReload();
      }
    });
  }
  checkAndReload();
})(window);
