# Contributing

[中文](#中文) | [English](#english)

---

## 中文

### 适用范围

这是一个用于本地导出 AI 对话数据的浏览器扩展项目。提交贡献时，请尽量保持以下原则不被破坏：

- 本地优先处理
- 最小权限申请
- 各站点适配器相互隔离
- 先归一化对话数据，再进入导出流程

### 本地开发环境搭建

#### 前置条件

- **Node.js 20+** — [下载地址](https://nodejs.org/)
- **npm 10+** — 通常随 Node.js 一起安装
- **Chrome / Edge** — 用于加载和测试扩展

#### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Wanfeng1028/aichat_export_tools.git
cd aichat_export_tools

# 2. 安装依赖
npm install

# 3. 构建扩展
npm run build

# 4. 在 Chrome/Edge 中加载扩展
# - 打开 chrome://extensions/
# - 开启开发者模式
# - 点击"加载已解压的扩展程序"
# - 选择 dist/ 目录
```

#### 开发流程

```bash
# 监听模式（开发时推荐）
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test
```

#### 调试 Content Script

1. 打开任意一个支持的 AI 对话页面（如 chatgpt.com）
2. 右键点击页面 → "检查"
3. 切换到 "Console" 标签页
4. Content Script 的 console.log 输出会显示在这里

#### 调试 Background Service Worker

1. 打开 `chrome://extensions/`
2. 找到 AI Chat Exporter 扩展
3. 点击 "Service Worker" 链接
4. 在打开的 DevTools 中查看后台日志

### 开发流程

1. 从最新的 `main` 或当前主分支拉出新分支。
2. 进行聚焦、单一目的的修改。
3. 运行 `npm test`。
4. 运行 `npm run build`。
5. 提交 Pull Request，并附上验证说明。

### 适配器开发指南

为新的 AI 平台开发适配器时，请遵循以下步骤：

1. **分析目标站点的 DOM 结构**
   - 使用 Chrome DevTools 检查对话消息的 DOM 元素
   - 找到稳定的选择器（data-testid、data-* 属性、特定的 class 组合）

2. **创建适配器文件**
   - 在 `src/adapters/` 下创建新的子目录
   - 实现 `SiteAdapter` 接口：`getStatus()`、`exportCurrentConversation()`、`scanConversationList()`

3. **在 content/index.ts 中添加站点检测**
   - 在 `detectSupportedSiteFromUrl()` 中添加主机名匹配
   - 在 `getAdapter()` 中返回新适配器

4. **编写测试**
   - 在 `tests/` 下添加适配器单元测试
   - 使用虚拟 HTML 模拟 DOM 结构

5. **更新文档**
   - 更新 `README.md` 中的站点支持表
   - 更新 `docs/adapters.md`

### 适配器规则

- 选择器和解析逻辑应保留在对应站点自己的适配器目录内。
- 不要在同一个文件里混用多个站点的选择器。
- 返回统一的 `ChatConversation` 和 `ConversationSummary` 数据结构。
- 尽量使用更稳健的选择器，并在失败时返回清晰、可定位的问题信息。

### 文档规则

- 用户可见能力发生变化时，更新 `README.md`。
- 架构、权限或路线图假设变化时，更新 `docs/` 下相关文档。
- 对未支持、部分支持或占位中的站点能力要明确说明，不要写得像已经完成。

### 测试要求

- 共享工具函数、导出器或公共行为有变化时，补充或更新单元测试。
- 测试要保持可重复、本地可执行，不依赖线上站点实时状态。

### Pull Request 说明

请在 PR 中至少说明：

- 这次变更对用户可见的影响是什么
- 你实际运行了哪些测试和构建命令
- 如果实现是阶段性的，后续还有哪些待补工作

---

## English

### Scope

This project is a browser extension for exporting AI chat data locally. Contributions should preserve the following principles:

- local-first processing
- minimal permissions
- adapter isolation per site
- normalized conversation data before export

### Local Development Setup

#### Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org/)
- **npm 10+** — Usually installed with Node.js
- **Chrome / Edge** — To load and test the extension

#### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/Wanfeng1028/aichat_export_tools.git
cd aichat_export_tools

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build

# 4. Load in Chrome/Edge
# - Open chrome://extensions/
# - Enable Developer mode
# - Click "Load unpacked"
# - Select the dist/ directory
```

#### Development Workflow

```bash
# Watch mode (recommended for development)
npm run dev

# Production build
npm run build

# Run tests
npm test
```

#### Debugging Content Script

1. Open any supported AI chat page (e.g., chatgpt.com)
2. Right-click → "Inspect"
3. Switch to the "Console" tab
4. Content Script console.log output appears here

#### Debugging Background Service Worker

1. Open `chrome://extensions/`
2. Find the AI Chat Exporter extension
3. Click the "Service Worker" link
4. View background logs in the opened DevTools

### Development Flow

1. Create a branch from the latest `main` branch or the current primary branch.
2. Make focused, single-purpose changes.
3. Run `npm test`.
4. Run `npm run build`.
5. Open a pull request with validation notes.

### Adapter Development Guide

To develop an adapter for a new AI platform:

1. **Analyze the target site's DOM structure**
   - Use Chrome DevTools to inspect DOM elements of conversation messages
   - Find stable selectors (data-testid, data-* attributes, specific class combinations)

2. **Create the adapter file**
   - Create a new subdirectory under `src/adapters/`
   - Implement the `SiteAdapter` interface: `getStatus()`, `exportCurrentConversation()`, `scanConversationList()`

3. **Add site detection in content/index.ts**
   - Add hostname matching in `detectSupportedSiteFromUrl()`
   - Return the new adapter in `getAdapter()`

4. **Write tests**
   - Add adapter unit tests under `tests/`
   - Use mock HTML to simulate DOM structure

5. **Update documentation**
   - Update the site support table in `README.md`
   - Update `docs/adapters.md`

### Adapter Rules

- Keep selectors and parsing logic inside the adapter directory for that specific site.
- Do not mix selectors from multiple sites in the same file.
- Return normalized `ChatConversation` and `ConversationSummary` objects.
- Prefer resilient selectors and surface clear, actionable errors on failure.

### Documentation Rules

- Update `README.md` when a user-facing capability changes.
- Update the relevant files under `docs/` when architecture, permissions, or roadmap assumptions change.
- Call out unsupported, partial, or placeholder site support explicitly instead of implying it is complete.

### Testing

- Add or update unit tests when shared utilities, exporters, or common behavior change.
- Keep tests deterministic and runnable locally. Do not depend on live website access.

### Pull Requests

At minimum, a PR should explain:

- what changed from the user's point of view
- which test and build commands you actually ran
- what follow-up work remains if the implementation is intentionally partial
