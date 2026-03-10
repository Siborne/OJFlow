# 自动更新（Updater）

本文档描述 OJFlow 的自动更新策略与实现约定：版本检测、下载、替换/安装、重启，以及 CI 注入版本号的方式。

## 远端版本文件（Manifest）格式

应用启动与“检查更新”都会请求一个 JSON 文件。支持两种格式：

### 格式 A：自定义 Manifest（推荐）

```json
{
  "version": "v1.0.2",
  "notes": "1) 修复…\n2) 新增…",
  "homepageUrl": "https://github.com/Siborne/OJFlow/releases/latest",
  "packages": {
    "win32": { "url": "https://example.com/OJFlow-Setup-1.0.2.exe" },
    "darwin": { "url": "https://example.com/OJFlow-1.0.2.dmg" },
    "linux": { "url": "https://example.com/OJFlow-1.0.2.AppImage" }
  }
}
```

- `version`: 语义化版本号，推荐 `vMAJOR.MINOR.PATCH`。
- `notes`: 更新说明（可选）。
- `homepageUrl`: 发布页（可选，用于回退到“手动更新”）。
- `packages`: 按平台指定可下载包（可选）。平台键使用 Node 的 `process.platform`：`win32` / `darwin` / `linux`。

### 格式 B：GitHub Release API（兼容）

如果版本地址指向 GitHub 的 `releases/latest` API（返回包含 `tag_name/body/html_url/assets` 的 JSON），也可被识别为版本源。

## 本地版本号维护位置与命名规范

- 本地版本号来源：
  - 打包后：Electron `app.getVersion()`（来自 `package.json` 的 `version`）。
  - 渲染进程：通过 Vite 环境变量 `VITE_APP_VERSION` 注入（推荐与 `package.json` 同步）。
- 命名规范：
  - 展示时统一为 `vX.Y.Z`（如 `v1.0.2`）。
  - 比对时按语义化版本解析 `X.Y.Z` 三段。

## 检测、下载、替换/安装、重启流程

```mermaid
flowchart TD
  A[应用启动] --> B[5s 内发起更新检查]
  B --> C{远端版本 > 本地版本?}
  C -- 否 --> D[结束]
  C -- 是 --> E[弹窗: 立即更新 / 稍后提醒]
  E -- 稍后提醒 --> D
  E -- 立即更新 --> F[下载 packages[platform].url]
  F --> G[保存到临时目录]
  G --> H[打开安装包/更新包]
  H --> I[退出应用]
```

说明：
- 当前实现以“下载并启动安装包/更新包”为主（Windows 通常是 NSIS `.exe`，macOS 可能是 `.dmg/.zip`，Linux 可能是 `.AppImage/.deb`）。
- “替换可执行文件/重启”由安装器或系统行为完成；若未来提供“便携版差分包”，可将 `packages[platform].url` 指向差分更新器/补丁包，并在主进程中改为执行补丁替换逻辑。

## CI 如何自动写入版本号与更新地址

本项目约定使用 `.env` 注入以下变量：

```bash
VITE_APP_VERSION=1.0.2
VITE_UPDATE_MANIFEST_URL=https://example.com/ojflow/update.json
```

建议在 CI 打包前根据 tag/版本号动态生成或覆盖 `.env`（或直接注入环境变量，由构建系统传递给 Vite）。

## 常见失败场景与回滚策略

- **无法请求版本文件**：网络错误、URL 失效、证书问题。
  - 表现：更新检查提示失败或静默跳过。
  - 策略：保留“前往发布页”作为兜底（`homepageUrl`）。
- **版本文件格式不正确**：字段缺失或类型错误。
  - 策略：视为检查失败，不触发更新流程。
- **下载失败/中断**：断网、CDN 限速、重定向异常。
  - 策略：提示失败；不退出应用；可重试。
- **安装包无法启动**：文件被安全软件拦截、权限不足、路径不可写。
  - 策略：提示失败；保留 `homepageUrl` 手动更新入口。
- **更新后无法启动**：
  - 策略：优先使用安装器自带回滚机制；如使用便携版替换，建议采用“先写入新文件 -> 校验 -> 再原子替换”的两阶段提交，并保留旧版本备份。

