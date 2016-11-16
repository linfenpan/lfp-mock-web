#!/user/bin/env python
# coding: utf-8

import json
from jinja2 import Environment, FileSystemLoader
import sys
reload(sys)
sys.setdefaultencoding('utf-8')

paths = ["E:\\github\\wy\\puer\\__tmp_config_bw"];
env = Environment(
    loader = FileSystemLoader(paths, encoding = 'utf-8'),
    cache_size = -1,
    autoescape = True,
    extensions = ['jinja2.ext.do', 'jinja2.ext.with_']
)
data_str = '''
{"keywords":"藏宝阁,大话西游3,交易平台,大话3,网易,网易游戏交易平台,网易游戏","description":"网易游戏大话西游3官方线下交易平台，每一笔交易都与游戏数据对应，支持多种支付方式。买号选装备，上网易游戏藏宝阁。安全：系统监控，自动交易。方便：多种支付，立等可取","title":"藏宝阁_《大话西游3》官方线下交易平台","MkeyURL":"http://mkey.163.com/download/?from=cbg-xyq","ResUrl":"http://localhost:3000","ResUrlVer":"http://localhost:3000","static_version":"../","CgiRootUrl":"http://zmq.cbg.dev.webapp.163.com:8103/cbg","ProjectNameCN":"西楚霸王"}
'''
data = json.loads(data_str.strip())


# 全局，将会存在 env 和 data 两个变量，data 是 dict 类型，env 是 jinja2 模板的环境

import json
import jinja2
import time
from datetime import datetime, timedelta, date
import urllib
import urlparse
import re

def isset(v):
   try :
     type (eval(v))
   except :
     return  0
   else :
     return  1

class ObjectJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if type(obj) in (time.struct_time, datetime):
            return str(obj)
        return super(ObjectJSONEncoder, self).default(obj)

def json_object(obj, cls=ObjectJSONEncoder):
    if isset('obj'):
        return json.dumps(obj, cls = cls)
    else:
        return 'null'

def json_byte(obj):
    return json.dumps(obj, ensure_ascii=False)

TIME_FORMAT = "%Y-%m-%d %H:%M:%S"
def parse_datetime(date_str):
    try:
        return datetime.strptime(date_str, TIME_FORMAT)
    except (ValueError):
        pass
    return None

def get_remain_days(date_time):
    if isinstance(date_time, basestring):
        date_time = parse_datetime(date_time)

    d = date_time - datetime.now()
    days = d.days
    if d.seconds:
        days += 1
    return days

def get_remain_time_str(date_time, min_minute=5, add_lt=False):
    return get_remain_time_str_common(date_time, False, min_minute, add_lt)

def get_remain_time_str_common(date_time, is_app=False, min_minute=5, add_lt=False):
    if not date_time:
        return ""

    tnow = datetime.now()

    if isinstance(date_time, basestring):
        date_time = parse_datetime(date_time)
    elif isinstance(date_time, (int, long)):
        date_time = datetime.fromtimestamp(date_time)

    try:
        d = date_time - tnow
    except TypeError:
        return ""

    minute_format = "分钟"
    if d < timedelta(seconds=min_minute*60):
        ret = "%s%s" % (min_minute, minute_format)
        if add_lt:
            ret = "少于" + ret
        return ret

    if d.days == 0:
        if d.seconds/3600 == 0:
            return "%s%s" % ((d.seconds%3600)/60, minute_format)
        else:
            return "%s小时%s%s" % (d.seconds/3600, (d.seconds%3600)/60,
                    minute_format)
    else:
        if is_app:
            return "%s天%s小时" % (d.days, d.seconds/3600)
        else:
            return "%s天%s小时%s%s" % (d.days, d.seconds/3600, (d.seconds%3600)/60,
                    minute_format)

def fen2yuan(fen, default_var=None):
    try:
        return float(int(fen))/100
    except (ValueError, TypeError):
        return default_var

def hide_urs(urs):
    index = urs.find('@')
    if index == 0:
        prefix = urs
        postfix = ''
    elif index == -1:
        prefix = urs
        postfix = '@163.com'
    else:
        prefix = urs[0:index]
        postfix = urs[index:]
    length = len(prefix)
    if length <= 4:
        prefix = prefix[0] + '*'
    else:
        prefix = prefix[0] + '*' + prefix[-3:]
    if len(postfix) > 8:
        postfix = postfix[0:4] + '*' + postfix[-3:]
    return prefix + postfix

def get_block_mobile(mobile):
    return mobile[:3] +'*****' + mobile[-3:]

class UpdateUrlQueryToggle(object):
    def __init__(self, value):
        self.value = value

def update_url_query(url, **kwargs):
    parts = urlparse.urlparse(url)
    query_dict = urlparse.parse_qs(parts[4])
    for (key, value) in kwargs.iteritems():
        if not value:
            query_dict.pop(key, None)
        elif isinstance(value, UpdateUrlQueryToggle):
            if query_dict.get(key) == [value.value]:
                query_dict.pop(key)
            else:
                query_dict[key] = value.value
        else:
            query_dict[key] = value
    parts = list(parts)
    parts[4] = urllib.urlencode(query_dict, True)
    return urlparse.urlunparse(parts)

def update_url_page(url, page):
    if page > 1:
        return update_url_query(url, page=page)
    else:
        return update_url_query(url, page='')

def adjust_money_equip_name(equip_name, storage_type, equip_count):
    if storage_type == 3: # STORAGE_TYPE_MONEY
        equip_name += ' ' + str(equip_count) + '两'
    return equip_name

def add_thousand_separator(s):
    s = str(s)
    while True:
        r = re.sub(r'(\d+)(\d\d\d)(?:[.,]|$)', r'\1,\2', s)
        if r == s:
            break
        s = r
    return r

_GAME_COLOR_MAP = {
    'G': '008000',
    'B': '0000ff',
    'Y': 'ffff00',
    'W': 'ffffff',
    'R': 'ff0000',
}
def game_color_desc_to_html(s):
    off = 0
    r = ''
    cur_color = None

    for m in re.finditer(r'#(c[0-9a-f]{6}|[nrGBYWR])', s):
        r += htmlEncodeStr(s[off:m.start()])
        off = m.end()

        spec = m.group(1)
        if spec == 'n':
            if cur_color:
                r += '</span>'
            cur_color = None
        elif spec == 'r':
            r += '<br>'
        else:
            if cur_color:
                r += '</span>'
            if spec.startswith('c'):
                cur_color = spec[1:]
            else:
                cur_color = _GAME_COLOR_MAP.get(spec)
            if cur_color:
                r += '<span style="color:#' + cur_color + '">'

    r += htmlEncodeStr(s[off:])
    if cur_color:
        r += '</span>'

    return r

def htmlEncodeStr(s):
    """    Return the HTML encoded version of the given string.
        This is useful to display a plain ASCII text string on a web page.
    """
    htmlCodes = [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;']]
    for code in htmlCodes:
        s = s.replace(code[0], code[1])
    return s

JINJA2_FILTERS = {
    'JSONLoads': json.loads,
    'JSONDumps': lambda obj: jinja2.Markup(json_object(obj)),
    'JSONByte': lambda obj: jinja2.Markup(json_byte(obj)),
    'RemainTime': get_remain_time_str,
    'RemainDays': get_remain_days,
    'Fen2Yuan': lambda fen: '%.2f' % fen2yuan(fen),
    'HideUrs': hide_urs,
    'HideMobile': get_block_mobile,
    'UpdateQuery': update_url_query,
    'UpdatePage': update_url_page,
    'MoneyAmountDesc': lambda x: '%s两' % x,  # 不同游戏这个函数不同，暂时用这个代替
    'SafeRedirectUrl': lambda x: x,  # 用来过滤到恶意URL，前端开发可以用这个函数代替
    'AdjustMoneyEquipName': adjust_money_equip_name,
    'YesOrNo': lambda cond: '是' if cond else '否',
    'ColorDesc': lambda s: jinja2.Markup(game_color_desc_to_html(s)),
    'ThousandSep': add_thousand_separator,
}

# 添加 filters
for key in JINJA2_FILTERS:
    env.filters[key] = JINJA2_FILTERS[key]


# 添加默认方法
def poundage_calc(price=100, percent=1):
    return (
        int(price),
        int(price) * int(percent) / 100
    )
data['poundage_calc'] = poundage_calc

def Decimal(val):
    return int(val)
data['Decimal'] = Decimal


template = env.get_template('user_login_common.html')

def __render(tmp, map):
    print 'START=============@@@=============START'
    print tmp.render(**map)
    print 'END=============@@@=============END'

__render(template, data)
