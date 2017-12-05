#!/user/bin/env python
# coding: utf-8

import json
from jinja2 import Environment, FileSystemLoader
import sys

reload(sys)
sys.setdefaultencoding('utf-8')

import traceback

paths = ${paths};
env = Environment(
    loader = FileSystemLoader(paths, encoding = 'utf-8'),
    cache_size = -1,
    autoescape = True,
    extensions = ['jinja2.ext.do', 'jinja2.ext.with_']
)

dataStr = '{}'
file_object = open(${pathData},'r')
try:
     dataStr = file_object.read()
finally:
     file_object.close()

data = json.loads(dataStr)

${contentOther}

def __render(map):
    print 'START=============@@@=============START'
    try:
        template = env.get_template('${nameTemplate}')
        print template.render(**map)
    except Exception, e:
        print '<pre>'
        print 'message:\n', e.message
        print '\ndetail:\n%s' % traceback.format_exc()
        print '</pre>'
    finally:
        print 'END=============@@@=============END'

__render(data)
