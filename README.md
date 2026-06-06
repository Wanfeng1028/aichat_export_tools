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
  <a href="https://github.com/Wanfeng1028/aichat_export_tools/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-4BC952?style=for-the-badge" alt="License"/></a>
  <a href="https://github.com/Wanfeng1028/aichat_export_tools/commits/main"><img src="https://img.shields.io/github/last-commit/Wanfeng1028/aichat_export_tools?style=for-the-badge&color=8957E5" alt="Last Commit"/></a>
</p>

[中文](#中文) | [English](#english)

---

## 中文

AI Chat Exporter 是一个面向知识归档、内容复用和本地备份场景的开源浏览器扩展。

它的目标很直接：**不把聊天内容再同步到第三方服务，而是在本地浏览器里完成提取、转换、生成和下载**。如果你经常需要把 AI 对话保存为可沉淀、可检索、可再次编辑的文件，这个项目就是为这个场景设计的。

### 🚀 核心亮点

| 能力 | 说明 |
|:---|:---|
| 🛡️ 本地优先 | 不依赖自建后端，聊天内容默认不上传到项目服务器，所有操作在浏览器本地完成 |
| 📄 多格式导出 | 支持 **Markdown**、**PDF**（内嵌 CJK 中文字体）、**DOCX**（含样式定义）、**ZIP**（批量打包） |
| 📦 批量归档 | 支持扫描会话列表并打包批量导出为 ZIP 归档 |
| 📝 任务留痕 | 基于 IndexedDB 保存任务记录与导出历史，随时回溯 |
| 🔐 按需授权 | 站点权限、标签页权限按需申请，避免安装时过度索权 |
| 🧩 架构清晰 | Manifest V3 + Adapter + Exporter 分层，方便继续扩展更多站点 |

### 🌐 站点支持

#### ✅ 已实现

| 站点 | 能力 |
|:---|:---|
| **ChatGPT** | 当前会话导出、侧边栏会话扫描、批量导出、历史记录 |

#### 🔜 已预留入口（通用适配器中）

> 以下站点使用通用 DOM 适配器，可提取基础对话内容，精度不如专用适配器。

| 站点 | 状态 |
|:---|:---|
| Claude | ⚠️ 通用适配器 |
| Gemini | ⚠️ 通用适配器 |
| Kimi | ⚠️ 通用适配器 |
| DeepSeek | ⚠️ 通用适配器 |
| Grok | ⚠️ 通用适配器 |
| 豆包 | ⚠️ 通用适配器 |
| 千问 | ⚠️ 通用适配器（有专用适配器待启用） |
| 文心一言 | ⚠️ 通用适配器 |

### 📋 适合什么场景

- 想把高价值 AI 对话沉淀成 **Markdown 知识库**
- 想把聊天记录导出成 **PDF / DOCX** 用于汇报、归档或共享
- 想定期批量备份 ChatGPT 会话，避免内容散落在网页里
- 想基于本地文件继续做二次整理、翻译、笔记、RAG 或全文检索

### 👇 使用指南

#### 第一步：安装扩展

1. 从仓库构建扩展（参考下方「安装部署」）
2. 打开 `chrome://extensions/`，开启开发者模式
3. 加载 `dist/` 目录

#### 第二步：在 AI 对话页面使用

1. 打开 [chatgpt.com](https://chatgpt.com) 或其他支持的 AI 网站
2. 进入一个对话页面，确保对话内容已加载
3. 点击浏览器工具栏中的 **AI Chat Exporter** 图标
4. 在弹出的 Popup 中选择导出格式（Markdown / PDF / DOCX / ZIP）
5. 点击「导出」按钮，文件将自动下载到浏览器默认下载目录

#### 第三步：查看导出历史

1. 点击扩展图标中的「Dashboard」按钮
2. 在 Dashboard 页面查看导出历史、任务状态、批量导出结果

### ⚙️ 安装部署

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
3. 点击"加载已解压的扩展程序"
4. 选择仓库构建后的 `dist` 目录

#### 在 Firefox Developer Edition 中临时加载

1. 打开 `about:debugging`
2. 进入 `This Firefox`
3. 点击 `Load Temporary Add-on`
4. 选择 `dist/manifest.json`

### ❓ 常见问题 (FAQ)

**Q: 为什么导出内容是空的？**
A: 请确认你正在一个 AI 对话页面，且对话内容已完全加载。可以尝试滚动页面到底部，等待内容渲染完成后再次导出。

**Q: 为什么 PDF 中文字体显示异常？**
A: 扩展默认使用 Noto Sans SC（思源黑体）作为中文字体。如果字体加载失败，可能会回退到 Helvetica。请确保 `assets/fonts/` 目录中的字体文件存在。

**Q: 为什么某些 AI 平台的导出效果不好？**
A: 目前只有 ChatGPT 有专用适配器，其他站点使用的是通用 DOM 适配器。通用适配器的精度不如专用适配器，我们正在为更多站点开发专用适配器。

**Q: 数据安全吗？聊天内容会被上传吗？**
A: 完全安全。所有数据处理都在浏览器本地完成，不会上传任何聊天内容到项目服务器或第三方服务。

**Q: 导出后文件下载到哪里？**
A: 文件会下载到浏览器的默认下载目录，你可以在浏览器设置中查看或修改默认下载位置。

### 🔒 权限与隐私

| 项目 | 说明 |
|:---|:---|
| `storage` | 保存语言、任务状态、导出历史 |
| `downloads` | 下载导出的文件 |
| `scripting` | 按需注入内容脚本 |
| `activeTab` | 读取当前用户操作页面 |
| `tabs` | 批量导出时用于稳定打开和处理多个会话 |
| Host Permissions | 仅在用户触发对应站点操作时按需申请 |

**隐私原则：**

- 不上传聊天内容到项目后端
- 默认不采集遥测
- 文件在浏览器本地生成并下载
- 权限按需申请，而不是安装时一次性索取全部站点访问能力

### 📁 仓库结构

```text
aichat_export_tools/
├── src/
│   ├── adapters/        # 站点适配器（ChatGPT/千问/通用 DOM）
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

### 🛠️ 开发文档

- [产品需求](./docs/prd.md)
- [架构说明](./docs/architecture.md)
- [适配器说明](./docs/adapters.md)
- [权限说明](./docs/permissions.md)
- [路线图](./docs/roadmap.md)
- [贡献指南](./CONTRIBUTING.md)

### 🗺️ 路线图

#### ✅ 已完成

- [x] Manifest V3 扩展基础骨架
- [x] Popup / Dashboard / Options 页面
- [x] ChatGPT 当前会话导出
- [x] ChatGPT 侧边栏会话扫描
- [x] Markdown / PDF / DOCX / ZIP 导出
- [x] 批量导出归档
- [x] 导出历史与任务记录
- [x] 基础测试与文档骨架

#### 🔜 下一步

- [ ] 继续补齐更多站点专用适配器（Claude、Gemini、Kimi 等）
- [ ] 支持 workspace-aware 扫描和导出
- [ ] 增加导出默认项和文件名模板设置
- [ ] 优化重试、预览和失败反馈流程
- [ ] 增加 Firefox 打包与发布辅助能力
- [ ] 扩大测试覆盖范围

### 🤝 贡献

欢迎提交 Issue 和 Pull Request，一起把这个项目补成真正可用的多站点 AI 对话导出工具。

提交代码前建议至少执行：

```bash
npm test
npm run build
```

### 📄 License

[MIT](./LICENSE)

---

## English

AI Chat Exporter is an open-source browser extension built for local backup, knowledge archiving, and content reuse.

Its goal is straightforward: **extract, transform, generate, and download AI conversations locally in the browser instead of syncing them to a third-party service**. If you want AI chats saved as durable, searchable, and editable files, this project is built for that workflow.

### 🚀 Highlights

| Capability | Description |
|:---|:---|
| 🛡️ Local-first | No custom backend required. Chat content stays in your browser — never uploaded to any server |
| 📄 Multiple export formats | Supports **Markdown**, **PDF** (embedded CJK fonts), **DOCX** (with style definitions), and **ZIP** (batch archiving) |
| 📦 Batch archiving | Scan conversation lists and export them as one ZIP archive |
| 📝 Export history | Job records and export history are stored in IndexedDB |
| 🔐 On-demand permissions | Site and tab permissions are requested only when needed |
| 🧩 Extensible architecture | Manifest V3 + Adapter + Exporter layering makes more sites easy to add |

### 🌐 Site Support

#### ✅ Implemented

| Site | Capabilities |
|:---|:---|
| **ChatGPT** | Current conversation export, sidebar scanning, batch export, export history |

#### 🔜 Reserved in UI (Generic adapter active)

> The following sites use the generic DOM adapter. Basic conversation extraction works, but dedicated adapters provide better accuracy.

| Site | Status |
|:---|:---|
| Claude | ⚠️ Generic adapter |
| Gemini | ⚠️ Generic adapter |
| Kimi | ⚠️ Generic adapter |
| DeepSeek | ⚠️ Generic adapter |
| Grok | ⚠️ Generic adapter |
| Doubao | ⚠️ Generic adapter |
| Qianwen | ⚠️ Generic adapter (dedicated adapter pending) |
| Yiyan | ⚠️ Generic adapter |

### 📋 Good Fit For

- Building a Markdown-based knowledge base from valuable AI chats
- Exporting conversations as PDF or DOCX for reports, archives, or sharing
- Periodically backing up ChatGPT conversations in batches
- Reusing local files for translation, note-taking, RAG, or full-text search

### 👇 How to Use

#### Step 1: Install the Extension

1. Build the extension from source (see "Installation" below)
2. Open `chrome://extensions/`, enable Developer mode
3. Load the `dist/` directory

#### Step 2: Export from an AI Chat Page

1. Open [chatgpt.com](https://chatgpt.com) or any supported AI website
2. Enter a conversation page and wait for content to fully load
3. Click the **AI Chat Exporter** icon in your browser toolbar
4. Select export format (Markdown / PDF / DOCX / ZIP)
5. Click "Export" — the file downloads to your browser's default download folder

#### Step 3: View Export History

1. Click the "Dashboard" button in the extension popup
2. View export history, job status, and batch export results

### ⚙️ Installation

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

### ❓ Frequently Asked Questions

**Q: Why is the exported content empty?**
A: Make sure you're on an AI conversation page and the content has fully loaded. Try scrolling to the bottom of the page, waiting for content to render, then try exporting again.

**Q: Why is Chinese text rendering incorrectly in PDF?**
A: The extension uses Noto Sans SC (思源黑体) as the default CJK font. If the font fails to load, it falls back to Helvetica. Make sure the font files in `assets/fonts/` are present.

**Q: Why is the export quality poor for some AI platforms?**
A: Only ChatGPT has a dedicated adapter. Other sites use the generic DOM adapter, which has lower accuracy. We're building dedicated adapters for more sites.

**Q: Is my data safe? Will chat content be uploaded?**
A: Absolutely not. All processing happens locally in your browser. No chat content is uploaded to any server.

**Q: Where do exported files download?**
A: Files download to your browser's default download folder. You can check or change the download location in your browser settings.

### 🔒 Permissions and Privacy

| Item | Description |
|:---|:---|
| `storage` | Stores language, job state, and export history |
| `downloads` | Downloads exported files |
| `scripting` | Injects content scripts on demand |
| `activeTab` | Reads the active user-selected tab |
| `tabs` | Used by batch export to open and process conversations reliably |
| Host Permissions | Requested only when the user triggers work on a supported site |

**Privacy principles:**

- No chat content is uploaded to a project backend
- No telemetry is collected by default
- Files are generated and downloaded locally in the browser
- Permissions are requested on demand instead of at install time

### 📁 Repository Structure

```text
aichat_export_tools/
├── src/
│   ├── adapters/        # Site adapters (ChatGPT/Qianwen/Generic DOM)
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

### 🛠️ Documentation

- [PRD](./docs/prd.md)
- [Architecture](./docs/architecture.md)
- [Adapters](./docs/adapters.md)
- [Permissions](./docs/permissions.md)
- [Roadmap](./docs/roadmap.md)
- [Contributing](./CONTRIBUTING.md)

### 🗺️ Roadmap

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

- [ ] Add dedicated site adapters (Claude, Gemini, Kimi, etc.)
- [ ] Support workspace-aware scanning and export flows
- [ ] Add export defaults and filename template settings
- [ ] Improve retry, preview, and failure feedback flows
- [ ] Add Firefox packaging and release helpers
- [ ] Expand test coverage

### 🤝 Contributing

Issues and pull requests are welcome. The long-term goal is to make this a practical multi-site AI conversation exporter.

Before submitting code, at minimum run:

```bash
npm test
npm run build
```

### 📄 License

[MIT](./LICENSE)
