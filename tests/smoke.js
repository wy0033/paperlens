/* 核心引擎冒烟测试：node tests/smoke.js
 * 验证：检索式解析、条件筛选、审查报告生成，全程离线、不依赖浏览器与网络。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const assets = path.join(__dirname, '..', 'assets');
const sandbox = {
  window: {}, console, Promise, setTimeout, URLSearchParams,
  fetch: () => Promise.reject(new Error('offline smoke test'))
};
vm.createContext(sandbox);
for (const f of ['data.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sandbox, { filename: f });
}
const PL = sandbox.window.PaperLens;
const papers = sandbox.window.PAPER_DATA.papers;
let fail = 0;
function check(ok, label) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) fail++;
}

(async function run() {
  const queries = [
    '联邦学习 隐私保护',
    '浙江大学 博士论文 下载量>1000',
    '近三年 SCI 下载超过5000 大模型',
    '英文论文 引用>100 检索增强生成',
    '浙江工业大学 教育技术 核心期刊',
    'CSSCI 2022年以后 教育技术'
  ];
  for (const q of queries) {
    const parsed = PL.parseQuery(q);
    const res = await PL.search(parsed.keywords, parsed.filters, { source: 'demo', ai: 'demo' });
    check(res.items.length > 0, '检索式命中：' + q + ' → ' + res.items.length + ' 篇（条件 ' + parsed.chips.join('/') + '）');
  }

  // 筛选约束确实生效
  const f = { school: '浙江大学', levels: ['博士学位论文'], minDownloads: 5000, minCitations: 100, yearFrom: 2020, yearTo: 2026, field: '', lang: '', sort: 'downloads' };
  const filtered = await PL.search('', f, { source: 'demo', ai: 'demo' });
  check(filtered.items.length === 1 && filtered.items[0].id === 'P01', '学校/层次/下载量/年份联合筛选生效');

  // 四类报告均能产出 HTML + Markdown，且深度审查包含五步核查与待核验清单
  const sample = papers.slice(0, 3).concat(papers[papers.length - 1]);
  for (const p of sample) {
    for (const task of ['light', 'deep', 'translate', 'path']) {
      const rep = PL.DEMO_AI[task](p);
      check(!!(rep.html && rep.md && rep.title), '报告生成：' + task + ' / ' + p.id);
    }
    const deep = PL.DEMO_AI.deep(p);
    const steps = ['来源核查', '方法核查', '数据核查', '引用核查', '结论核查'];
    check(steps.every(s => deep.html.indexOf(s) >= 0) && deep.html.indexOf('待人工核验') >= 0 && deep.html.indexOf('证据字段') >= 0, '五步核查完整并带证据字段：' + p.id);
  }

  const cmp = PL.DEMO_AI.compare(papers.slice(0, 3));
  check(cmp.html.indexOf('差异矩阵') >= 0 && cmp.html.indexOf('综述写作骨架') >= 0, '多篇对比含差异矩阵与综述骨架');

  // ---- 学校 WebVPN 导出的题录：四种格式解析 + 参与检索 + 缺字段降级 ----
  const csv = [
    '题名,作者,单位,文献来源,发表时间,下载量,被引,摘要,关键词',
    '基于联邦学习的校园能耗预测,张三;李四,杭州电子科技大学,计算机学报,2024-05-12,2134,18,本文提出一种面向校园能耗的联邦预测方法,联邦学习;能耗预测',
    '个性化推荐中的偏差校正研究,王五,浙江大学,软件学报,2023,980,42,针对曝光偏差提出校正方法,推荐系统;偏差校正'
  ].join('\n');
  const tagged = [
    'RT Journal Article',
    'T1 基于深度学习的图像检索方法',
    'A1 赵六;钱七',
    'JF 中国图象图形学报',
    'YR 2022',
    'K1 图像检索;深度学习',
    'AB 提出一种融合局部特征的检索方法。'
  ].join('\n');
  const json = JSON.stringify([{ title: 'Retrieval Augmented Generation for Novice Readers', authors: ['A. Chen'], org: 'HDU', year: 2025, venue: 'Journal of Info', abstract: 'A study of RAG.', keywords: ['RAG', 'reading'] }]);
  const loose = '1. 面向新手的学术术语解释工具研究\n作者：孙八;周九\n来源：现代教育技术 2023 下载 1200 被引 9';

  for (const [label, text] of [['CSV', csv], ['RefWorks', tagged], ['JSON', json], ['纯文本', loose]]) {
    const r = PL.parseBibliography(text);
    check(r.items.length > 0 && !!r.items[0].title, '题录解析：' + label + ' → ' + r.items.length + ' 条 / ' + r.format);
  }
  const imported = PL.parseBibliography(csv).items;
  check(imported[0].org.indexOf('杭州电子科技大学') >= 0 && imported[0].year === 2024 && imported[0].downloads === 2134, 'CSV 字段映射（单位 / 年份 / 下载量）');
  check(imported[0].field === '联邦学习' && imported[1].field === '推荐系统', '导入题录自动推断学科方向');
  check(imported[0].notes.join('').indexOf('需人工核验') >= 0 && imported[0].method.sample.indexOf('需人工核验') >= 0, '缺字段一律降级为需人工核验');

  PL.setImported(imported);
  const merged = await PL.search('', { school: '', levels: [], minDownloads: 0, minCitations: 0, yearFrom: 0, yearTo: 0, field: '', lang: '', sort: 'relevance' }, { source: 'demo', ai: 'demo' });
  check(merged.items.filter(x => x._imported).length === 2 && merged.note.indexOf('导入题录') >= 0, '导入题录合并进检索池');
  const byKeyword = await PL.search('能耗预测', { school: '', levels: [], minDownloads: 0, minCitations: 0, yearFrom: 0, yearTo: 0, field: '', lang: '', sort: 'relevance' }, { source: 'demo', ai: 'demo' });
  check(byKeyword.items.some(x => x._imported && x.title.indexOf('能耗') >= 0), '导入题录可被搜索框命中');
  PL.setImported(PL.parseBibliography(json).items);
  const unknownMetric = await PL.search('', { school: '', levels: [], minDownloads: 5000, minCitations: 0, yearFrom: 0, yearTo: 0, field: '', lang: '', sort: 'relevance' }, { source: 'demo', ai: 'demo' });
  check(unknownMetric.items.some(x => x._imported && x._missing.indexOf('downloads') >= 0), '缺失下载量的题录保留并标记未知');
  const deepImp = PL.DEMO_AI.deep(imported[0]);
  check(deepImp.html.indexOf('待人工核验') >= 0 && deepImp.html.indexOf('证据不足') >= 0, '导入题录的深度审查明确标注证据不足');
  check(PL.setImported([]) === 0 && PL.getImported().length === 0, '清空导入题录');

  // ---- 参考 PubScholar / 万方 新增能力 ----
  const emptyF = { school: '', levels: [], minDownloads: 0, minCitations: 0, yearFrom: 0, yearTo: 0, field: '', lang: '', sort: 'relevance', kind: '', oa: false, author: '', venue: '' };
  const oaParsed = PL.parseQuery('开放获取 OA 英文论文 引用>100');
  const oaRes = await PL.search(oaParsed.keywords, oaParsed.filters, { source: 'demo', ai: 'demo' });
  check(oaParsed.filters.oa === true && oaRes.items.length > 0 && oaRes.items.every(x => x.oa), '开放获取 OA 检索条件生效');

  const kindRes = await PL.search('', Object.assign({}, emptyF, { kind: '学位论文' }), { source: 'demo', ai: 'demo' });
  check(kindRes.items.length > 0 && kindRes.items.every(x => x.kind === '学位论文'), '文献类型筛选生效');

  const bib = '@article{pl2025,\n title={面向科研新手的文献问答系统设计},\n author={吴桐 and 方以宁},\n journal={现代教育技术},\n year={2025},\n keywords={术语解释;科研新手},\n abstract={评估术语解释对阅读理解的影响。}\n}';
  const bibRes = PL.parseBibliography(bib, 'PubScholar');
  check(bibRes.items.length === 1 && bibRes.items[0].authors.length === 2 && bibRes.items[0].platform === 'PubScholar', 'BibTeX 解析与来源平台标记');

  const wanfangCSV = '篇名,作者姓名,作者单位,刊名,年,被引次数,下载次数,摘要,主题词\n面向新手的学术阅读支持研究,孙八;周九,杭州电子科技大学,现代教育技术,2024,12,860,研究辅助阅读工具的效果,术语解释;阅读路径';
  const wf = PL.parseBibliography(wanfangCSV, '万方数据');
  check(wf.items.length === 1 && wf.items[0].org.indexOf('杭州电子科技大学') >= 0 && wf.items[0].citations === 12 && wf.items[0].platform === '万方数据', '万方导出表头别名兼容');

  const customCsv = 'Title,Column B,Column C\n手动映射测试论文,测试作者,2021';
  const headers = PL.getImportHeaders(customCsv);
  const mapped = PL.parseBibliography(customCsv, '自建库', { mapping: { title: '0', authors: '1', year: '2', org: '-1' } });
  check(headers.length === 3 && mapped.items.length === 1 && mapped.items[0].title === '手动映射测试论文' && mapped.items[0].authors[0] === '测试作者' && mapped.items[0].year === 2021, 'CSV 表头识别与自定义字段映射');
  check(mapped.items[0].org === '未标注单位', 'CSV 字段支持明确取消映射');

  const duplicateSet = [
    { title: 'DOI 重复检查', year: 2024, doi: '10.1000/dupe' },
    { title: '同题同年检查', year: 2022 }
  ];
  const deduped = PL.mergeImported(duplicateSet, [
    { title: '不同标题但同 DOI', year: 2025, doi: 'https://doi.org/10.1000/dupe' },
    { title: '同题同年检查', year: 2022 },
    { title: '新论文', year: 2025 }
  ]);
  check(deduped.added === 1 && deduped.duplicates.length === 2 && deduped.items.length === 3, '导入合并可按 DOI 与题名年份识别重复记录');

  const cite = PL.DEMO_AI.cite(papers[0]);
  check(cite.html.indexOf('GB/T 7714') >= 0 && cite.html.indexOf('[D]') >= 0 && cite.md.indexOf('bibtex') >= 0, 'GB/T 7714 与 BibTeX 引用生成');

  const cmp2 = PL.DEMO_AI.compare(papers.slice(0, 3));
  check(cmp2.html.indexOf('关键词知识脉络') >= 0 && cmp2.md.indexOf('关键词知识脉络') >= 0, '多篇对比含关键词知识脉络');

  const asyncRep = await PL.analyze('deep', papers[0], { ai: 'demo' });
  check(asyncRep.html.indexOf('五步核查') >= 0, '异步分析入口（用户点击后才调用）可用');

  const external = PL.normalizeExternalPaper({
    id: 'https://openalex.org/W1', title: '<测试题录>', authors: ['作者'], year: '2024-01-02',
    doi: 'https://doi.org/10.1000/test', cited_by_count: '12', language: 'en',
    primary_location: { landing_page_url: 'https://example.org/paper' },
    open_access: { is_oa: true, oa_url: 'https://example.org/paper.pdf' }, is_retracted: true
  }, 0, 'OpenAlex');
  check(external.year === 2024 && external.citations === 12 && external.oa && external.retractionStatus === 'retracted', '外部题录字段规范化与撤稿信号保留');
  check(external.title.indexOf('<测试题录>') >= 0 && external.sourceUrl.indexOf('example.org') >= 0, '外部题录标题与原文链接保留');
  check(PL.dedupePapers([external, Object.assign({}, external, { id: 'duplicate', doi: '10.1000/test' })]).length === 1, '外部题录按 DOI 去重');

  console.log('\n' + (fail === 0 ? '全部通过 ✓' : fail + ' 项失败 ✗'));
  process.exit(fail === 0 ? 0 : 1);
})();
