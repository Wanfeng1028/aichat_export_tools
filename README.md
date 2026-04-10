<p align="center">
  <img src="./public/logo.png" alt="AI Chat Exporter" width="160"/>
</p>

<h1 align="center">AI Chat Exporter</h1>

<p align="center">
  <b>本地优先的 AI 对话导出浏览器扩展</b><br/>
  <b>A local-first browser extension for exporting AI conversations</b>
</p>

<p align="center">
  把 ChatGPT 等 AI 网站中的聊天记录导出为 Markdown、PDF、DOCX 和 ZIP，全部在浏览器本地完成。<br/>
  Export conversations from ChatGPT and other AI websites to Markdown, PDF, DOCX, and ZIP, fully inside the browser.
</p>

<p align="center">
  <a href="https://github.com/Wanfeng1028/aichat_export_tools"><img src="https://img.shields.io/badge/GitHub-Wanfeng1028%2Faichat__export__tools-181717?style=for-the-badge&logo=github" alt="GitHub Repo"/></a>
  <a href="https://github.com/Wanfeng1028/aichat_export_tools/stargazers"><img src="https://img.shields.io/github/stars/Wanfeng1028/aichat_export_tools?style=for-the-badge&logo=github&color=ffcc33" alt="GitHub Stars"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/Wanfeng1028/aichat_export_tools?style=for-the-badge" alt="License"/></a>
</p>

[中文](#中文) | [English](#english)

---

## 中文

AI Chat Exporter 是一个面向知识归档、内容复用和本地备份场景的开源浏览器扩展。

它的目标很直接：**不把聊天内容再同步到第三方服务，而是在本地浏览器里完成提取、转换、生成和下载**。如果你经常需要把 AI 对话保存为可沉淀、可检索、可再次编辑的文件，这个项目就是为这个场景设计的。

### 项目亮点

| 能力 | 说明 |
|:---|:---|
| 本地优先 | 不依赖自建后端，聊天内容默认不上传到项目服务器 |
| 多格式导出 | 支持 Markdown、PDF、DOCX、ZIP |
| 批量归档 | 支持扫描会话列表并打包批量导出 |
| 任务留痕 | 基于 IndexedDB 保存任务记录与导出历史 |
| 按需授权 | 站点权限、标签页权限按需申请，避免安装时过度索权 |
| 扩展架构清晰 | Manifest V3 + Adapter + Exporter 分层，方便继续扩展更多站点 |

### 当前支持情况

#### 已实现

| 站点 | 当前能力 |
|:---|:---|
| ChatGPT | 当前会话导出、侧边栏会话扫描、批量导出、历史记录 |

#### 已预留入口，后续补齐适配器

- Claude
- Gemini
- Kimi
- DeepSeek
- Grok
- 豆包
- 千问
- 文心一言

### 适合什么场景

- 想把高价值 AI 对话沉淀成 Markdown 知识库
- 想把聊天记录导出成 PDF / DOCX 用于汇报、归档或共享
- 想定期批量备份 ChatGPT 会话，避免内容散落在网页里
- 想基于本地文件继续做二次整理、翻译、笔记、RAG 或全文检索

### 你现在能用到什么

#### 导出能力

- 当前 ChatGPT 会话导出
- ChatGPT 侧边栏会话扫描
- 批量导出为单个归档包
- Markdown / PDF / DOCX / ZIP 四种输出格式

#### 扩展界面

- Popup：快速触发当前页面导出
- Dashboard：查看任务状态、导出历史、批量处理结果
- Options：管理语言和扩展配置

#### 工程能力

- Manifest V3 架构
- Content Script + Background Service Worker 协作
- Site Adapter 站点适配层
- Exporter 输出层
- IndexedDB 持久化任务与历史

### 快速开始

#### 环境要求

- Node.js 20+
- npm 10+

#### 安装依赖

```bash
npm install
```

#### 运行测试

```bash
npm test
```

#### 构建扩展

```bash
npm run build
```

#### 在 Chrome / Edge 中加载

1. 打开 `chrome://extensions/`
2. 开启开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择仓库构建后的 `dist` 目录

#### 在 Firefox Developer Edition 中临时加载

1. 打开 `about:debugging`
2. 进入 `This Firefox`
3. 点击 `Load Temporary Add-on`
4. 选择 `dist/manifest.json`

### 权限与隐私

| 项目 | 说明 |
|:---|:---|
| `storage` | 保存语言、任务状态、导出历史 |
| `downloads` | 下载导出的文件 |
| `scripting` | 按需注入内容脚本 |
| `activeTab` | 读取当前用户操作页面 |
| `tabs` | 批量导出时用于稳定打开和处理多个会话 |
| Host Permissions | 仅在用户触发对应站点操作时按需申请 |

隐私原则：

- 不上传聊天内容到项目后端
- 默认不采集遥测
- 文件在浏览器本地生成并下载
- 权限按需申请，而不是安装时一次性索取全部站点访问能力

### 仓库结构

```text
aichat_export_tools/
├── src/
│   ├── adapters/        # 站点适配器
│   ├── background/      # Service Worker、权限、下载、消息编排
│   ├── content/         # 页面桥接、DOM 观察、内容提取入口
│   ├── exporters/       # Markdown / PDF / DOCX / ZIP 导出器
│   ├── storage/         # IndexedDB / Dexie 持久化
│   ├── ui/              # Popup / Dashboard / Options 页面
│   └── core/            # 核心类型、能力声明、任务与文件名规则
├── docs/                # 架构、权限、适配器、路线图、PRD
├── public/              # Logo、图标等静态资源
└── tests/               # 单元测试
```

### 开发文档

- [产品需求](./docs/prd.md)
- [架构说明](./docs/architecture.md)
- [适配器说明](./docs/adapters.md)
- [权限说明](./docs/permissions.md)
- [路线图](./docs/roadmap.md)
- [贡献指南](./CONTRIBUTING.md)

### 路线图

#### 已完成

- [x] Manifest V3 扩展基础骨架
- [x] Popup / Dashboard / Options 页面
- [x] ChatGPT 当前会话导出
- [x] ChatGPT 侧边栏会话扫描
- [x] Markdown / PDF / DOCX / ZIP 导出
- [x] 批量导出归档
- [x] 导出历史与任务记录
- [x] 基础测试与文档骨架

#### 下一步

- [ ] 继续补齐更多站点适配器
- [ ] 支持 workspace-aware 扫描和导出
- [ ] 增加导出默认项和文件名模板设置
- [ ] 优化重试、预览和失败反馈流程
- [ ] 增加 Firefox 打包与发布辅助能力

### 贡献

欢迎提交 Issue 和 Pull Request，一起把这个项目补成真正可用的多站点 AI 对话导出工具。

提交代码前建议至少执行：

```bash
npm test
npm run build
```

### License

[MIT](./LICENSE)

---

## English

AI Chat Exporter is an open-source browser extension built for local backup, knowledge archiving, and content reuse.

Its goal is straightforward: **extract, transform, generate, and download AI conversations locally in the browser instead of syncing them to a third-party service**. If you want AI chats saved as durable, searchable, and editable files, this project is built for that workflow.

### Highlights

| Capability | Description |
|:---|:---|
| Local-first | No custom backend is required, and chat content is not uploaded to a project server by default |
| Multiple export formats | Supports Markdown, PDF, DOCX, and ZIP |
| Batch archiving | Scan conversation lists and export them as one archive |
| Export history | Job records and export history are stored in IndexedDB |
| On-demand permissions | Site and tab permissions are requested only when needed |
| Extensible architecture | Manifest V3 + Adapter + Exporter layering makes more sites easier to add |

### Current Support

#### Implemented

| Site | Current capabilities |
|:---|:---|
| ChatGPT | Current conversation export, sidebar scanning, batch export, and export history |

#### Reserved in UI and permissions, adapters pending

- Claude
- Gemini
- Kimi
- DeepSeek
- Grok
- Doubao
- Qianwen
- Yiyan

### Good Fit For

- Building a Markdown-based knowledge base from valuable AI chats
- Exporting conversations as PDF or DOCX for reports, archives, or sharing
- Periodically backing up ChatGPT conversations in batches
- Reusing local files for translation, note-taking, RAG, or full-text search

### What You Can Use Today

#### Export features

- Export the current ChatGPT conversation
- Scan ChatGPT sidebar conversations
- Batch export into a single archive
- Output as Markdown, PDF, DOCX, and ZIP

#### Extension surfaces

- Popup: trigger exports quickly from the active page
- Dashboard: inspect jobs, history, and batch results
- Options: manage language and extension settings

#### Engineering structure

- Manifest V3 architecture
- Content Script + Background Service Worker pipeline
- Site Adapter layer
- Exporter layer
- IndexedDB-backed persistence

### Quick Start

#### Requirements

- Node.js 20+
- npm 10+

#### Install dependencies

```bash
npm install
```

#### Run tests

```bash
npm test
```

#### Build the extension

```bash
npm run build
```

#### Load in Chrome / Edge

1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the built `dist` directory

#### Load temporarily in Firefox Developer Edition

1. Open `about:debugging`
2. Go to `This Firefox`
3. Click `Load Temporary Add-on`
4. Select `dist/manifest.json`

### Permissions and Privacy

| Item | Description |
|:---|:---|
| `storage` | Stores language, job state, and export history |
| `downloads` | Downloads exported files |
| `scripting` | Injects content scripts on demand |
| `activeTab` | Reads the active user-selected tab |
| `tabs` | Used by batch export to open and process conversations reliably |
| Host Permissions | Requested only when the user triggers work on a supported site |

Privacy principles:

- No chat content is uploaded to a project backend
- No telemetry is collected by default
- Files are generated and downloaded locally in the browser
- Permissions are requested on demand instead of at install time

### Repository Structure

```text
aichat_export_tools/
├── src/
│   ├── adapters/        # Site adapters
│   ├── background/      # Service worker, permissions, downloads, runtime orchestration
│   ├── content/         # Page bridge, DOM observers, extraction entry points
│   ├── exporters/       # Markdown / PDF / DOCX / ZIP exporters
│   ├── storage/         # IndexedDB / Dexie persistence
│   ├── ui/              # Popup / Dashboard / Options pages
│   └── core/            # Shared types, capability definitions, jobs, filename rules
├── docs/                # Architecture, permissions, adapters, roadmap, PRD
├── public/              # Logo and static assets
└── tests/               # Unit tests
```

### Documentation

- [PRD](./docs/prd.md)
- [Architecture](./docs/architecture.md)
- [Adapters](./docs/adapters.md)
- [Permissions](./docs/permissions.md)
- [Roadmap](./docs/roadmap.md)
- [Contributing](./CONTRIBUTING.md)

### Roadmap

#### Shipped

- [x] Manifest V3 extension scaffold
- [x] Popup / Dashboard / Options pages
- [x] ChatGPT current conversation export
- [x] ChatGPT sidebar conversation scan
- [x] Markdown / PDF / DOCX / ZIP exporters
- [x] Batch export archiving
- [x] Export history and job persistence
- [x] Base tests and documentation scaffold

#### Next

- [ ] Add more site adapters
- [ ] Support workspace-aware scanning and export flows
- [ ] Add export defaults and filename template settings
- [ ] Improve retry, preview, and failure feedback flows
- [ ] Add Firefox packaging and release helpers

### Contributing

Issues and pull requests are welcome. The long-term goal is to make this a practical multi-site AI conversation exporter.

Before submitting code, at minimum run:

```bash
npm test
npm run build
```

### License

[MIT](./LICENSE)
