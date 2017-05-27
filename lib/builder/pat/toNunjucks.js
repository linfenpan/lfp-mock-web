'use strict';

const START_TAG = '<!--', END_TAG = '-->';
const START_TAG_LENGTH = START_TAG.length;
const END_TAG_LENGTH = END_TAG.length;

function untilNextEnd(html, index) {
  const end = html.indexOf(END_TAG, index);
  let nextIndex, result;
  if (end < 0) {
    nextIndex = html.length;
    result = html.substring(index, nextIndex);
    return {
      next: nextIndex,
      html: result
    }
  }

  result = html.substring(index, end);
  nextIndex = end + END_TAG_LENGTH;
  let list = result.split(START_TAG);
  while (list && list.length > 1) {
    let content = '';
    let times = list.length - 1;
    for (let i = 0; i < times; i++) {
      let newEnd = html.indexOf(END_TAG, nextIndex);
      if (newEnd < 0) {
        break;
      }
      let tmp = html.substring(nextIndex - END_TAG_LENGTH, newEnd);
      result += tmp;
      content += tmp;
      nextIndex = newEnd + END_TAG_LENGTH;
    }
    list = content.split(START_TAG);
  }


  return {
    next: nextIndex,
    html: result
  }
}

function untilNextStart(html, index) {
  let nextIndex = html.indexOf(START_TAG, index);
  let result = '';
  if (nextIndex < 0) {
    result = html.substring(index, html.length);
  } else {
    result = html.substring(index, nextIndex);
    nextIndex = nextIndex + START_TAG_LENGTH;
  }

  return {
    next: nextIndex,
    html: result
  };
}

function safeString(str) {
  return str.replace(/'/g, `\\'`);
}

let loopDeep = 0;
function convertTag(str) {
  str = str.trim();
  if (str.indexOf('#CGIEXT#') >= 0) {
    str = str.replace(/^\s*#CGIEXT#\s*/, '');
    const reg1 = /^expand\s+/i;
    const reg2 = /^const\s+/i;
    if (reg1.test(str)) {
      return '{{ __include("'+ str.replace(reg1, '').replace(/'"/g, '').trim() +'", __ctx__) | safe }}';
    } else if (reg2.test(str)) {
      const arr = /const\s+([^=]+)=['"]@?@?([^'"@]+)@?@?['"]/i.exec(str);
      if (str.indexOf('@@') > 0) {
        return `{# set ${arr[1]} = ${arr[2]} | default(${arr[1]}) #}`;
      } else {
        return `{# set ${arr[1]} = "${arr[2]}" #}`;
      }
    } else {
      // 从 "xxBegin:" 找到 "xxEnd:"，并且加工里面的所有内容，并且修正结束位置~~
      let variable = '';
      if (str.indexOf('Begin') >= 0) {
        variable = str.replace(/\s*(.*)Begin\s*:\s*/g, '$1');
        loopDeep++;
        return [
          `{# if ${loopDeep > 1 ? 'item' + (loopDeep - 1) + '.' + variable : variable} #}`,
          `{# for item${loopDeep} in ${loopDeep > 1 ? 'item' + (loopDeep - 1) + '.' + variable : variable} #}`
        ].join('\n');
      } else {
        loopDeep--;
        return [
          '{# endfor #}',
          '{# endif #}'
        ].join('\n');
      }
    }
  } else {
    if (/^\w*$/g.test(str)) {
      var vals = '';

      if (loopDeep > 0) {
        for (let i = loopDeep; i > 0; i--) {
          if (i === loopDeep) {
            vals += `item${i}.${str} `;
          } else {
            vals += `| default(item${i}.${str})`;
          }
        }
      } else {
        vals += `${str}`;
      }
      vals += ` | default(${str})`;

      return `{{ ${vals} | default(__comments('${safeString(str)}')) | safe }}`;
    } else if (/^\w+\s*?\(\s*?\w+\s*?\)/g.test(str)) {
      let list = /(\w+)\s*\((\w+)\s*\)/g.exec(str);
      let method = list[1];
      let key = list[2];

      var vals = '';
      if (loopDeep > 0) {
        for (let i = loopDeep; i > 0; i--) {
          if (i === loopDeep) {
            vals += `${method}(item${i}.${key}) `;
          } else {
            vals += `| default(${method}(item${i}.${key}))`;
          }
        }
      } else {
        vals = `${method}(${key})`;
      }

      vals += ` | default(${method}(${key}))`;

      return `{{ ${vals} | default(__comments('${safeString(str)}')) | safe }}`;
    }
    return `{{ __comments('${safeString(str)}') | safe }}`;
  }
}

function toNunjucks(html, index) {
  index = index || 0;
  let length = html.length;
  let list = [];

  while (index >= 0 && index <= length) {
    let start = untilNextStart(html, index);
    list.push(start.html);

    if (start.next < 0 || start.next >= length) {
      break;
    }

    let end = untilNextEnd(html, start.next);

    let content = end.html;
    if (/\n|\r/m.test(content) || content.indexOf(START_TAG) >= 0) {
      list.push('<!--' + toNunjucks(content) + '-->');
    } else {
      list.push(convertTag(content));
    }

    index = end.next;
  }

  return list.join('');
}

module.exports = toNunjucks;
