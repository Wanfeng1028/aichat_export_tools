# AI Chat Exporter

一个开源、离线优先的浏览器扩展，用于将主流 AI 网站中的聊天记录导出为 Markdown、PDF、DOCX 和 ZIP，本地完成处理与下载。

An open-source, local-first browser extension for exporting conversations from major AI websites to Markdown, PDF, DOCX, and ZIP with local processing and download.

## 中文说明

### 项目简介

AI Chat Exporter 的目标是把分散在不同 AI 官网中的聊天资产稳定地导出为可归档、可复用、可二次编辑的本地文件，而不是把数据再同步到第三方服务。

当前仓库已经完成一条可用的 ChatGPT 导出工作流，包含：

- 当前会话导出
- 侧边栏会话扫描
- 批量导出为单个归档包
- Markdown / PDF / DOCX / ZIP 四种输出
- 基于 IndexedDB 的任务记录和导出历史
- Popup、Dashboard、Options 三个扩展页面

### 当前支持情况

已实现：

- ChatGPT

已预留权限和界面入口，适配器待继续开发：

- Claude
- Gemini
- Kimi
- DeepSeek
- Grok
- 豆包
- 千问
- 文心一言

### 功能特性

- 本地优先，不依赖自建后端
- Manifest V3 扩展架构
- ChatGPT 当前会话提取
- ChatGPT 侧边栏会话扫描
- 单会话导出与批量导出
- Markdown、PDF、DOCX、ZIP 导出器
- 导出任务记录与历史记录
- 按站点按需申请权限
- 中英文界面切换

### 项目结构

```text
Browser Extension
├─ Popup / Dashboard / Options UI
├─ Background Service Worker
├─ Content Script Bridge
├─ Site Adapters
├─ Exporters (Markdown / PDF / DOCX / ZIP)
└─ IndexedDB Storage
```

核心目录：

- `src/adapters/`：站点适配器
- `src/background/`：运行时编排、权限、下载
- `src/content/`：页面注入与消息桥接
- `src/exporters/`：文件导出逻辑
- `src/storage/`：Dexie / IndexedDB 持久化
- `src/ui/`：Popup、Dashboard、Options
- `src/core/`：通用类型、文件名规则、基础能力

### 隐私与权限

- 不上传聊天内容到项目后端
- 默认不采集遥测
- 文件在浏览器本地生成并下载
- 站点权限在用户触发对应操作时再申请

### 开发方式

环境要求：

- Node.js 20+
- npm 10+ 或兼容包管理器

安装依赖：

```bash
npm install
```

运行测试：

```bash
npm test
```

构建扩展：

```bash
npm run build
```

Chrome / Edge 加载方式：

1. 打开 `chrome://extensions/`
2. 开启开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择 `dist` 目录

Firefox Developer Edition 临时加载方式：

1. 打开 `about:debugging`
2. 进入 `This Firefox`
3. 点击 `Load Temporary Add-on`
4. 选择 `dist/manifest.json`

### 路线图

#### 已完成

- [x] 扩展基础骨架
- [x] Popup / Dashboard / Options
- [x] ChatGPT 当前会话导出
- [x] Markdown / PDF / DOCX / ZIP 导出
- [x] 批量导出归档
- [x] 导出历史与任务记录
- [x] 基础 CI 和单元测试

#### 下一步

- [ ] 继续补齐其它站点适配器
- [ ] Workspace 识别与切换
- [ ] 文件命名模板设置
- [ ] 导出前预览
- [ ] Firefox 打包辅助脚本

### 相关文档

- [产品需求](./docs/prd.md)
- [架构说明](./docs/architecture.md)
- [适配器说明](./docs/adapters.md)
- [权限说明](./docs/permissions.md)
- [路线图](./docs/roadmap.md)
- [贡献说明](./CONTRIBUTING.md)

## English

### Overview

AI Chat Exporter helps users export conversation data from AI websites into durable local files instead of sending that content to a third-party service.

This repository currently ships a working ChatGPT export flow with:

- current conversation export
- sidebar conversation scanning
- batch export into one archive
- Markdown, PDF, DOCX, and ZIP output
- IndexedDB-backed job tracking and export history
- popup, dashboard, and options pages

### Supported Sites

Implemented:

- ChatGPT

Reserved in UI and permissions, adapter implementation pending:

- Claude
- Gemini
- Kimi
- DeepSeek
- Grok
- Doubao
- Qianwen
- Yiyan

### Development

Install:

```bash
npm install
```

Test:

```bash
npm test
```

Build:

```bash
npm run build
```

### License

MIT
