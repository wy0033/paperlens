/* 网络请求保护回归测试：node tests/network-guards.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class TestAbortController {
  constructor() {
    const listeners = new Set();
    this.signal = {
      aborted: false,
      addEventListener(type, listener) { if (type === 'abort') listeners.add(listener); },
      removeEventListener(type, listener) { if (type === 'abort') listeners.delete(listener); }
    };
    this.abort = () => {
      if (this.signal.aborted) return;
      this.signal.aborted = true;
      Array.from(listeners).forEach(listener => listener());
    };
  }
}

function loadEngine(fetch, setTimeoutImpl) {
  const sandbox = {
    window: {}, console, Promise, URLSearchParams, Date,
    AbortController: TestAbortController, fetch,
    setTimeout: setTimeoutImpl || setTimeout,
    clearTimeout: () => {}
  };
  vm.createContext(sandbox);
  for (const file of ['data.js', 'engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', file), 'utf8'), sandbox, { filename: file });
  }
  return sandbox.window.PaperLens;
}

function check(ok, label) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) process.exitCode = 1;
}

const filters = { school: '', levels: [], minDownloads: 0, minCitations: 0, yearFrom: 0, yearTo: 0, field: '', lang: '', sort: 'relevance', kind: '', oa: false, author: '', venue: '' };

(async function run() {
  const pendingFetch = (url, request) => new Promise((resolve, reject) => {
    request.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });
  const PL = loadEngine(pendingFetch);
  const external = new TestAbortController();
  const cancelled = PL.search('', filters, { source: 'custom', base: 'http://example.test', signal: external.signal });
  external.abort();
  try {
    await cancelled;
    check(false, '外部 AbortSignal 取消请求');
  } catch (error) {
    check(error.name === 'AbortError', '外部 AbortSignal 取消请求');
  }

  const immediateTimer = callback => { callback(); return 1; };
  const timedOut = loadEngine(pendingFetch, immediateTimer).search('', filters, { source: 'custom', base: 'http://example.test' });
  try {
    await timedOut;
    check(false, '请求超时返回 TimeoutError');
  } catch (error) {
    check(error.name === 'TimeoutError' && error.message === '请求超时', '请求超时返回 TimeoutError');
  }

  const paper = PL.search('', filters, { source: 'demo' }).then(result => result.items[0]);
  const samplePaper = await paper;
  async function reviewWith(content) {
    const reviewEngine = loadEngine(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content } }] })
    }));
    return reviewEngine.analyze('deep', samplePaper, { ai: 'custom' });
  }
  const oversized = await reviewWith('x'.repeat(60001));
  check(oversized.kicker.indexOf('回退离线引擎') >= 0 && oversized.evidence.indexOf('60,000') >= 0, '超长 AI 响应回退离线审查');
  const emptyResponse = await reviewWith('');
  check(emptyResponse.kicker.indexOf('回退离线引擎') >= 0 && emptyResponse.evidence.indexOf('AI 返回空响应') >= 0, '空 AI 响应回退离线审查');
  const withoutEvidence = await reviewWith('<script>alert(1)</script>');
  check(withoutEvidence.html.indexOf('<script>') < 0 && withoutEvidence.html.indexOf('&lt;script&gt;') >= 0, '无证据 AI 输出提示复核且转义 HTML');
  const vagueSource = await reviewWith('来源可供参考。');
  check(vagueSource.html.indexOf('证据提示') >= 0 && vagueSource.md.indexOf('需人工核验') >= 0, '泛泛提及来源仍触发证据定位与人工核验提示');

  const sourceInjection = PL.normalizeExternalPaper({ title: '来源注入', sourceUrl: 'javascript:alert(1)' }, 0, 'custom');
  check(sourceInjection.sourceUrl === '' && !sourceInjection.retrievedAt, '不安全来源链接被丢弃且缺失检索时间不被伪造');

  console.log('\n' + (process.exitCode ? '回归测试失败 ✗' : '全部通过 ✓'));
  process.exit(process.exitCode || 0);
})();
