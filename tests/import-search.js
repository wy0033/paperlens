/* 导入题录检索回归：node tests/import-search.js
 * 复现并锁定问题：导入的 PDF / 题录在设置学校、层次等筛选条件后「搜不到」。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const assets = path.join(__dirname, '..', 'assets');
const sandbox = {
  window: {}, console, Promise, setTimeout, URLSearchParams, TextDecoder,
  fetch: () => Promise.reject(new Error('offline import-search test'))
};
vm.createContext(sandbox);
for (const f of ['data.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(assets, f), 'utf8'), sandbox, { filename: f });
}
const PL = sandbox.window.PaperLens;

let fail = 0;
function check(ok, label) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) fail++;
}

const EMPTY = { school: '', levels: [], minDownloads: 0, minCitations: 0, yearFrom: 0, yearTo: 0, field: '', lang: '', sort: 'relevance', kind: '', oa: false, author: '', venue: '' };
const F = extra => Object.assign({}, EMPTY, extra || {});

(async function run() {
  // ---- 1. PDF：文件名「题名_作者」拆开，元数据缺失时不猜也不编 ----
  const pdfBytes = new Uint8Array(Buffer.from('%PDF-1.4\n/Title <FEFF57FA4E8E89C6898BE8AFADE8A880E6A8A1E59E8BE4E0EE6A8A1E4BBBFE5ADA6E4B9A0E79A84E69CBA68B0E88782E887AAE4B8BBE6938DE4BD9CE7AE97E6B395>\n/Author (Ma Chenlong)\n/CreationDate (D:20240101)\n', 'binary'));
  const pdf = PL.parsePdf(pdfBytes, '基于视觉语言模型与模仿学习的机械臂自主操作算法_马晨龙.pdf', 'PDF 文件');
  check(pdf.items.length === 1 && pdf.items[0].title === '基于视觉语言模型与模仿学习的机械臂自主操作算法', 'PDF 十六进制元数据解出中文题名');
  check(pdf.items[0].authors.indexOf('Ma Chenlong') >= 0 && pdf.items[0].year === 2024, 'PDF 作者与年份提取');

  const byName = PL.parsePdf(new Uint8Array(Buffer.from('%PDF-1.4\n', 'binary')), '基于视觉语言模型与模仿学习的机械臂自主操作算法_马晨龙.pdf', 'PDF 文件');
  check(byName.items[0].title === '基于视觉语言模型与模仿学习的机械臂自主操作算法' && byName.items[0].authors[0] === '马晨龙', '无元数据时用文件名拆出题名与作者');
  check(byName.items[0]._missing.indexOf('org') >= 0 && byName.items[0].org === '未标注单位', '缺失单位标记为待核而不是编造');

  // ---- 2. 学校筛选不再静默吞掉单位未知的导入题录 ----
  PL.setImported(byName.items);
  const school = await PL.search('', F({ school: '浙江工业大学' }), { source: 'demo' });
  check(school.items.some(x => x._imported), '学校条件不会筛掉单位未知的导入题录');
  check(!school.importedExcluded.length, '单位未知的导入题录不记为被筛掉');

  // ---- 3. 单位已知但与筛选不符时：结果里剔除，同时给出原因 ----
  const csv = '题名,作者,单位,文献来源,发表时间,下载量,被引\n机械臂抓取策略对比研究,张三,杭州电子科技大学,机器人学报,2024,120,6';
  const known = PL.parseBibliography(csv, 'CNKI · 学校 WebVPN').items;
  PL.setImported(known);
  const other = await PL.search('', F({ school: '浙江工业大学' }), { source: 'demo' });
  check(!other.items.some(x => x._imported), '单位明确不符的题录按条件排除');
  check(other.importedExcluded.length === 1 && other.importedExcluded[0].reasons[0].indexOf('学校/机构') >= 0, '排除原因回传给界面');

  // ---- 4. 层次 / 类型 / 下载量缺失时筛选不生效 ----
  PL.setImported(byName.items);
  const tolerant = await PL.search('', F({ levels: ['SCI一区'], kind: '期刊', minDownloads: 5000, minCitations: 100 }), { source: 'demo' });
  check(tolerant.items.some(x => x._imported), '层次/类型/下载量/被引量缺失时筛选对导入题录不生效');

  // ---- 5. 作者、题名片段与近似题名都能命中 ----
  PL.setImported(known);
  const byAuthor = await PL.search('张三', F(), { source: 'demo' });
  check(byAuthor.items.some(x => x._imported), '可按作者名搜到导入题录');

  const byTitle = await PL.search('机械臂抓取策略', F(), { source: 'demo' });
  check(byTitle.items.some(x => x._imported), '可按题名片段搜到导入题录');

  const fuzzy = await PL.search('机械臂抓取策略对比研究（期刊版）', F(), { source: 'demo' });
  check(fuzzy.items.some(x => x._imported), '题名多出「（期刊版）」等字符仍能命中');

  const miss = await PL.search('联邦学习', F(), { source: 'demo' });
  check(miss.importedNoHit.length === 1 && !miss.importedNoHit.includes(''), '关键词不匹配时回传未命中明细');

  // ---- 6. 只看我的题录：不受数据源与筛选影响 ----
  const mine = await PL.search('', F({ importedOnly: true, school: '浙江大学', minDownloads: 8000 }), { source: 'openalex' });
  check(mine.items.length === 1 && mine.items[0]._imported, '「只看我的题录」只返回导入题录');
  check(mine.note.indexOf('仅检索你的') >= 0, '提示语说明当前仅检索导入题录');

  // ---- 7. RIS / EndNote(.enw) 也能解析并参与检索 ----
  const ris = ['TY  - JOUR', 'TI  - 面向本科生的文献阅读路径推荐', 'AU  - 周六', 'JO  - 现代教育技术', 'PY  - 2023', 'KW  - 阅读路径;推荐', 'ER  - '].join('\n');
  const risParsed = PL.parseBibliography(ris, '万方数据');
  check(risParsed.items.length === 1 && risParsed.items[0].title === '面向本科生的文献阅读路径推荐' && risParsed.items[0].kind === '期刊', 'RIS 标签格式解析并识别文献类型');

  const enw = ['%0 Journal Article', '%A 钱七', '%T 学术阅读中的术语理解障碍研究', '%J 中国远程教育', '%D 2022', '%K 术语;阅读', '%X 研究术语理解障碍的成因。', '%U https://example.org/enw'].join('\n');
  const enwParsed = PL.parseBibliography(enw, 'CNKI · 学校 WebVPN');
  check(enwParsed.items.length === 1 && enwParsed.items[0].title.indexOf('术语理解障碍') >= 0 && enwParsed.items[0].authors[0] === '钱七', 'EndNote .enw 格式解析');

  PL.setImported(risParsed.items.concat(enwParsed.items));
  const risHit = await PL.search('阅读路径', F(), { source: 'demo' });
  check(risHit.items.some(x => x._imported), 'RIS 导入的题录可被检索命中');
  const enwHit = await PL.search('钱七', F(), { source: 'demo' });
  check(enwHit.items.some(x => x._imported), 'ENW 导入的题录可按作者检索命中');

  // ---- 8. 分批导入的题录主键不重复，刷新后不会互相覆盖 ----
  const batch1 = PL.parseBibliography('题名,作者,单位\n第一批题录,甲,浙江大学').items;
  const batch2 = PL.parseBibliography('题名,作者,单位\n第二批题录,乙,浙江大学').items;
  const merged = PL.mergeImported(batch1, batch2);
  check(merged.items.length === 2 && merged.items[0].id !== merged.items[1].id, '分批导入的题录 id 唯一');

  // ---- 9. PDF 内置标题是排版残留时，宁可退回文件名也不写进题录 ----
  const junkPdf = new Uint8Array(Buffer.from('%PDF-1.4\n/Title (Microsoft Word - 新建 Microsoft Word 文档.docx)\n', 'binary'));
  const junk = PL.parsePdf(junkPdf, '基于视觉语言模型与模仿学习的机械臂自主操作算法_马晨龙.pdf', 'PDF 文件');
  check(junk.items[0].title === '基于视觉语言模型与模仿学习的机械臂自主操作算法', 'Word 残留标题被丢弃，改用文件名题名');
  check(junk.warnings.some(w => w.indexOf('内置标题') >= 0), '标题兜底时给出核对提示');

  const enTitle = new Uint8Array(Buffer.from('%PDF-1.4\n/Title (Untitled Document)\n', 'binary'));
  const en = PL.parsePdf(enTitle, '基于视觉语言模型与模仿学习的机械臂自主操作算法_马晨龙.pdf', 'PDF 文件');
  check(en.items[0].title === '基于视觉语言模型与模仿学习的机械臂自主操作算法', '英文垃圾标题不覆盖中文文件名题名');

  // ---- 10. 修正题录：改完题名立刻能被检索命中 ----
  const bad = PL.parsePdf(junkPdf, 'document1.pdf', 'PDF 文件').items;
  PL.setImported(bad);
  const before = await PL.search('机械臂自主操作', F(), { source: 'demo' });
  check(before.items.length === 0 && before.importedNoHit.length === 1, '题名读错时确实搜不到并回传未命中');

  const revised = PL.reviseImported(PL.getImported()[0], { title: '基于视觉语言模型与模仿学习的机械臂自主操作算法', authors: ['马晨龙'], year: '2024' });
  PL.setImported(PL.getImported().map(x => (x.id === revised.id ? revised : x)));
  const after = await PL.search('机械臂自主操作', F(), { source: 'demo' });
  check(after.items.length === 1 && after.items[0]._imported, '修正题名后立即可被检索命中');
  check(revised.id === PL.getImported()[0].id && revised._imported, '修正后保留原 id 与导入标记');
  check(revised._missing.indexOf('org') >= 0 && revised.org === '未标注单位', '修正后缺失单位仍按未知处理');

  // ---- 11. 无导入题录时行为不变 ----
  PL.setImported([]);
  const none = await PL.search('联邦学习', F(), { source: 'demo' });
  check(none.items.length > 0 && !none.items.some(x => x._imported), '清空导入后仍可正常检索内置数据集');

  console.log('\n' + (fail === 0 ? '全部通过 ✓' : fail + ' 项失败 ✗'));
  process.exit(fail === 0 ? 0 : 1);
})();
