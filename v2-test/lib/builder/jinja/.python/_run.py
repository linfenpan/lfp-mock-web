#!/user/bin/env python
# coding: utf-8

import json
from jinja2 import Environment, FileSystemLoader
import sys
reload(sys)
sys.setdefaultencoding('utf-8')

paths = ${paths};
env = Environment(
    loader = FileSystemLoader(paths, encoding = 'utf-8'),
    cache_size = -1,
    autoescape = True,
    extensions = ['jinja2.ext.do', 'jinja2.ext.with_']
)

dataStr = '{}'
file_object = open('${pathData}','r')
try:
     dataStr = file_object.read()
finally:
     file_object.close()

data = json.loads(dataStr)

${contentOther}

template = env.get_template('${nameTemplate}')

def __render(tmp, map):
    print 'START=============@@@=============START'
    print tmp.render(**map)
    print 'END=============@@@=============END'

__render(template, data)
