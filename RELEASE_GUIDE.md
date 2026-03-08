# 版本发布操作指南

本文档详细说明了如何发布 `OJFlow` 的新版本。发布流程完全自动化，通过 GitHub Actions 触发。

## 1. 发布前的准备

在进行任何发布操作前，请确保：

1.  **代码已测试**：本地运行正常，关键功能（如评测、爬虫）无误。
2.  **代码已提交**：所有更改都已 Commit 并 Push 到 `main` 分支。

## 2. 修改版本号

在发布新版本前，必须更新 `package.json` 中的版本号。

**文件路径**: [package.json](file:///s:/Sto-box/700-project/OJFlow/package.json)

**操作步骤**:
1.  打开 `package.json`。
2.  找到 `"version"` 字段。
3.  将其修改为新的版本号（遵循 [语义化版本控制](https://semver.org/lang/zh-CN/)，例如 `1.0.1` -> `1.0.2`）。

```json
{
  "name": "ojflow",
  "version": "1.0.2",  <-- 修改这里
  ...
}
```

4.  提交更改：
    ```bash
    git add package.json
    git commit -m "chore: bump version to 1.0.2"
    git push origin main
    ```

## 3. 触发发布流程

发布流程通过 **Git Tag** 触发。你需要打一个以 `v` 开头的标签并推送到远程仓库。

**操作步骤**:

### 方法 A: 使用 Git 命令 (推荐)

在终端中执行以下命令（假设新版本号为 `1.0.2`）：

```bash
# 1. 打标签
git tag v1.0.2

# 2. 推送标签到 GitHub
git push origin v1.0.2
```

### 方法 B: 使用 GitHub 网页端

1.  进入 GitHub 仓库主页。
2.  点击右侧的 **Releases**。
3.  点击 **Draft a new release**。
4.  点击 **Choose a tag**，输入 `v1.0.2` 并点击 **Create new tag**。
5.  点击 **Publish release**（这也会触发 Workflow）。

## 4. 编写发布描述 (Release Notes)

当标签推送到 GitHub 后，Actions 会自动构建。构建完成后，GitHub Releases 页面会自动出现一个新的 Release 草稿或正式版。

**如何修改描述**:

1.  等待 GitHub Actions 构建完成（通常需要 5-10 分钟）。
2.  前往仓库的 **Releases** 页面。
3.  找到对应的版本（例如 `v1.0.2`）。
4.  点击右上角的 **Edit** (铅笔图标)。
5.  在文本框中填写更新日志。

**推荐的描述格式**:

```markdown
## 🎉 新特性
- 支持了新的 OJ 平台: QOJ
- 增加了深色模式切换

## 🐛 问题修复
- 修复了 Windows 下无法保存设置的问题
- 修复了 rating 曲线显示异常

## 🛠️ 优化
- 优化了启动速度
```

## 5. 常见问题排查

- **构建失败？**
    - 检查 Actions 页面查看具体报错日志。
    - 常见原因：网络问题、证书配置错误（已配置自动跳过）、依赖安装失败。
- **没有自动发布 Release？**
    - 确保 Tag 格式必须是 `v*`（例如 `v1.0.2`，不能是 `1.0.2`）。
    - 检查 Workflow 权限是否包含 `contents: write`。

---
**Workflow 文件参考**: [release.yml](file:///s:/Sto-box/700-project/OJFlow/.github/workflows/release.yml)
