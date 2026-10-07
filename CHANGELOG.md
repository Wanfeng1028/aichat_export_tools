# Changelog

本仓库变更记录遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循语义化版本。更细的历史以 git log 与 GitHub Releases 为准。

## [Unreleased]

### Added

- `AGENTS.md`：AI 编码代理工作规范（本机零验证、本机禁止一切下载等硬性约定）。
- 根目录文档套件：`ARCHITECTURE.md`（架构）、`DESIGN.md`（视觉）、`CHANGELOG.md`；`QWEN.md` 指向 `AGENTS.md`。
- `CONTRIBUTING.md` 增加 AI 编码代理例外说明（不本地跑测试与构建，以 CI 为准）。

## [0.1.0] - 2026-04-08

### Added

- Chrome MV3 扩展 MVP：ChatGPT 对话导出 Markdown，popup / dashboard / options 三界面。
- PDF / DOCX 导出（pdf-lib 内嵌 Noto Sans SC；docx 生成）。
- ZIP 打包、批量导出、任务与历史记录（本地 IndexedDB 存储）。

[Unreleased]: https://github.com/Wanfeng1028/aichat_export_tools/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Wanfeng1028/aichat_export_tools/releases/tag/v0.1.0
