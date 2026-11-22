/* UI 初始化冒烟测试：node tests/dom-smoke.js
 * 用极简 DOM 替身跑一遍 app.js 的初始化与首屏渲染，捕捉拼写/空引用错误。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assets = path.join(__dirname, '..', 'assets');

const els = new Map();
function el(id) {
  if (!els.has(id)) els.set(id, {
    id, hidden: false, disabled: false, value: '', textContent: '', innerHTML: '',
    dataset: {}, style: {}, checked: false, tagName: 'DIV',
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener() {}, querySelector() { return el(id + ':child'); },
    closest() { return null; }, appendChild() {}, remove() {}, click() {},
    scrollTop: 0
  });
  return els.get(id);
}
const document = {
  getElementById: el,
  querySelector: s => el('q:' + s),
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => el('tmp'),
  body: { style: {}, appendChild() {} }
};

const sandbox = {
  window: { scrollTo() {} }, document, console, Promise, setTimeout, clearTimeout,
  URLSearchParams, URL: { createObjectURL: () => '', revokeObjectURL() {} },
  Blob: function () {}, localStorage: { getItem: () => null, setItem() {} },
  fetch: () => Promise.reject(new Error('offline'))
};
vm.createContext(sandbox);
for (const f of ['data.js', 'engine.js', 'app.js']) {
  try {
    vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sandbox, { filename: f });
  } catch (e) {
    console.error('FAIL  加载 ' + f + ' 抛出异常：' + e.message);
    process.exit(1);
  }
}
setTimeout(() => {
  const html = el('resultList').innerHTML;
  const count = el('resultCount').textContent;
  const ok = html.indexOf('class="card"') >= 0 && count.indexOf('共 12 篇') >= 0;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + '首屏渲染：' + count);
  console.log(ok ? '全部通过 ✓' : '渲染失败 ✗');
  process.exit(ok ? 0 : 1);
}, 30);
