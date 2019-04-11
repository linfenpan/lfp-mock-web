#!/user/bin/env python
# coding: utf-8

import json
from jinja2 import Environment, FileSystemLoader
import sys

reload(sys)
sys.setdefaultencoding('${encoding}')

import traceback

paths = ${paths};
env = Environment(
    loader = FileSystemLoader(paths, encoding = '${encoding}'),
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
        print '<html><head></head><body><pre>'
        print 'message:\n', e.message
        print '\ndetail:\n%s' % traceback.format_exc()
        print '</pre></body></html>'
    finally:
        print 'END=============@@@=============END'

__render(data)
