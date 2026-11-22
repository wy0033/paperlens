/* 第五阶段质量门槛：node tests/quality-gates.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console, Promise, setTimeout, URLSearchParams, Date,
  fetch: () => Promise.reject(new Error('offline')) };
vm.createContext(sandbox);
for (const file of ['data.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', file), 'utf8'), sandbox, { filename: file });
}
const PL = sandbox.window.PaperLens;
let failures = 0;
function check(ok, label) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) failures++;
}

const demo = sandbox.window.PAPER_DATA.papers;
const demoQuality = PL.qualitySummary(demo);
check(demoQuality.total === demo.length, '质量统计覆盖全部演示题录');
check(demoQuality.sourceAndTimeCoverage < 1, '演示数据未伪造来源，未误报为真实数据达标');

const external = PL.normalizeExternalPaper({
  id: 'W1', title: '真实来源示例', year: 2025, doi: 'https://doi.org/10.1000/example',
  retrievedAt: '2026-11-21T00:00:00.000Z'
}, 0, 'OpenAlex');
const externalQuality = PL.qualitySummary([external]);
check(externalQuality.sourceAndTimeCoverage === 1, '真实外部题录具备来源 URL 与检索时间');
check(/^https:\/\//.test(external.sourceUrl), '来源 URL 仅允许 HTTPS');

const deep = PL.DEMO_AI.deep(demo[0]);
check(/证据字段/.test(deep.html) && /待人工核验/.test(deep.html), '离线深度审查每篇包含证据定位与人工核验提示');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'assets', 'app.js'), 'utf8');
check(/role="status"[^>]*aria-live="polite"/.test(html), '检索状态提供屏幕阅读器播报');
check(/role="dialog"[^>]*aria-modal="true"/.test(html), '弹窗与抽屉声明模态语义');
check(/demoFallback/.test(html) && /demoFallback/.test(app), '真实数据源失败提供可执行演示回退');
check(/searchSeq/.test(app) && /AbortController/.test(app), '重复检索具备序列与取消保护');
check(/sourceUrl \? '<span>来源/.test(app) && /检索时间：未提供，需人工核验/.test(app), '结果卡片展示来源与检索时间缺失状态');
check(/esc\(p\.title\)/.test(app) && /esc\(p\.sourceUrl\)/.test(app), '结果卡片题录与来源字段经过 HTML 转义');
check(/function mdToHtml/.test(fs.readFileSync(path.join(root, 'assets', 'engine.js'), 'utf8')) && /'<p>' \+ nl2br/.test(fs.readFileSync(path.join(root, 'assets', 'engine.js'), 'utf8')), 'AI Markdown 渲染经过安全转义路径');

console.log('\n' + (failures ? failures + ' 项质量门槛失败 ✗' : '质量门槛全部通过 ✓'));
process.exit(failures ? 1 : 0);
