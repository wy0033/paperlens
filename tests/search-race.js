/* 搜索竞态回归：node tests/search-race.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const assets = path.join(__dirname, '..', 'assets');
const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    const listeners = {};
    elements.set(id, {
      id, hidden: false, disabled: false, value: '', textContent: '', innerHTML: '',
      dataset: {}, style: {}, checked: false, tagName: 'DIV', listeners,
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
      addEventListener(type, handler) { listeners[type] = handler; },
      setAttribute() {}, getAttribute() { return ''; }, querySelector(selector) { return element(id + ':' + selector); },
      querySelectorAll() { return []; }, closest() { return null; }, appendChild() {},
      remove() {}, click() { if (listeners.click) listeners.click({ target: this }); }, focus() {},
      scrollTop: 0
    });
  }
  return elements.get(id);
}

const pending = [];
const document = {
  getElementById: element,
  querySelector: selector => element('query:' + selector),
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => element('temporary'),
  documentElement: { setAttribute() {}, getAttribute() { return 'light'; } },
  activeElement: null,
  body: { style: {}, appendChild() {} }
};
const localStorage = {
  getItem(key) { return key === 'paperlens.cfg.v1' ? '{"source":"custom","ai":"demo"}' : null; },
  setItem() {}
};
const sandbox = {
  window: { scrollTo() {}, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} } },
  document, console, Promise, setTimeout, clearTimeout, setInterval, clearInterval, navigator: {},
  URLSearchParams,
  URL: { createObjectURL: () => '', revokeObjectURL() {} }, Blob: function () {}, localStorage,
  fetch: (url, options) => new Promise((resolve, reject) => pending.push({ resolve, reject, options }))
};
vm.createContext(sandbox);
for (const file of ['data.js', 'engine.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(assets, file), 'utf8'), sandbox, { filename: file });
}

function response(title) {
  return { ok: true, json: () => Promise.resolve({ items: [{ id: title, title, year: 2025, sourceUrl: 'https://example.org/paper', retrievedAt: '2026-11-21T00:00:00Z' }], note: 'race test' }) };
}
function check(ok, label) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) process.exitCode = 1;
}

setTimeout(async () => {
  element('searchInput').value = 'new query';
  element('searchBtn').click();
  await Promise.resolve();
  if (pending.length !== 2) {
    check(false, '初始化与用户检索请求均已发出');
    process.exit(1);
  }
  pending[1].resolve(response('最新结果'));
  await new Promise(resolve => setTimeout(resolve, 0));
  pending[0].resolve(response('过期结果'));
  await new Promise(resolve => setTimeout(resolve, 0));
  check(element('resultList').innerHTML.includes('最新结果'), '最新检索结果显示');
  check(!element('resultList').innerHTML.includes('过期结果'), '较早响应不会覆盖最新结果');
  process.exit(process.exitCode || 0);
}, 0);
