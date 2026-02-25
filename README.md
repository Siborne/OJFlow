# OJFlow

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tauri](https://img.shields.io/badge/Tauri-v2-orange)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

**OJFlow** 是一个基于 Next.js、Tauri 和 TypeScript 构建的跨平台 Online Judge 助手应用。它集成了各大主流 OJ 平台的比赛信息与用户数据统计，旨在为算法竞赛选手提供便捷的一站式查询服务。

## ✨ 核心功能

- 🏆 **实时比赛追踪**：支持 Codeforces、AtCoder 等平台的近期比赛列表与倒计时提醒。
- 📊 **用户数据统计**：可视化展示各大 OJ 的解题数量、排名与 Rating 信息。
- 💾 **离线数据支持**：内置 SQLite 数据库，支持离线缓存与快速访问。
- 🌓 **主题自适应**：完美适配深色/浅色模式，跟随系统或手动切换。
- 🌐 **跨平台体验**：提供 Web 端与桌面端（Windows/macOS/Linux）一致的流畅体验。

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (React)
- **桌面框架**: Tauri 2.0 (Rust)
- **开发语言**: TypeScript, Rust
- **样式方案**: Tailwind CSS
- **状态管理**: Zustand
- **本地存储**: SQLite

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Rust (仅构建桌面应用时需要)
- Visual Studio C++ Build Tools (Windows) / Xcode (macOS) / build-essential (Linux)

### 安装依赖

```bash
npm install
```

### 启动开发环境

1. **Web 端开发**:
   ```bash
   npm run dev
   ```
   访问 `http://localhost:3000` 即可预览。

2. **桌面端开发**:
   ```bash
   npm run tauri dev
   ```
   该命令将启动本地 Rust 后端并加载前端页面。

### 构建发布版本

```bash
npm run tauri build
```
构建产物将生成在 `src-tauri/target/release/bundle/` 目录下。

## 📡 数据接入状态

目前各大 OJ 平台的 API 接入情况如下：

| 模块 | 状态 | 数据来源 | 备注 |
| :--- | :--- | :--- | :--- |
| **比赛列表 (CF)** | ✅ 已接入 | 官方 API | |
| **比赛列表 (AtCoder)** | ✅ 已接入 | Kenkoooo API | |
| **用户统计 (CF)** | ✅ 已接入 | 官方 + OJHunt | |
| **用户统计 (LeetCode)** | ✅ 已接入 | GraphQL (CN) | |
| **用户统计 (AtCoder)** | ✅ 已接入 | Kenkoooo API | |
| **用户统计 (NowCoder)** | ✅ 已接入 | OJHunt Proxy | |
| **用户统计 (HDU)** | ✅ 已接入 | OJHunt Proxy | |
| **用户统计 (POJ)** | ✅ 已接入 | OJHunt Proxy | |
| **用户统计 (Luogu)** | ⚠️ 开发中 | - | 需处理 CORS/爬虫限制 |
| **用户统计 (VJudge)** | ⚠️ 开发中 | - | 需页面解析 |
| **用户统计 (蓝桥云课)** | ⚠️ 开发中 | - | 需鉴权支持 |

> **环境变量配置**: 
> 默认情况下 `NEXT_PUBLIC_USE_REAL_API=true` 开启真实数据获取。如需禁用外部请求并展示“开发中”标签，可将其设为 `false`。

## 🤝 贡献指南

欢迎提交 Issue 或 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。
