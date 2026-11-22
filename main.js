/* PaperLens 桌面版（Electron 主进程） */
const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: '研途 · 科研入门助手',
    backgroundColor: '#f5f7fc',
    icon: path.join(__dirname, 'assets', 'icons', 'icon-512.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, 'index.html'));

  // 外部链接（如「打开来源」）交给系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 导出 PDF：在渲染层填好打印区（#printReport）后，用打印样式把当前页面输出为 PDF
ipcMain.handle('print-report-to-pdf', async (event, title) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false, error: '未找到窗口' };

  const safeName = (typeof title === 'string' && title.trim() ? title.trim() : '研途报告')
    .replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: '导出 PDF',
    defaultPath: safeName + '.pdf',
    filters: [{ name: 'PDF 文档', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  try {
    const data = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true
    });
    fs.writeFileSync(filePath, data);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});
