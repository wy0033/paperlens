/* 打包后钩子：给 Windows 主程序写入图标与版本信息。
 * 因本机关闭了 electron-builder 的内置签名/元数据编辑（避免 winCodeSign 的
 * macOS 符号链接在无 Developer Mode 的 Windows 上解压失败），这里用 rcedit 补齐。
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const appOutDir = context.appOutDir;
  const productFilename = context.packager.appInfo.productFilename;
  const exe = path.join(appOutDir, productFilename + '.exe');
  if (!fs.existsSync(exe)) return;

  const rcedit = path.join(__dirname, '..', 'build-tools', 'rcedit-x64.exe');
  const icon = path.join(__dirname, '..', 'assets', 'icons', 'icon.ico');
  if (!fs.existsSync(rcedit) || !fs.existsSync(icon)) {
    console.log('[afterPack] rcedit/icon not found, skip icon & version');
    return;
  }

  const args = [
    exe,
    '--set-icon', icon,
    '--set-version-string', 'ProductName', '研途',
    '--set-version-string', 'FileDescription', '研途 · 面向科研新手的检索与审查工作台',
    '--set-version-string', 'CompanyName', 'PaperLens',
    '--set-version-string', 'LegalCopyright', 'Copyright © 2026 PaperLens',
    '--set-file-version', '1.0.0.0',
    '--set-product-version', '1.0.0.0'
  ];
  console.log('[afterPack] applying icon/version to ' + exe);
  execFileSync(rcedit, args, { stdio: 'inherit' });
};
