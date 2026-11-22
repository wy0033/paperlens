/* /api/search 接口契约示例（可选路径 B）
 *
 * 运行：node backend/api-search.example.js  然后打开 http://localhost:5174
 * 前端「接入设置」→ 检索数据源选「自定义检索接口」→ Base URL 留空（同源即可）。
 *
 * 重要边界：
 *  - 本文件不含任何知网请求、不含任何账号或 Cookie，只检索你本机放好的题录库。
 *  - 学校 WebVPN 是浏览器会话级代理，会话只属于你自己的浏览器，前端无法复用。
 *    若要接实时检索，请在**你已合法登录的会话内**自行实现取数，仅取题录元数据、
 *    仅响应手动发起的单条检索、不批量抓取、不下载全文，并遵守学校图书馆与知网使用条款。
 *  - 把从知网导出的题录整理成 backend/local-bibliography.json（数组，字段见 DEMO_LIB）即可。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIB = path.join(__dirname, 'local-bibliography.json');
const PORT = Number(process.env.PORT || 5174);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png' };

const DEMO_LIB = [
  { title: '基于联邦学习的校园能耗预测方法研究', authors: ['张三', '李四'], org: '杭州电子科技大学', year: 2024, venue: '计算机学报', downloads: 2134, citations: 18, abstract: '针对校园多楼宇能耗数据分散的问题，提出一种不共享原始数据的联邦预测框架。', keywords: ['联邦学习', '能耗预测'], field: '联邦学习' },
  { title: '面向科研新手的文献术语解释工具设计', authors: ['王五'], org: '杭州电子科技大学', year: 2023, venue: '现代教育技术', downloads: 1560, citations: 27, abstract: '通过对照实验评估术语即时解释对本科生文献阅读理解的影响。', keywords: ['术语解释', '科研新手'], field: '教育技术' }
];

const NOTES = [
  '来源：用户经学校授权导出的题录；撤稿与更正记录需人工核验。',
  '题录不含实验设计信息，方法核查需阅读原文。',
  '题录不含图表与原始数据，一致性无法自动核验。',
  '题录不含引用网络，需人工核查后续验证情况。',
  '题录不含结论原文，不能代替阅读原文得出结论。'
];

function loadLib() {
  try { const j = JSON.parse(fs.readFileSync(LIB, 'utf8')); return Array.isArray(j) ? j : DEMO_LIB; }
  catch (e) { return DEMO_LIB; }
}

function toPaper(raw, i) {
  const title = raw.title || ('未命名题录 ' + (i + 1));
  const ym = String(raw.year || '').match(/(19|20)\d{2}/);
  const sourceUrl = /^https?:\/\//i.test(String(raw.sourceUrl || raw.url || raw.doi || '')) ? String(raw.sourceUrl || raw.url || raw.doi) : '';
  const retrievedAt = raw.retrievedAt || raw.updatedAt || '';
  return {
    id: 'API' + (i + 1), title,
    authors: raw.authors || [], org: raw.org || '未标注单位',
    year: ym ? Number(ym[0]) : 0, venue: raw.venue || '题录导入',
    kind: '导入题录', level: raw.level || '题录导入',
    lang: /[\u4e00-\u9fa5]/.test(title) ? 'zh' : 'en',
    downloads: Number(raw.downloads) || 0, citations: Number(raw.citations) || 0,
    field: raw.field || '未分类', keywords: raw.keywords || [],
    abstract: raw.abstract || '该条题录未包含摘要，深度审查将自动降低证据强度。', abstractZh: '',
    method: { sample: '题录未提供，需人工核验', control: '题录未提供，需人工核验', stats: '题录未提供，需人工核验', dataset: '题录未提供，需人工核验' },
    conclusion: '题录未包含结论原文，需阅读原文后人工补充。',
    innovations: [], limits: ['题录元数据不完整'], terms: [], notes: NOTES.slice(),
    score: 55, minutes: 8, url: sourceUrl, sourceUrl, sourceChannel: raw.sourceChannel || '自定义题录库',
    retrievedAt, sourceProvider: raw.sourceProvider || 'custom', _imported: true
  };
}

function filterPapers(items, keywords, f) {
  const toks = String(keywords || '').toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(p => {
    if (f.school && String(p.org).indexOf(f.school) < 0) return false;
    if (f.yearFrom && p.year && p.year < Number(f.yearFrom)) return false;
    if (f.yearTo && p.year && p.year > Number(f.yearTo)) return false;
    if (f.lang && p.lang !== f.lang) return false;
    if (f.field && p.field !== f.field && p.field !== '未分类') return false;
    if (!toks.length) return true;
    const hay = [p.title, p.abstract, (p.keywords || []).join(' '), p.org, p.venue].join(' ').toLowerCase();
    return toks.some(t => hay.indexOf(t) >= 0);
  }).sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (req.method === 'POST' && url === '/api/search') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const { keywords = '', filters = {} } = JSON.parse(body || '{}');
        const retrievedAt = new Date().toISOString();
        const items = filterPapers(loadLib().map((raw, i) => toPaper(Object.assign({ retrievedAt }, raw), i)), keywords, filters);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ items, note: '本机题录库（学校 WebVPN 合法导出）· /api/search 契约示例' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ items: [], note: '请求解析失败：' + e.message }));
      }
    });
    return;
  }
  // 同源静态服务，避免跨域配置
  const rel = decodeURIComponent(url === '/' ? '/index.html' : url);
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
});

if (require.main === module) {
  server.listen(PORT, () => console.log('PaperLens /api/search 示例已启动：http://localhost:' + PORT));
}

module.exports = { server, toPaper, filterPapers };
