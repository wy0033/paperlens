/* PaperLens 桌面版预加载脚本：最小暴露，供渲染层调用桌面能力（如直接导出 PDF）。 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isElectron: true,
  electronVersion: process.versions.electron,
  printToPdf: (title) => ipcRenderer.invoke('print-report-to-pdf', title)
});
