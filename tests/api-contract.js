/* 自定义检索接口契约测试：node tests/api-contract.js */
const { server } = require('../backend/api-search.example');

function check(ok, label) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label);
  if (!ok) process.exitCode = 1;
}

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  try {
    const response = await fetch('http://127.0.0.1:' + port + '/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: '联邦学习', filters: {} })
    });
    const body = await response.json();
    check(response.status === 200, 'POST /api/search 返回 200');
    check(Array.isArray(body.items), '响应 items 为数组');
    check(typeof body.note === 'string' && body.note.length > 0, '响应包含 note 说明');
    check(body.items.every(item => item.id && item.title && typeof item.year === 'number'), '题录字段满足 Paper 基础结构');
    check(body.items.every(item => Number.isFinite(Date.parse(item.retrievedAt))), '检索接口为每条结果提供有效检索时间');
    check(body.items.every(item => !item.sourceUrl || /^https?:\/\//i.test(item.sourceUrl)), '检索接口来源字段仅包含 HTTP(S) 链接');
  } catch (error) {
    check(false, 'API 契约请求失败：' + error.message);
  } finally {
    server.close(() => process.exit(process.exitCode || 0));
  }
});
