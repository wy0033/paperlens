# 把 PaperLens 打包成 APP

本项目是纯静态网页，可用两种方式生成 APP（已全部配置好）。

## 方式一：可安装网页应用（PWA，推荐 · 免下载）

已内置 `manifest.webmanifest` + `sw.js` + 图标，电脑/手机浏览器一键“安装”成独立 APP，支持离线打开。

1. 在项目根目录启动任意 HTTP 服务（`file://` 直开无法安装 PWA，必须走 http）：

   ```bash
   python -m http.server 8000
   # 或
   npx http-server -p 8000
   ```

2. 浏览器打开 `http://localhost:8000`：
   - Chrome / Edge：地址栏右侧出现「安装」图标 → 点安装。
   - 手机浏览器：菜单里选「添加到主屏幕 / 安装应用」。

3. 之后从桌面 / 主屏幕图标进入，就是一个独立 APP。

> 发布新版本后，记得把 `sw.js` 顶部的 `CACHE` 版本号 +1，否则老缓存可能不更新。

## 方式二：Windows 桌面应用（Electron，可生成 .exe）

需要联网下载约 100MB 依赖（一次性）。

```bash
# 1. 安装依赖（electron + electron-builder）
pnpm install
# 或：npm install

# 2. 开发模式直接运行（不用打包，先看效果）
pnpm start

# 3. 打包成 Windows 安装包（.exe）
pnpm run build
```

- 打包产物输出到 `dist/`，文件名类似 `研途 Setup 1.0.0.exe`。
- 想只出免安装目录版（不生成安装器）可用 `pnpm run build:dir`。
- 打包后会自动执行 `build-hooks/afterPack.js`，用 `build-tools/rcedit-x64.exe` 给主程序写入图标与版本信息（因为本机未开 Windows「开发者模式」，内置签名/元数据编辑会因 winCodeSign 里的 macOS 符号链接解压失败而被关闭）。`build-tools/rcedit-x64.exe` 缺失时只会跳过图标，不影响打包成功。

## 说明

- 账户、登录态、导入题录、主题等数据仍保存在本机（localStorage / IndexedDB），与网页版一致，不会上传。
- Electron 版默认 `contextIsolation` + 关闭 `nodeIntegration`，外部链接交由系统浏览器打开。
