/* PaperLens 交互层：检索结果先落地，AI 只在用户明确点击后介入 */
(function () {
  'use strict';
  const PL = window.PaperLens;
  const E = id => document.getElementById(id);
  const esc = PL.esc, num = PL.num;
  const $ = s => document.querySelector(s);
  const isDesktop = !!(window.desktop && window.desktop.isElectron);

  // 根据运行环境（浏览器 / Electron 桌面）调整存储位置文案
  function applyEnvWording() {
    document.querySelectorAll('[data-web][data-desktop]').forEach(el => {
      el.textContent = isDesktop ? el.dataset.desktop : el.dataset.web;
    });
  }

  const CFG_KEY = 'paperlens.cfg.v1';
  const defaultCfg = { source: 'demo', ai: 'demo', base: '', key: '', model: '', openalexKey: '' };
  const SESSION_KEY = 'paperlens.apiKey.session';
  const OPENALEX_KEY_SESSION = 'paperlens.openalexKey.session';
  function readSessionKey() {
    try { return window.sessionStorage ? window.sessionStorage.getItem(SESSION_KEY) || '' : ''; }
    catch (e) { return ''; }
  }
  function writeSessionKey(value) {
    try {
      if (!window.sessionStorage) return;
      if (value) window.sessionStorage.setItem(SESSION_KEY, value);
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* 当前浏览器不支持会话存储时继续运行 */ }
  }
  function readOpenAlexKey() {
    try { return window.sessionStorage ? window.sessionStorage.getItem(OPENALEX_KEY_SESSION) || '' : ''; }
    catch (e) { return ''; }
  }
  function writeOpenAlexKey(value) {
    try {
      if (!window.sessionStorage) return;
      if (value) window.sessionStorage.setItem(OPENALEX_KEY_SESSION, value);
      else window.sessionStorage.removeItem(OPENALEX_KEY_SESSION);
    } catch (e) { /* 当前浏览器不支持会话存储时继续运行 */ }
  }
  let cfg;
  try {
    cfg = Object.assign({}, defaultCfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}'));
    cfg.key = readSessionKey();
    cfg.openalexKey = readOpenAlexKey();
  }
  catch (e) { cfg = Object.assign({}, defaultCfg); }

  /* ---------- 账户 / 登录 / 夜间模式 / 加载名言 ---------- */
  const ACCOUNTS_KEY = 'paperlens.accounts.v1';
  const THEME_KEY = 'paperlens.theme.v1';
  let currentUser = null;

  const QUOTES = [
    { text: '提出一个问题往往比解决一个问题更重要。', author: '爱因斯坦' },
    { text: '读书破万卷，下笔如有神。', author: '杜甫' },
    { text: '业精于勤，荒于嬉；行成于思，毁于随。', author: '韩愈' },
    { text: '博学之，审问之，慎思之，明辨之，笃行之。', author: '《礼记》' },
    { text: '在科学上没有平坦的大道，只有不畏劳苦沿着陡峭山路攀登的人，才有希望达到光辉的顶点。', author: '马克思' },
    { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原' },
    { text: '知识就是力量。', author: '培根' },
    { text: '千里之行，始于足下。', author: '老子' },
    { text: '学而不思则罔，思而不学则殆。', author: '孔子' },
    { text: '如果说我看得更远，那是因为我站在巨人的肩膀上。', author: '牛顿' },
    { text: '天才就是百分之一的灵感加上百分之九十九的汗水。', author: '爱迪生' },
    { text: '路是脚踏出来的，历史是人写出来的。', author: '吉鸿昌' }
  ];

  function readAccounts() {
    try {
      const v = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function writeAccounts(list) {
    try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function hashPass(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return 'h' + h.toString(36);
  }
  let accounts = readAccounts();

  /* 加载页名言轮播 */
  let quoteTimer;
  function startSplashQuotes() {
    const el = E('splashQuote'), au = E('splashAuthor');
    const show = k => { el.textContent = '“' + QUOTES[k].text + '”'; au.textContent = '—— ' + QUOTES[k].author; };
    let i = 0; show(0);
    quoteTimer = setInterval(() => {
      el.classList.add('fade');
      setTimeout(() => {
        i = (i + 1) % QUOTES.length;
        show(i);
        el.classList.remove('fade');
      }, 300);
    }, 2600);
  }
  function finishSplash() {
    clearInterval(quoteTimer);
    E('splash').classList.add('hide');
    showLogin();
  }

  /* 账户管理 */
  function fmtDate(ts) {
    try { const d = new Date(ts); return '创建于 ' + d.toLocaleString(); }
    catch (e) { return ''; }
  }
  function renderAccountManager() {
    E('accountCount').textContent = accounts.length;
    E('accountDatalist').innerHTML = accounts.map(a => '<option value="' + esc(a.name) + '"></option>').join('');
    const root = E('accountManagerList');
    if (!accounts.length) {
      root.innerHTML = '<span class="account-empty">还没有账户，先创建第一个账户吧</span>';
      return;
    }
    root.innerHTML = accounts.map((a, i) =>
      '<div class="account-row"><span class="account-name">' + esc(a.name) + '<small>' + esc(fmtDate(a.createdAt)) + '</small></span>' +
      '<button class="account-del" data-account-index="' + i + '" aria-label="删除账户 ' + esc(a.name) + '">删除</button></div>'
    ).join('');
  }
  function deleteAccount(index) {
    const acc = accounts[index];
    if (!acc) return;
    if (!window.confirm('确定删除账户「' + acc.name + '」吗？删除后不可恢复。')) return;
    accounts.splice(index, 1);
    writeAccounts(accounts);
    renderAccountManager();
    toast('已删除账户「' + acc.name + '」');
  }
  function switchLoginTab(tab) {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
    E('loginPane').hidden = tab !== 'login';
    E('registerPane').hidden = tab !== 'register';
    E('loginError').hidden = true;
  }
  function showLoginError(msg) {
    const box = E('loginError');
    box.textContent = msg; box.hidden = false;
  }
  function isApiConfigured() {
    return (cfg.ai && cfg.ai !== 'demo') ||
           (cfg.source && cfg.source !== 'demo') ||
           !!(cfg.base || cfg.key || cfg.openalexKey);
  }
  function enterApp(name) {
    currentUser = name;
    E('loginOverlay').hidden = true;
    E('userChip').hidden = false;
    E('userName').textContent = name;
    E('userAvatar').textContent = (name || '客').slice(0, 1).toUpperCase();
    E('logoutBtn').hidden = false;
    E('loginError').hidden = true;
    ['loginName', 'loginPass', 'regName', 'regPass', 'regPass2'].forEach(id => { E(id).value = ''; });
    syncOverlayScrollLock();
    toast('欢迎回来，' + name);
    if (!isApiConfigured()) openModal('settingsModal');
  }
  function doLogin() {
    const name = E('loginName').value.trim();
    const pass = E('loginPass').value;
    if (!name) { showLoginError('请输入账户名'); return; }
    const acc = accounts.find(a => a.name === name);
    if (!acc) { showLoginError('账户「' + name + '」不存在，请先创建账户'); return; }
    if (hashPass(pass) !== acc.pass) { showLoginError('密码不正确，请重试'); return; }
    enterApp(name);
  }
  function doRegister() {
    const name = E('regName').value.trim();
    const pass = E('regPass').value;
    const pass2 = E('regPass2').value;
    if (!name) { showLoginError('请输入账户名'); return; }
    if (!/^[\u4e00-\u9fa5A-Za-z0-9_\-]{1,20}$/.test(name)) { showLoginError('账户名仅支持中英文、数字、下划线和短横线，最长 20 个字符'); return; }
    if (accounts.some(a => a.name === name)) { showLoginError('该账户名已存在，不能重名，请换一个名字'); return; }
    if (!pass || pass.length < 4) { showLoginError('密码至少 4 位'); return; }
    if (pass !== pass2) { showLoginError('两次输入的密码不一致'); return; }
    accounts.push({ name: name, pass: hashPass(pass), createdAt: Date.now() });
    if (!writeAccounts(accounts)) { accounts.pop(); showLoginError('本地存储失败，无法创建账户'); return; }
    renderAccountManager();
    enterApp(name);
  }
  function logout() {
    currentUser = null;
    E('userChip').hidden = true;
    E('logoutBtn').hidden = true;
    ['loginName', 'loginPass', 'regName', 'regPass', 'regPass2'].forEach(id => { E(id).value = ''; });
    E('loginError').hidden = true;
    E('loginOverlay').hidden = false;
    renderAccountManager();
    syncOverlayScrollLock();
    focusFirst('loginOverlay');
  }
  function showLogin() {
    renderAccountManager();
    E('loginOverlay').hidden = false;
    syncOverlayScrollLock();
    focusFirst('loginOverlay');
    maybeRemindSleep();
  }
  function maybeRemindSleep() {
    if (document.documentElement.getAttribute('data-theme') !== 'dark') return;
    const h = new Date().getHours();
    if (h >= 22 || h < 6) toast('🌙 已经很晚了，处理完就早点休息吧');
  }

  /* 夜间模式 */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    E('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
    E('themeBtn').title = theme === 'dark' ? '切换日间模式' : '切换夜间模式';
    E('themeBtn').setAttribute('aria-label', theme === 'dark' ? '切换日间模式' : '切换夜间模式');
  }
  function initTheme() {
    let theme = 'light';
    try { theme = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    if (theme !== 'dark' && theme !== 'light') theme = 'light';
    applyTheme(theme);
  }
  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
    if (next === 'dark') toast('🌙 夜间模式已开启，夜深了，记得早点休息');
    else toast('☀️ 已切换回日间模式');
  }

  function bindAuth() {
    E('themeBtn').addEventListener('click', toggleTheme);
    E('logoutBtn').addEventListener('click', logout);
    E('loginBtn').addEventListener('click', doLogin);
    E('loginName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doLogin(); } });
    E('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doLogin(); } });
    E('regBtn').addEventListener('click', doRegister);
    E('regName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doRegister(); } });
    E('regPass2').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doRegister(); } });
    E('manageAccountsToggle').addEventListener('click', () => {
      const list = E('accountManagerList');
      const open = list.hidden;
      list.hidden = !open;
      E('manageAccountsToggle').setAttribute('aria-expanded', String(open));
    });
    E('accountManagerList').addEventListener('click', e => {
      const btn = e.target.closest('[data-account-index]');
      if (btn) deleteAccount(Number(btn.dataset.accountIndex));
    });
    document.querySelectorAll('.login-tab').forEach(t => t.addEventListener('click', () => switchLoginTab(t.dataset.tab)));
  }

  // 校内题录只保存在本机浏览器，IndexedDB 可用时优先使用，并保留 localStorage 回退
  const IMPORT_KEY = 'paperlens.imported.v1';
  const IMPORT_DB = 'paperlens.imported.v2';
  const HISTORY_KEY = 'paperlens.searchHistory.v1';
  const SAVED_FILTERS_KEY = 'paperlens.savedFilters.v1';
  const RECENT_KEY = 'paperlens.recentReading.v1';
  function readLocalList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (e) { return []; }
  }
  function writeLocalList(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  try {
    const saved = JSON.parse(localStorage.getItem(IMPORT_KEY) || '[]');
    if (Array.isArray(saved) && saved.length) PL.setImported(saved);
  } catch (e) { /* 本地缓存损坏时忽略 */ }

  function indexedDbAvailable() {
    return !!(window.indexedDB && typeof window.indexedDB.open === 'function');
  }

  function openImportedDb() {
    return new Promise((resolve, reject) => {
      if (!indexedDbAvailable()) { resolve(null); return; }
      const request = window.indexedDB.open(IMPORT_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('papers')) request.result.createObjectStore('papers', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB 打开失败'));
    });
  }

  function saveImportedToDb(items) {
    return openImportedDb().then(db => {
      if (!db) return;
      return new Promise((resolve, reject) => {
        const tx = db.transaction('papers', 'readwrite');
        const store = tx.objectStore('papers');
        store.clear();
        (items || []).forEach(item => store.put(item));
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error('IndexedDB 保存失败')); };
      });
    });
  }

  function loadImportedFromDb() {
    return openImportedDb().then(db => {
      if (!db) return [];
      return new Promise((resolve, reject) => {
        const tx = db.transaction('papers', 'readonly');
        const request = tx.objectStore('papers').getAll();
        request.onsuccess = () => { db.close(); resolve(Array.isArray(request.result) ? request.result : []); };
        request.onerror = () => { db.close(); reject(request.error || new Error('IndexedDB 读取失败')); };
      });
    });
  }

  function clearImportedFromDb() {
    return openImportedDb().then(db => {
      if (!db) return;
      return new Promise((resolve, reject) => {
        const tx = db.transaction('papers', 'readwrite');
        tx.objectStore('papers').clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error('IndexedDB 清空失败')); };
      });
    });
  }

  function restoreImportedFromDb() {
    loadImportedFromDb().then(items => {
      if (items.length) {
        PL.setImported(items);
        refreshImportStatus();
        doSearch(false);
      } else if (PL.getImported().length) {
        saveImportedToDb(PL.getImported()).catch(() => {});
      }
    }).catch(() => {});
  }

  const state = {
    items: [], keywords: '', basket: [], translated: {}, report: null,
    filters: { school: '', levels: [], minDownloads: 0, minCitations: 0, yearFrom: 0, yearTo: 0, field: '', lang: '', sort: 'relevance', kind: '', oa: false, author: '', venue: '' },
    note: '', searchSeq: 0, searchController: null, searchCache: new Map(),
    history: readLocalList(HISTORY_KEY), savedFilters: readLocalList(SAVED_FILTERS_KEY), recent: readLocalList(RECENT_KEY),
    pendingImport: null, undoImported: null
  };
  let reviewFocus, importFocus;

  /* ---------- 初始化控件 ---------- */
  function initControls() {
    E('levelChecks').innerHTML = PL.levels.map(v =>
      '<span class="check" data-v="' + esc(v) + '">' + esc(v) + '</span>').join('');
    E('fieldSelect').innerHTML += PL.fields.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('');
    E('schoolList').innerHTML = PL.schools.map(v => '<option value="' + esc(v) + '"></option>').join('');
    E('cfgSource').value = cfg.source;
    E('cfgAI').value = cfg.ai;
    E('cfgBase').value = cfg.base || '';
    E('cfgKey').value = cfg.key || '';
    E('cfgModel').value = cfg.model || '';
    E('cfgOpenAlexKey').value = cfg.openalexKey || '';
    renderSearchLibrary();
    updateModeBadge();
    syncFiltersToUI(state.filters);
    refreshImportStatus();
  }

  function updateModeBadge() {
    const map = { demo: '演示数据集', openalex: 'OpenAlex 实时检索', custom: '自定义检索接口' };
    const n = PL.getImported().length;
    E('modeBadge').textContent = (map[cfg.source] || '演示数据集') + (n ? ' · +' + n + ' 篇导入题录' : '');
  }

  function renderLibraryList(id, items, kind) {
    const root = E(id);
    if (!items.length) {
      root.innerHTML = '<span class="library-empty">暂无记录</span>';
      return;
    }
    root.innerHTML = items.map((item, index) => {
      const label = kind === 'recent' ? item.title : (item.label || item.query || '纯条件检索');
      const action = kind === 'history' ? 'history' : (kind === 'saved' ? 'saved' : 'recent');
      return '<div class="library-entry"><button class="library-open" data-library-action="' + action + '" data-index="' + index + '">' + esc(label) + '</button>' +
        (kind === 'saved' ? '<button class="library-remove" data-library-action="remove-saved" data-index="' + index + '" aria-label="删除已保存条件：' + esc(label) + '">删除</button>' : '') + '</div>';
    }).join('');
  }

  function renderSearchLibrary() {
    renderLibraryList('queryHistoryList', state.history, 'history');
    renderLibraryList('savedFiltersList', state.savedFilters, 'saved');
    renderLibraryList('recentReadingList', state.recent, 'recent');
  }

  function recordSearch() {
    const query = E('searchInput').value.trim();
    const entry = { query, keywords: state.keywords, filters: Object.assign({}, state.filters), at: Date.now() };
    const key = JSON.stringify([entry.query, entry.filters]);
    state.history = [entry].concat(state.history.filter(item => JSON.stringify([item.query, item.filters]) !== key)).slice(0, 10);
    writeLocalList(HISTORY_KEY, state.history);
    renderSearchLibrary();
  }

  function saveCurrentFilters() {
    const query = E('searchInput').value.trim();
    const filters = readFilters();
    const key = JSON.stringify([query, filters]);
    if (state.savedFilters.some(item => JSON.stringify([item.query, item.filters]) === key)) {
      toast('这组筛选条件已经保存');
      return;
    }
    state.savedFilters.unshift({ query, keywords: state.keywords, filters, label: query || '纯条件检索', at: Date.now() });
    state.savedFilters = state.savedFilters.slice(0, 10);
    writeLocalList(SAVED_FILTERS_KEY, state.savedFilters);
    renderSearchLibrary();
    toast('已保存当前检索条件');
  }

  function applySavedSearch(entry) {
    E('searchInput').value = entry.query || '';
    state.keywords = entry.keywords || '';
    state.filters = Object.assign({}, state.filters, entry.filters || {});
    syncFiltersToUI(state.filters);
    E('parsedBar').hidden = !entry.query;
    E('parsedChips').innerHTML = '';
    E('parsedKeywords').textContent = entry.query ? '已恢复保存的检索条件' : '';
    doSearch(false);
  }

  function removeSavedSearch(index) {
    state.savedFilters.splice(index, 1);
    writeLocalList(SAVED_FILTERS_KEY, state.savedFilters);
    renderSearchLibrary();
  }

  function readFilters() {
    return {
      school: E('schoolInput').value.trim(),
      levels: Array.from(document.querySelectorAll('#levelChecks .check.on')).map(x => x.dataset.v),
      minDownloads: Number(E('minDownloads').value),
      minCitations: Number(E('minCitations').value),
      yearFrom: Number(E('yearFrom').value) || 0,
      yearTo: Number(E('yearTo').value) || 0,
      field: E('fieldSelect').value,
      kind: E('kindSelect').value,
      oa: E('oaOnly').checked,
      lang: E('langSelect').value,
      sort: E('sortSelect').value,
      author: state.filters.author || '', venue: state.filters.venue || ''
    };
  }

  function syncFiltersToUI(f) {
    E('schoolInput').value = f.school || '';
    document.querySelectorAll('#levelChecks .check').forEach(x => x.classList.toggle('on', (f.levels || []).indexOf(x.dataset.v) >= 0));
    E('minDownloads').value = f.minDownloads || 0;
    E('minCitations').value = f.minCitations || 0;
    E('yearFrom').value = f.yearFrom || '';
    E('yearTo').value = f.yearTo || '';
    E('fieldSelect').value = f.field || '';
    E('kindSelect').value = f.kind || '';
    E('oaOnly').checked = !!f.oa;
    E('langSelect').value = f.lang || '';
    E('sortSelect').value = f.sort || 'relevance';
    E('downloadValue').textContent = f.minDownloads ? '≥ ' + num(f.minDownloads) : '不限';
    E('citationValue').textContent = f.minCitations ? '≥ ' + num(f.minCitations) : '不限';
  }

  function mergeParsed(base, p) {
    const f = Object.assign({}, base);
    if (p.school) f.school = p.school;
    if (p.levels && p.levels.length) f.levels = p.levels.slice();
    if (p.minDownloads) f.minDownloads = p.minDownloads;
    if (p.minCitations) f.minCitations = p.minCitations;
    if (p.yearFrom) f.yearFrom = p.yearFrom;
    if (p.yearTo) f.yearTo = p.yearTo;
    if (p.field) f.field = p.field;
    if (p.lang) f.lang = p.lang;
    if (p.sort && p.sort !== 'relevance') f.sort = p.sort;
    if (p.kind) f.kind = p.kind;
    if (p.oa) f.oa = true;
    if (p.author) f.author = p.author;
    if (p.venue) f.venue = p.venue;
    return f;
  }

  /* ---------- 检索（纯检索，无 AI） ---------- */
  function doSearch(fromQuery) {
    let parsed = null;
    if (fromQuery) {
      parsed = PL.parseQuery(E('searchInput').value);
      state.keywords = parsed.keywords;
      state.filters = mergeParsed(readFilters(), parsed.filters);
      syncFiltersToUI(state.filters);
      E('parsedBar').hidden = !(parsed.chips.length || parsed.keywords);
      E('parsedChips').innerHTML = parsed.chips.map(c => '<span class="pchip">' + esc(c) + '</span>').join('');
      E('parsedKeywords').textContent = parsed.keywords ? '检索词：' + parsed.keywords : '（纯条件检索，无关键词）';
      recordSearch();
    } else {
      state.filters = readFilters();
    }

    if (state.searchController) state.searchController.abort();
    const seq = ++state.searchSeq;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    state.searchController = controller;
    const cacheKey = JSON.stringify({ source: cfg.source, base: cfg.base, keywords: state.keywords, filters: state.filters, imported: PL.getImported().length });
    const cached = state.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.time < 30000) {
      state.items = cached.items;
      state.note = cached.note;
      E('searchBtn').disabled = false;
      E('searchBtn').textContent = '检索文献';
      if (E('resultList').setAttribute) E('resultList').setAttribute('aria-busy', 'false');
      E('emptyRetry').hidden = false;
      renderResults();
      return;
    }

    E('searchBtn').disabled = true;
    E('searchBtn').textContent = '检索中…';
    if (E('resultList').setAttribute) E('resultList').setAttribute('aria-busy', 'true');
    E('emptyRetry').hidden = true;
    E('searchStatus').textContent = '正在检索文献题录';
    E('resultList').innerHTML = '<div class="loading"><div class="spinner"></div><div>正在检索文献题录…（此阶段不调用大模型）</div></div>';
    E('emptyState').hidden = true;
    E('emptyState').dataset.state = '';

    const searchCfg = Object.assign({}, cfg, controller ? { signal: controller.signal } : {});
    PL.search(state.keywords, state.filters, searchCfg).then(res => {
      if (seq !== state.searchSeq || (controller && controller.signal.aborted)) return;
      state.items = res.items || [];
      state.note = res.note || '';
      state.searchCache.set(cacheKey, { time: Date.now(), items: state.items, note: state.note });
      if (state.searchCache.size > 20) state.searchCache.delete(state.searchCache.keys().next().value);
      E('searchBtn').disabled = false;
      E('searchBtn').textContent = '检索文献';
      if (E('resultList').setAttribute) E('resultList').setAttribute('aria-busy', 'false');
      renderResults();
    }).catch(err => {
      if (seq !== state.searchSeq || err.name === 'AbortError') return;
      state.items = [];
      E('resultList').innerHTML = '';
      E('emptyState').hidden = false;
      E('emptyState').dataset.state = 'error';
      E('emptyState').querySelector('h3').textContent = '检索接口不可用';
      E('emptyState').querySelector('p').textContent = err.message + '。可切回「演示数据集」继续演示。';
      E('emptyRetry').hidden = false;
      E('demoFallback').hidden = false;
      if (E('resultList').setAttribute) E('resultList').setAttribute('aria-busy', 'false');
      E('searchStatus').textContent = '检索失败：' + err.message;
      E('searchBtn').disabled = false;
      E('searchBtn').textContent = '检索文献';
      toast('检索失败：' + err.message);
    });
  }

  function cardHtml(p) {
    const inBasket = state.basket.indexOf(p.id) >= 0;
    const translated = !!state.translated[p.id];
    const missing = p._missing || [];
    const metric = field => missing.indexOf(field) >= 0 ? '未知' : num(p[field]);
    const abstract = translated && p.lang === 'en' ? (p.abstractZh || p.abstract) : p.abstract;
    const tags = [
      '<span class="tag level">' + esc(p.level) + '</span>',
      '<span class="tag field">' + esc(p.field) + '</span>',
      p._imported ? '<span class="tag source">导入题录 · 指标待核</span>' : '',
      p._imported ? '<span class="tag platform">来源：' + esc(p.platform || '导入题录') + '</span>' : '',
      p._external ? '<span class="tag platform">来源：' + esc(p.sourceProvider || '外部接口') + '</span>' : '',
      missing.length ? '<span class="tag source">缺失字段：' + esc(missing.join('、')) + '</span>' : '',
      p.oa ? '<span class="tag oa">开放获取 OA</span>' : '',
      p.retractionStatus === 'retracted' ? '<span class="tag hot">来源标记为撤稿</span>' : '',
      p.downloads >= 5000 ? '<span class="tag hot">高下载</span>' : '',
      p.citations >= 100 ? '<span class="tag hot">高被引</span>' : '',
      p.score < 60 ? '<span class="tag hot">建议先核查来源</span>' : ''
    ].join('');
    const langTag = p.lang === 'en' ? '<span class="lang-tag">EN · 支持中译</span>' : '';
    return '<article class="card" data-id="' + esc(p.id) + '">' +
      '<div class="card-top">' +
        '<input class="card-check" type="checkbox" data-act="check" ' + (inBasket ? 'checked' : '') + ' title="勾选加入对比篮">' +
        '<div class="card-main">' +
          '<h3 class="card-title">' + esc(p.title) + langTag + '</h3>' +
          '<div class="card-meta"><span><b>' + esc((p.authors || []).join('、')) + '</b></span>' +
            '<span>' + esc(p.org) + '</span><span>' + p.year + '</span><span>' + esc(p.venue) + '</span>' +
            (p.volumeIssue ? '<span>' + esc(p.volumeIssue) + '</span>' : '') +
            (p.sourceUrl ? '<span>来源：<a href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener noreferrer">打开来源</a></span>' : '<span>来源：未提供，需人工核验</span>') +
            '<span>' + (p.retrievedAt ? '检索时间：' + esc(String(p.retrievedAt).replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')) : '检索时间：未提供，需人工核验') + '</span>' +
            (p.doi ? '<span>DOI：' + esc(p.doi.replace(/^https?:\/\/doi.org\//i, '')) + '</span>' : '') + '</div>' +
          '<div class="tags">' + tags + '</div>' +
          '<p class="card-abstract' + (translated && p.lang === 'en' ? ' translated' : '') + '">' +
            (translated && p.lang === 'en' ? '<b style="color:var(--teal)">中译｜</b>' : '') + esc(abstract) + '</p>' +
          '<div class="card-foot">' +
            '<div class="metrics"><span>下载 <b>' + metric('downloads') + '</b></span>' +
              '<span>被引 <b>' + metric('citations') + '</b></span><span>精读约 <b>' + p.minutes + '</b> 分钟</span></div>' +
            '<div class="actions">' +
              '<button class="act" data-act="basket">' + (inBasket ? '移出对比' : '加入对比') + '</button>' +
              '<button class="act" data-act="light">轻度审查</button>' +
              '<button class="act deep" data-act="deep">深度审查</button>' +
              '<button class="act translate' + (translated ? ' on' : '') + '" data-act="translate">' + (translated ? '已译中文 ✓' : '译成中文') + '</button>' +
              '<button class="act" data-act="path">学习内容</button>' +
              '<button class="act" data-act="cite">引用</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div></article>';
  }

  function renderResults() {
    const n = state.items.length;
    const quality = PL.qualitySummary(state.items);
    const coverage = Math.round(quality.sourceAndTimeCoverage * 100);
    E('resultTitle').textContent = state.keywords ? '「' + state.keywords + '」的检索结果' : '文献检索结果';
    E('resultCount').textContent = '共 ' + n + ' 篇 · 来源链接与检索时间完整率 ' + coverage + '% · ' + state.note + ' · 本阶段未调用大模型';
    E('resultList').innerHTML = state.items.map(cardHtml).join('');
    E('emptyState').dataset.state = n ? '' : 'empty';
    E('emptyState').hidden = n > 0;
    E('emptyRetry').hidden = true;
    E('demoFallback').hidden = true;
    if (!n) {
      E('emptyState').dataset.state = 'empty';
      E('emptyState').querySelector('h3').textContent = '没有命中符合条件的文献';
      E('emptyState').querySelector('p').textContent = '试着放宽下载量 / 被引量，或删掉学校与层次限制。检索式里的关键词也可以更短一些。';
    }
    E('searchStatus').textContent = n ? '检索完成，共找到 ' + n + ' 篇文献' : '检索完成，没有找到符合条件的文献';
    if (E('resultList').setAttribute) E('resultList').setAttribute('aria-busy', 'false');
  }

  /* ---------- 对比篮 ---------- */
  function toggleBasket(id) {
    const i = state.basket.indexOf(id);
    if (i >= 0) state.basket.splice(i, 1);
    else {
      if (state.basket.length >= 5) { toast('对比篮最多放 5 篇，先移出一篇'); return false; }
      state.basket.push(id);
    }
    renderBasket();
    renderResults();
    return true;
  }

  function renderBasket() {
    const ids = state.basket;
    E('basketBar').hidden = ids.length === 0;
    E('basketCount').textContent = ids.length;
    E('basketItems').innerHTML = ids.map(id => {
      const p = state.items.find(x => x.id === id) || { title: id };
      return '<span class="bitem" title="' + esc(p.title) + '">' + esc(p.title.slice(0, 16)) + (p.title.length > 16 ? '…' : '') + '</span>';
    }).join('');
    E('basketHint').textContent = ids.length < 2 ? '再勾选 1 篇即可做多篇对比' : '可提取共同点、差异矩阵与综述骨架';
    E('compareBtn').disabled = ids.length < 2;
  }

  /* ---------- 审查工作台：AI 调用入口 ---------- */
  function showLoading(label) {
    E('reviewKicker').textContent = label;
    E('reviewTitle').textContent = '正在生成…';
    E('reviewEvidence').textContent = '此刻才调用分析引擎';
    E('reviewBody').innerHTML = '<div class="loading"><div class="spinner"></div><div>正在阅读题录并整理证据，请稍候…</div></div>';
    E('reviewPanel').hidden = false;
    E('reviewBackdrop').hidden = false;
    E('exportBtn').disabled = true;
    E('exportPdfBtn').disabled = true;
    syncOverlayScrollLock();
    if (E('reviewClose') && typeof E('reviewClose').focus === 'function') E('reviewClose').focus();
  }

  function recordRecentReading(task, payload) {
    const papers = Array.isArray(payload) ? payload : [payload];
    const entry = {
      task,
      title: Array.isArray(payload) ? papers.length + ' 篇论文对比' : payload.title,
      papers: papers.map(p => Object.assign({}, p)),
      at: Date.now()
    };
    const key = entry.papers.map(p => p.id).join('|') + ':' + task;
    state.recent = [entry].concat(state.recent.filter(item => item.papers.map(p => p.id).join('|') + ':' + item.task !== key)).slice(0, 5);
    writeLocalList(RECENT_KEY, state.recent);
    renderSearchLibrary();
  }

  function openReview(task, payload, label, returnFocus) {
    reviewFocus = returnFocus || document.activeElement;
    recordRecentReading(task, payload);
    showLoading(label);
    PL.analyze(task, payload, cfg).then(rep => {
      state.report = rep;
      E('reviewKicker').textContent = rep.kicker;
      E('reviewTitle').textContent = rep.title;
      E('reviewEvidence').textContent = rep.evidence;
      E('reviewBody').innerHTML = rep.html;
      E('reviewBody').scrollTop = 0;
      E('exportBtn').disabled = false;
      E('exportPdfBtn').disabled = false;
    }).catch(err => {
      state.report = null;
      E('reviewTitle').textContent = '审查失败';
      E('reviewEvidence').textContent = '分析接口未返回可用结果';
      E('reviewBody').innerHTML = '<div class="callout"><b>无法生成报告：</b>' + esc(err.message || '未知错误') + '。请检查接入设置或稍后重试。</div>';
    });
  }

  function closeReview() {
    const wasOpen = !E('reviewPanel').hidden;
    E('reviewPanel').hidden = true;
    E('reviewBackdrop').hidden = true;
    syncOverlayScrollLock();
    if (wasOpen && reviewFocus && typeof reviewFocus.focus === 'function') reviewFocus.focus();
  }

  function exportReport() {
    if (!state.report) return;
    const blob = new Blob([state.report.md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '研途-' + state.report.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) + '.md';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('笔记已导出为 Markdown');
  }

  function buildPrintReport() {
    const rep = state.report;
    const now = new Date().toLocaleString();
    E('printReport').innerHTML =
      '<div class="print-head">' +
        '<div class="print-brand">研途 · 科研入门助手 · 审查报告</div>' +
        '<h1>' + esc(rep.title) + '</h1>' +
        '<div class="print-meta">' + esc(rep.evidence || '') + (rep.evidence ? ' · ' : '') + esc(now) + '</div>' +
      '</div>' +
      '<div class="print-body">' + rep.html + '</div>';
  }

  function exportPdf() {
    if (!state.report) return;
    buildPrintReport();
    if (window.desktop && typeof window.desktop.printToPdf === 'function') {
      window.desktop.printToPdf(state.report.title).then(res => {
        if (res && res.ok) toast('PDF 已导出');
        else if (!(res && res.canceled)) toast('导出 PDF 失败');
      }).catch(() => toast('导出 PDF 失败'));
    } else {
      window.print();
    }
  }

  /* ---------- 小工具 ---------- */
  let toastTimer;
  function toast(msg) {
    const t = E('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  const modalFocus = {};
  let bodyOverflow = '';
  function syncOverlayScrollLock() {
    const isOpen = !E('reviewPanel').hidden || ['importModal', 'settingsModal', 'helpModal', 'loginOverlay'].some(id => !E(id).hidden);
    if (isOpen && document.body.style.overflow !== 'hidden') {
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else if (!isOpen) {
      document.body.style.overflow = bodyOverflow;
    }
  }
  function focusFirst(id) {
    const root = E(id);
    const target = root && root.querySelector ? root.querySelector('input,select,textarea,button') : null;
    if (target && typeof target.focus === 'function') target.focus();
  }
  function openModal(id) {
    modalFocus[id] = document.activeElement;
    E(id).hidden = false;
    syncOverlayScrollLock();
    focusFirst(id);
  }
  function closeModal(id) {
    const wasOpen = !E(id).hidden;
    E(id).hidden = true;
    syncOverlayScrollLock();
    const target = modalFocus[id];
    if (wasOpen && target && typeof target.focus === 'function') target.focus();
  }

  /* ---------- 题录导入（知网 / PubScholar / 万方导出文件） ---------- */
  function refreshImportStatus() {
    const n = PL.getImported().length;
    E('importCount').textContent = n;
    E('importHint').textContent = n ? '已参与检索，可直接搜其题名或关键词' : '导入后可立即用搜索框检索';
    updateModeBadge();
  }

  function showImportPreview(html, warn) {
    const box = E('importPreview');
    box.hidden = false;
    box.className = 'import-preview' + (warn ? ' warn' : '');
    box.innerHTML = html;
  }

  const importFields = [
    ['title', '题名（必填）'], ['authors', '作者'], ['org', '单位 / 机构'],
    ['year', '年份'], ['venue', '来源 / 刊名'], ['downloads', '下载量'],
    ['citations', '被引量'], ['abstract', '摘要'], ['keywords', '关键词'],
    ['level', '文献类型 / 层次'], ['url', 'DOI / 原文链接']
  ];

  function resetImportPreview(message) {
    state.pendingImport = null;
    E('importSave').disabled = true;
    E('importMapping').hidden = true;
    E('importMapping').innerHTML = '';
    E('importPreview').hidden = true;
    if (message) showImportPreview('<b>' + esc(message) + '</b>', true);
  }

  function renderImportMapping(headers) {
    const root = E('importMapping');
    if (!headers || !headers.length) { root.hidden = true; root.innerHTML = ''; return; }
    root.hidden = false;
    root.innerHTML = '<p class="mapping-lead">检测到 CSV 表头，可调整字段对应关系后重新预览。</p>' + importFields.map(([key, label]) => {
      const options = ['<option value="-1">未映射</option>'].concat(headers.map((h, i) => '<option value="' + i + '">' + esc(h) + '</option>'));
      return '<label class="import-map-row"><span>' + esc(label) + '</span><select data-import-field="' + key + '">' + options.join('') + '</select></label>';
    }).join('');
    const defaults = { title: ['题名', '篇名', '标题', 'Title'], authors: ['作者', '作者姓名', 'Author'], org: ['单位', '机构', '作者单位'], year: ['年份', '年', '发表时间', 'Year'], venue: ['来源', '文献来源', '刊名', '期刊', 'Source'], downloads: ['下载量', '下载次数', 'Downloads'], citations: ['被引', '被引次数', 'Citations'], abstract: ['摘要', 'Abstract'], keywords: ['关键词', '主题词', 'Keywords'], level: ['层次', '类型', '文献类型', 'Type'], url: ['DOI', 'doi', '链接', 'URL'] };
    root.querySelectorAll('select').forEach(select => {
      const key = select.dataset.importField;
      const index = headers.findIndex(h => defaults[key].some(alias => String(alias).toLowerCase() === String(h).toLowerCase()));
      if (index >= 0) select.value = String(index);
      else select.value = '-1';
    });
  }

  function currentImportMapping() {
    const mapping = {};
    E('importMapping').querySelectorAll('[data-import-field]').forEach(select => {
      mapping[select.dataset.importField] = select.value;
    });
    return mapping;
  }

  function renderPendingImport(res) {
    state.pendingImport = res;
    E('importSave').disabled = !res.items.length;
    const previewItems = res.items.slice(0, 4).map(p => '<li>' + esc(p.title) + ' · ' + esc(p.org || '单位待核') + ' · ' + (p.year || '年份待核') + '</li>').join('');
    showImportPreview('<b>已解析 ' + res.items.length + ' 条（' + esc(res.format) + '）</b><ul>' + previewItems + (res.items.length > 4 ? '<li>… 其余 ' + (res.items.length - 4) + ' 条</li>' : '') + res.warnings.map(w => '<li>提示：' + esc(w) + '</li>').join('') + '</ul>', res.warnings.length > 0 || !res.items.length);
  }

  function prepareImport() {
    const text = E('importText').value.trim();
    const previousMapping = E('importMapping').hidden ? null : currentImportMapping();
    resetImportPreview();
    if (!text) { showImportPreview('<b>请先粘贴题录内容或选择文件</b>', true); return; }
    const headers = PL.getImportHeaders(text);
    if (headers.length) {
      renderImportMapping(headers);
      if (previousMapping) E('importMapping').querySelectorAll('[data-import-field]').forEach(select => {
        if (Object.prototype.hasOwnProperty.call(previousMapping, select.dataset.importField)) select.value = previousMapping[select.dataset.importField];
      });
    }
    renderPendingImport(PL.parseBibliography(text, E('importPlatform').value, { mapping: headers.length ? currentImportMapping() : undefined }));
  }

  function doImport() {
    const res = state.pendingImport;
    if (!res || !res.items.length) { prepareImport(); toast('请先解析出有效题录'); return; }
    const before = PL.getImported();
    const merged = PL.mergeImported(before, res.items);
    state.undoImported = before;
    const n = PL.setImported(merged.items);
    try { localStorage.setItem(IMPORT_KEY, JSON.stringify(PL.getImported())); }
    catch (e) { toast('本地存储空间不足，本次导入仅在当前页面有效'); }
    saveImportedToDb(PL.getImported()).catch(() => {});
    E('undoImport').hidden = false;
    showImportPreview('<b>已新增 ' + merged.added + ' 条，发现重复 ' + merged.duplicates.length + ' 条</b><ul><li>当前共保留 ' + n + ' 条导入题录</li><li>重复记录已跳过，可点击“撤销上次导入”恢复导入前状态</li></ul>', merged.duplicates.length > 0);
    refreshImportStatus();
    state.basket = []; renderBasket();
    state.searchCache.clear();
    doSearch(false);
    toast('已新增 ' + merged.added + ' 条题录，可直接检索');
  }

  function undoImport() {
    if (!state.undoImported) return;
    PL.setImported(state.undoImported);
    try { localStorage.setItem(IMPORT_KEY, JSON.stringify(PL.getImported())); } catch (e) { /* 忽略 */ }
    saveImportedToDb(PL.getImported()).catch(() => {});
    state.undoImported = null;
    E('undoImport').hidden = true;
    state.searchCache.clear();
    refreshImportStatus();
    showImportPreview('<b>已撤销上次导入</b><ul><li>已恢复导入前的题录列表</li></ul>', false);
    doSearch(false);
    toast('已撤销上次导入');
  }

  function clearImported() {
    try { localStorage.removeItem(IMPORT_KEY); } catch (e) { /* 忽略 */ }
    clearImportedFromDb().catch(() => {});
    PL.setImported([]);
    state.undoImported = null;
    E('undoImport').hidden = true;
    refreshImportStatus();
    showImportPreview('<b>已清空导入题录</b><ul><li>内置演示数据集保持不变</li></ul>', false);
    state.searchCache.clear();
    doSearch(false);
    toast('已清空导入的题录');
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    E('importBtn').addEventListener('click', () => openModal('importModal'));
    E('importClose').addEventListener('click', () => closeModal('importModal'));
    E('importSave').addEventListener('click', doImport);
    E('importClear').addEventListener('click', clearImported);
    E('importPreviewBtn').addEventListener('click', prepareImport);
    E('undoImport').addEventListener('click', undoImport);
    E('importText').addEventListener('input', () => resetImportPreview('内容已更改，请重新解析预览'));
    E('importPlatform').addEventListener('change', () => resetImportPreview('来源已更改，请重新解析预览'));
    E('importMapping').addEventListener('change', prepareImport);
    E('importFile').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
      if (isPdf) {
        const reader = new FileReader();
        reader.onload = ev => {
          const bytes = new Uint8Array(ev.target.result || new ArrayBuffer(0));
          E('importText').value = '';
          resetImportPreview();
          renderPendingImport(PL.parsePdf(bytes, file.name, 'PDF 文件'));
          toast('已读取 PDF：' + file.name + '，请核对后保存导入');
        };
        reader.onerror = () => toast('PDF 读取失败，可尝试用平台导出为题录文本再导入');
        reader.readAsArrayBuffer(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => { E('importText').value = String(ev.target.result || ''); resetImportPreview('文件已读取，请解析预览'); toast('已读取 ' + file.name + '，请点击「解析并预览」'); };
      reader.onerror = () => toast('文件读取失败，可直接粘贴内容');
      reader.readAsText(file, 'utf-8');
    });

    E('searchBtn').addEventListener('click', () => doSearch(true));
    E('emptyRetry').addEventListener('click', () => doSearch(true));
    E('demoFallback').addEventListener('click', () => {
      cfg.source = 'demo';
      state.searchCache.clear();
      updateModeBadge();
      doSearch(false);
    });
    E('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(true); });
    E('examples').addEventListener('click', e => {
      const chip = e.target.closest('[data-q]');
      if (!chip) return;
      E('searchInput').value = chip.dataset.q;
      doSearch(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    E('brandHome').addEventListener('click', e => { e.preventDefault(); E('searchInput').value = ''; resetAll(); });

    E('filterPanel').addEventListener('click', e => {
      const c = e.target.closest('.check');
      if (c) { c.classList.toggle('on'); doSearch(false); }
    });
    E('filterPanel').addEventListener('change', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') doSearch(false); });
    E('filterPanel').addEventListener('input', e => {
      if (e.target.id === 'minDownloads') E('downloadValue').textContent = e.target.value > 0 ? '≥ ' + num(e.target.value) : '不限';
      if (e.target.id === 'minCitations') E('citationValue').textContent = e.target.value > 0 ? '≥ ' + num(e.target.value) : '不限';
    });
    E('resetFilters').addEventListener('click', resetAll);
    E('emptyReset').addEventListener('click', () => { E('searchInput').value = ''; resetAll(); });
    E('advancedToggle').addEventListener('click', () => {
      const open = !E('filterPanel').classList.contains('open');
      E('filterPanel').classList.toggle('open', open);
      E('advancedToggle').setAttribute('aria-expanded', String(open));
      E('advancedToggle').textContent = open ? '收起筛选' : '展开筛选';
    });
    E('queryToolsToggle').addEventListener('click', () => {
      const open = E('queryToolsPanel').hidden;
      E('queryToolsPanel').hidden = !open;
      E('queryToolsToggle').setAttribute('aria-expanded', String(open));
    });
    E('saveFiltersBtn').addEventListener('click', saveCurrentFilters);
    E('queryToolsPanel').addEventListener('click', e => {
      const button = e.target.closest('[data-library-action]');
      if (!button) return;
      const index = Number(button.dataset.index);
      const action = button.dataset.libraryAction;
      if (action === 'remove-saved') { removeSavedSearch(index); return; }
      if (action === 'history' || action === 'saved') {
        const entry = (action === 'history' ? state.history : state.savedFilters)[index];
        if (entry) applySavedSearch(entry);
      } else if (action === 'recent') {
        const entry = state.recent[index];
        if (entry && entry.papers && entry.papers.length) openReview(entry.task, entry.papers.length === 1 ? entry.papers[0] : entry.papers, '最近阅读', E('queryToolsToggle'));
      }
    });

    E('resultList').addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const card = e.target.closest('.card');
      const p = state.items.find(x => x.id === card.dataset.id);
      if (!p) return;
      const act = btn.dataset.act;
      if (act === 'basket') { toggleBasket(p.id); }
      else if (act === 'light') openReview('light', p, '轻度审查');
      else if (act === 'deep') openReview('deep', p, '深度审查 · 五步核查');
      else if (act === 'path') openReview('path', p, '相关学习内容推荐');
      else if (act === 'cite') openReview('cite', p, '引用格式');
      else if (act === 'translate') {
        state.translated[p.id] = !state.translated[p.id];
        renderResults();
        if (p.lang === 'zh') { toast('这篇本身是中文，已为你打开术语对照'); openReview('translate', p, '论文中译'); }
        else if (state.translated[p.id]) { toast('摘要已切换为中文译文'); openReview('translate', p, '论文中译'); }
        else { toast('已恢复原文摘要'); }
      }
    });
    E('resultList').addEventListener('change', e => {
      if (e.target.dataset.act === 'check') {
        const card = e.target.closest('.card');
        const ok = toggleBasket(card.dataset.id);
        if (!ok) e.target.checked = false;
      }
    });

    E('compareBtn').addEventListener('click', () => {
      const items = state.basket.map(id => state.items.find(x => x.id === id)).filter(Boolean);
      if (items.length < 2) return;
      openReview('compare', items, '多篇对比分析');
    });
    E('clearBasket').addEventListener('click', () => { state.basket = []; renderBasket(); renderResults(); });

    E('reviewClose').addEventListener('click', closeReview);
    E('reviewBackdrop').addEventListener('click', closeReview);
    E('exportBtn').addEventListener('click', exportReport);
    E('exportPdfBtn').addEventListener('click', exportPdf);
    document.addEventListener('keydown', e => {
      const loginOpen = !E('loginOverlay').hidden;
      const openModalId = ['importModal', 'settingsModal', 'helpModal'].slice().reverse().find(id => !E(id).hidden);
      const topModal = openModalId ? E(openModalId) : null;
      const reviewOpen = !E('reviewPanel').hidden;
      const root = loginOpen ? E('loginOverlay') : (topModal || (reviewOpen ? E('reviewPanel') : null));
      if (e.key === 'Escape') {
        if (loginOpen) return;
        e.preventDefault();
        if (topModal) closeModal(openModalId);
        else if (reviewOpen) closeReview();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = root && root.querySelectorAll ? Array.from(root.querySelectorAll('button,input,select,textarea,a[href]')).filter(x => !x.disabled && !x.hidden) : [];
        if (focusable.length) {
          const first = focusable[0], last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    });
    ['importModal', 'settingsModal', 'helpModal'].forEach(id => E(id).addEventListener('click', e => { if (e.target === E(id)) closeModal(id); }));

    E('settingsBtn').addEventListener('click', () => openModal('settingsModal'));
    E('settingsClose').addEventListener('click', () => closeModal('settingsModal'));
    E('helpBtn').addEventListener('click', () => openModal('helpModal'));
    E('helpClose').addEventListener('click', () => closeModal('helpModal'));
    E('cfgSave').addEventListener('click', () => {
      cfg = {
        source: E('cfgSource').value, ai: E('cfgAI').value,
        base: E('cfgBase').value.trim(), key: E('cfgKey').value.trim(), model: E('cfgModel').value.trim(),
        openalexKey: E('cfgOpenAlexKey').value.trim()
      };
      writeSessionKey(cfg.key);
      writeOpenAlexKey(cfg.openalexKey);
      localStorage.setItem(CFG_KEY, JSON.stringify(Object.assign({}, cfg, { key: '', openalexKey: '' })));
      state.searchCache.clear();
      updateModeBadge(); closeModal('settingsModal');
      toast('设置已保存，正在按新数据源检索');
      doSearch(false);
    });
  }

  function resetAll() {
    state.keywords = '';
    state.filters = { school: '', levels: [], minDownloads: 0, minCitations: 0, yearFrom: 0, yearTo: 0, field: '', lang: '', sort: 'relevance', kind: '', oa: false, author: '', venue: '' };
    E('parsedBar').hidden = true;
    syncFiltersToUI(state.filters);
    doSearch(false);
  }

  initControls();
  applyEnvWording();
  bind();
  bindAuth();
  renderBasket();
  doSearch(false);
  restoreImportedFromDb();
  initTheme();
  startSplashQuotes();
  setTimeout(finishSplash, 1200);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
