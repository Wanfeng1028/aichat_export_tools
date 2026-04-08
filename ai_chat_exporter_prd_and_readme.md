# AI Chat Exporter

## 完整 PRD + Manifest 权限草案 + 项目目录初始化清单 + README

---

# 一、PRD

## 1. 产品概述

### 1.1 产品名称
AI Chat Exporter

### 1.2 产品定位
一个完全开源、离线优先、跨浏览器的浏览器扩展，用于从主流 AI 官网导出聊天记录与工作空间数据，支持单聊与批量导出，并输出为 Markdown、PDF、Word（.docx）等格式。

### 1.3 产品愿景
让用户在不依赖第三方后端、不过度暴露隐私数据的前提下，稳定、可控地导出自己在主流 AI 工具上的聊天资产，并将其沉淀到本地知识库、文档系统或归档目录中。

### 1.4 目标平台
- Chromium 内核浏览器：Chrome、Edge、Opera、Vivaldi、Arc
- Firefox（兼容适配）

### 1.5 支持站点（分阶段）
首批目标：
- ChatGPT / OpenAI
- Claude / Anthropic
- Gemini / Google
- Kimi / Moonshot
- DeepSeek
- Grok / xAI

候选扩展：
- Perplexity
- Mistral
- Poe
- 通义千问
- 豆包
- 腾讯元宝

---

## 2. 背景与问题

目前主流 AI 产品的聊天资产存在以下问题：
- 数据散落在多个官网，缺乏统一导出方式
- 部分平台导出能力弱，无法直接导出为 Markdown / PDF / Word
- 工作空间与个人账户数据混杂，归档困难
- 用户很难进行批量导出和长期备份
- 平台 UI 变化频繁，现有脚本型方案稳定性差
- 不少导出工具依赖第三方服务器，存在隐私和合规顾虑

本产品通过“本地扩展 + 站点适配器 + 标准化导出协议”的方式解决这些问题。

---

## 3. 目标用户

### 3.1 核心用户
- 高频使用多个 AI 产品的个人用户
- 需要沉淀知识资产的开发者 / 研究者 / 产品经理 / 内容创作者
- 需要保存团队 AI 协作记录的工作空间用户
- 重视本地备份、隐私和可迁移性的高级用户

### 3.2 用户诉求
- 一键导出聊天记录
- 支持多个 AI 平台
- 支持个人和工作空间
- 支持批量与压缩包下载
- 支持 md / pdf / docx
- 不依赖第三方服务器
- 界面好看、操作清晰、可重复使用

---

## 4. 产品目标

### 4.1 核心目标
1. 支持从多个主流 AI 官网读取用户可访问的聊天数据
2. 支持识别个人账号与工作空间
3. 支持导出单个会话
4. 支持批量导出并打包 zip
5. 支持 Markdown / PDF / Word 三种格式
6. 支持现代化 UI、进度提示、失败重试、历史记录
7. 完全开源、无自建后端依赖

### 4.2 非目标（V1 不做）
- 不做云端同步
- 不做账号托管
- 不做跨用户共享
- 不做破解登录态
- 不绕过站点权限或访问控制
- 不保证所有平台都能 100% 全量接口导出（提供回退机制）

---

## 5. 核心原则

1. **本地优先**：所有导出在用户浏览器本地完成
2. **权限最小化**：默认最少权限，按站点动态授权
3. **适配器架构**：每个站点独立适配，避免耦合
4. **导出标准化**：不同平台统一映射到标准中间格式
5. **失败可恢复**：支持重试、断点、部分成功
6. **开源可维护**：文档清晰、结构清晰、可社区扩展

---

## 6. 关键能力范围

### 6.1 站点识别
- 自动识别当前站点是否支持
- 显示当前站点名称、登录状态、支持能力

### 6.2 工作空间识别
- 识别个人账号 / 团队工作空间
- 列出用户当前可访问的 workspace
- 切换 workspace 后重新扫描会话列表

### 6.3 会话扫描
- 扫描当前 workspace 下的会话列表
- 提取标题、更新时间、URL、消息数量（可选）
- 支持搜索、筛选、分页、全选、多选

### 6.4 单会话导出
- 导出当前会话或指定会话
- 输出格式：`.md` / `.pdf` / `.docx`
- 文件名规则支持模板化

### 6.5 批量导出
- 选择多个会话批量导出
- 可选择输出格式
- 自动打包为 `.zip`
- 支持按站点 / workspace 建目录

### 6.6 导出内容标准化
- 保留角色：system / user / assistant / tool
- 保留时间戳（如果站点可得）
- 保留代码块、列表、引用、表格
- 保留附件元数据（名称、类型、链接、大小）
- 支持会话元信息页头

### 6.7 导出进度与任务管理
- 任务队列
- 当前进度展示
- 成功 / 失败计数
- 失败项重试
- 历史导出记录

### 6.8 回退与兼容策略
- DOM 提取失败时提示切换到会话页重试
- 若站点支持官方导出，则提供官方导出说明入口
- 若批量列表不可直接读取，则支持“逐个打开采集”模式

---

## 7. 用户故事

### 7.1 个人用户
- 作为个人用户，我希望一键导出当前 ChatGPT 会话为 Markdown，便于存进 Obsidian。
- 作为个人用户，我希望一次导出我在 Claude 上最近一个 workspace 的全部会话，并打包下载。
- 作为个人用户，我希望导出文件名可读、带时间和标题。

### 7.2 团队 / 工作空间用户
- 作为团队用户，我希望选择某个 workspace，批量导出该空间下的全部会话。
- 作为团队用户，我希望能区分个人空间与团队空间的会话。

### 7.3 高级用户
- 作为高级用户，我希望看到详细日志和失败原因，便于定位站点兼容问题。
- 作为高级用户，我希望扩展不依赖任何第三方服务器。

---

## 8. 典型使用流程

### 8.1 单个会话导出
1. 用户打开 AI 官网会话页面
2. 点击扩展图标
3. 扩展识别站点与会话
4. 用户点击“导出当前会话”
5. 选择导出格式（md/pdf/docx）
6. 本地生成文件并下载

### 8.2 批量导出
1. 用户点击“打开控制台 / Dashboard”
2. 选择当前站点与 workspace
3. 点击“扫描会话”
4. 用户多选会话或全选
5. 选择导出格式
6. 创建导出任务
7. 显示进度、失败项、重试按钮
8. 导出完成后下载 zip

---

## 9. 功能需求

### 9.1 MVP（V1）
- 扩展基础骨架
- 支持一个站点（建议 ChatGPT）
- 当前会话导出 Markdown
- Dashboard 基础界面
- 基础错误提示

### 9.2 V1.1
- 增加 PDF / DOCX
- 会话列表扫描
- 批量导出 ZIP
- 导出历史记录

### 9.3 V1.2
- 新增 Claude / Gemini / Kimi / DeepSeek / Grok 适配器
- Workspace 切换
- 文件命名模板
- 导出前预览

### 9.4 V2
- 多格式同时导出
- 增量导出
- 插件内能力矩阵
- 社区适配器 SDK
- 导入知识库模板

---

## 10. 非功能需求

### 10.1 性能
- 单个会话导出响应时间尽量 < 3 秒（不含大体量 PDF）
- 批量导出支持分批处理和队列
- 大量会话不阻塞 UI

### 10.2 稳定性
- 站点 DOM 变化时不应导致整个扩展崩溃
- 每个会话导出错误不应中断整批任务

### 10.3 安全与隐私
- 不上传聊天内容到自建服务器
- 默认不收集遥测
- 调试日志默认仅本地保存
- 权限按需申请

### 10.4 可维护性
- 每站点独立目录
- 通用核心模块清晰分层
- 类型定义统一
- 可测试、可扩展

---

## 11. 技术方案摘要

### 11.1 架构
- Manifest V3
- TypeScript
- React + Tailwind
- Background Service Worker
- Content Scripts
- Extension Page / Dashboard
- IndexedDB 存储导出任务和缓存

### 11.2 分层
- `adapters/`：站点适配器
- `content/`：页面读取与桥接
- `background/`：任务调度、消息总线、下载
- `exporters/`：md/pdf/docx/zip 生成
- `storage/`：IndexedDB 持久化
- `ui/`：Popup、Dashboard、Settings
- `core/`：类型、协议、日志、能力矩阵

### 11.3 数据获取策略
优先级：
1. 从 DOM / 前端状态读取当前已渲染数据
2. 在已授权前提下，利用用户本地浏览器直接调用目标站点接口
3. 回退为“逐个会话采集”或“官方导出说明”

---

## 12. 站点能力矩阵（初稿）

| 站点 | 当前会话导出 | 列表扫描 | Workspace | 批量导出 | 附件元数据 |
|---|---|---:|---:|---:|---:|
| ChatGPT | 支持 | 计划支持 | 计划支持 | 计划支持 | 部分支持 |
| Claude | 支持 | 计划支持 | 计划支持 | 计划支持 | 部分支持 |
| Gemini | 支持 | 计划支持 | 待验证 | 计划支持 | 待验证 |
| Kimi | 支持 | 计划支持 | 待验证 | 计划支持 | 待验证 |
| DeepSeek | 支持 | 计划支持 | 待验证 | 计划支持 | 待验证 |
| Grok | 支持 | 计划支持 | 待验证 | 计划支持 | 待验证 |

说明：该矩阵为产品规划矩阵，不代表所有站点在初版即完成全量能力。

---

## 13. 风险与回退方案

### 13.1 主要风险
- 站点 DOM 与前端实现变化频繁
- 不同站点的工作空间模型差异大
- 批量接口未公开或前端限制较多
- 浏览器权限提示可能影响安装转化
- PDF / DOCX 对复杂消息格式还原存在边界

### 13.2 回退方案
- 保留“当前会话导出”作为稳定主路径
- DOM 扫描失败时切换为手动打开会话采集
- 对暂不支持的站点能力明确展示“仅当前会话可导出”
- 为官方导出能力强的平台提供说明入口

---

## 14. 成功指标

### 14.1 产品指标
- 单会话导出成功率 > 95%
- 批量导出任务完成率 > 85%
- 支持站点数 >= 6
- 首次安装后 3 分钟内完成首个导出

### 14.2 工程指标
- 核心模块单元测试覆盖主要导出逻辑
- 每个适配器具备最小 smoke test
- 导出数据模型稳定并向后兼容

---

## 15. 发布路线图

### Milestone 1
- 初始化仓库
- MV3 骨架
- Popup + Dashboard
- 当前 ChatGPT 会话 Markdown 导出

### Milestone 2
- PDF / DOCX
- 批量任务队列
- ZIP 导出
- 历史记录

### Milestone 3
- Claude / Gemini
- Kimi / DeepSeek / Grok
- Workspace 支持

### Milestone 4
- Firefox 兼容
- 适配器 SDK
- 社区贡献指南

---

# 二、Manifest 权限草案

## 1. 设计原则
- 默认最小权限
- 站点级访问尽量走 `optional_host_permissions`
- 默认不申请无必要高风险权限
- 仅保留导出所需权限

## 2. 初始建议权限

### 必需权限
- `storage`
  - 保存设置、导出历史、任务状态、站点缓存
- `downloads`
  - 下载 md/pdf/docx/zip 文件
- `scripting`
  - 动态注入内容脚本与执行站点桥接
- `activeTab`
  - 在用户主动触发时，临时访问当前标签页

### 可选权限
- `tabs`
  - 需要读取多个匹配标签页信息时再申请
- `notifications`
  - 导出完成提醒（可后续版本启用）

### 可选主机权限（建议）
```json
[
  "https://chatgpt.com/*",
  "https://claude.ai/*",
  "https://gemini.google.com/*",
  "https://kimi.moonshot.cn/*",
  "https://chat.deepseek.com/*",
  "https://grok.com/*",
  "https://x.com/i/grok*"
]
```

> 注：Grok 相关 host 需根据最终产品页面与实际路由进一步确认。

## 3. Manifest 初稿

```json
{
  "manifest_version": 3,
  "name": "AI Chat Exporter",
  "short_name": "AI Exporter",
  "version": "0.1.0",
  "description": "Export chats from major AI websites to Markdown, PDF, DOCX, and ZIP — locally.",
  "icons": {
    "16": "assets/icons/16.png",
    "32": "assets/icons/32.png",
    "48": "assets/icons/48.png",
    "128": "assets/icons/128.png"
  },
  "action": {
    "default_title": "AI Chat Exporter",
    "default_popup": "src/ui/popup/index.html"
  },
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "permissions": [
    "storage",
    "downloads",
    "scripting",
    "activeTab"
  ],
  "optional_permissions": [
    "tabs",
    "notifications"
  ],
  "optional_host_permissions": [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://kimi.moonshot.cn/*",
    "https://chat.deepseek.com/*",
    "https://grok.com/*",
    "https://x.com/i/grok*"
  ],
  "host_permissions": [],
  "web_accessible_resources": [
    {
      "resources": [
        "src/content/bridge.js",
        "assets/*"
      ],
      "matches": ["<all_urls>"]
    }
  ],
  "options_page": "src/ui/options/index.html"
}
```

## 4. Firefox 兼容字段草案

```json
{
  "browser_specific_settings": {
    "gecko": {
      "id": "ai-chat-exporter@example.com",
      "strict_min_version": "121.0"
    }
  }
}
```

## 5. 权限申请策略
- 初次安装后，不主动申请所有 host 权限
- 用户在站点内点击“启用本站导出”时，请求该站点 `optional_host_permissions`
- 当前会话导出优先使用 `activeTab`
- 批量扫描或 workspace 导出时，如需更稳定访问，则提示授予站点权限

---

# 三、项目目录初始化清单

## 1. 建议技术栈
- Vite
- TypeScript
- React
- Tailwind CSS
- Zustand（状态管理，可选）
- Dexie / idb（IndexedDB 封装）
- JSZip
- pdf-lib
- docx
- Turndown（HTML -> Markdown）
- Vitest
- Playwright（可后置）

## 2. 根目录建议

```text
ai-chat-exporter/
├─ src/
│  ├─ adapters/
│  │  ├─ chatgpt/
│  │  │  ├─ index.ts
│  │  │  ├─ selectors.ts
│  │  │  ├─ parser.ts
│  │  │  └─ capabilities.ts
│  │  ├─ claude/
│  │  ├─ gemini/
│  │  ├─ kimi/
│  │  ├─ deepseek/
│  │  ├─ grok/
│  │  └─ shared/
│  │     ├─ base.ts
│  │     ├─ types.ts
│  │     └─ utils.ts
│  ├─ background/
│  │  ├─ service-worker.ts
│  │  ├─ message-bus.ts
│  │  ├─ permissions.ts
│  │  └─ download.ts
│  ├─ content/
│  │  ├─ index.ts
│  │  ├─ bridge.ts
│  │  ├─ dom.ts
│  │  └─ observer.ts
│  ├─ core/
│  │  ├─ types.ts
│  │  ├─ constants.ts
│  │  ├─ logger.ts
│  │  ├─ jobs.ts
│  │  ├─ errors.ts
│  │  ├─ filename.ts
│  │  └─ capabilities.ts
│  ├─ exporters/
│  │  ├─ markdown.ts
│  │  ├─ pdf.ts
│  │  ├─ docx.ts
│  │  ├─ zip.ts
│  │  ├─ html-template.ts
│  │  └─ shared.ts
│  ├─ storage/
│  │  ├─ db.ts
│  │  ├─ settings.ts
│  │  ├─ jobs.ts
│  │  └─ history.ts
│  ├─ ui/
│  │  ├─ popup/
│  │  │  ├─ index.html
│  │  │  ├─ main.tsx
│  │  │  └─ App.tsx
│  │  ├─ dashboard/
│  │  │  ├─ index.html
│  │  │  ├─ main.tsx
│  │  │  ├─ App.tsx
│  │  │  ├─ pages/
│  │  │  └─ components/
│  │  ├─ options/
│  │  │  ├─ index.html
│  │  │  ├─ main.tsx
│  │  │  └─ App.tsx
│  │  └─ shared/
│  │     ├─ components/
│  │     ├─ hooks/
│  │     └─ theme/
│  ├─ utils/
│  │  ├─ time.ts
│  │  ├─ browser.ts
│  │  └─ sanitize.ts
│  └─ manifest.ts
├─ tests/
│  ├─ unit/
│  ├─ fixtures/
│  └─ e2e/
├─ docs/
│  ├─ prd.md
│  ├─ architecture.md
│  ├─ adapters.md
│  ├─ permissions.md
│  └─ roadmap.md
├─ assets/
│  ├─ icons/
│  └─ images/
├─ scripts/
│  ├─ build-firefox.ts
│  └─ zip-release.ts
├─ .github/
│  ├─ workflows/
│  │  ├─ ci.yml
│  │  └─ release.yml
│  ├─ ISSUE_TEMPLATE/
│  └─ PULL_REQUEST_TEMPLATE.md
├─ public/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ postcss.config.cjs
├─ .gitignore
├─ LICENSE
└─ README.md
```

## 3. 首批必建文件
- `README.md`
- `LICENSE`
- `.gitignore`
- `package.json`
- `src/manifest.ts`
- `src/background/service-worker.ts`
- `src/content/index.ts`
- `src/ui/popup/App.tsx`
- `src/ui/dashboard/App.tsx`
- `src/core/types.ts`
- `src/adapters/shared/base.ts`
- `src/exporters/markdown.ts`
- `src/storage/db.ts`

## 4. 首批 issue 列表建议
1. 初始化扩展工程
2. 搭建 popup + dashboard
3. 定义标准数据模型
4. 实现 ChatGPT 当前会话 Markdown 导出
5. 实现下载与文件命名
6. 引入 IndexedDB 历史记录
7. 实现批量任务队列
8. 接入 PDF / DOCX
9. Claude 适配器
10. Gemini 适配器
11. Kimi 适配器
12. DeepSeek 适配器
13. Grok 适配器
14. Firefox 兼容
15. 完善 README / 贡献指南

---

# 四、完整 README

```md
# AI Chat Exporter

Export chats from major AI websites to Markdown, PDF, DOCX, and ZIP — locally.

## Overview

AI Chat Exporter 是一个完全开源、离线优先的浏览器扩展，帮助你从主流 AI 官网导出聊天记录，包括个人账号和工作空间数据，并保存为本地文件。

它的目标不是把你的数据再同步到第三方服务器，而是在你自己的浏览器中完成采集、转换和下载。

## Features

- 支持主流 AI 官网聊天记录导出
- 支持个人账号和工作空间（逐步支持）
- 支持单会话导出
- 支持批量导出并打包为 ZIP
- 支持 Markdown / PDF / DOCX
- 支持漂亮的 Dashboard 管理界面
- 支持导出历史记录与失败重试
- 完全开源
- 无自建后端依赖
- 离线优先

## Supported Sites

Planned / In Progress:

- ChatGPT
- Claude
- Gemini
- Kimi
- DeepSeek
- Grok

> 注意：不同站点的能力不同。初版会优先支持“当前会话导出”，随后逐步完善会话列表、工作空间和批量导出。

## Why this project

当前主流 AI 产品的聊天记录通常：
- 分散在不同平台
- 不方便导出为适合归档的格式
- 难以批量管理
- 很少提供统一、稳定、开源的本地导出方案

AI Chat Exporter 试图解决这些问题。

## Design Goals

- **Local-first**：所有处理尽量在本地完成
- **Open source**：代码透明、可审计、可贡献
- **Minimal permissions**：按需申请站点访问权限
- **Adapter-based**：每个站点独立适配
- **Export-friendly**：输出适合知识库、备份和再利用

## Architecture

```text
Browser Extension
├─ Popup / Dashboard UI
├─ Background Service Worker
├─ Content Scripts
├─ Site Adapters
├─ Exporters (md/pdf/docx/zip)
└─ IndexedDB Storage
```

### Core Layers

- `adapters/`: 站点适配器
- `content/`: 页面数据读取
- `background/`: 权限、调度、下载
- `exporters/`: 导出格式转换
- `storage/`: 本地任务与历史
- `ui/`: 用户界面
- `core/`: 类型、协议、日志

## Permissions Strategy

默认权限：
- `storage`
- `downloads`
- `scripting`
- `activeTab`

可选权限：
- `tabs`
- `notifications`
- 站点 `optional_host_permissions`

站点权限只在用户启用对应站点导出能力时请求。

## Privacy

- 不依赖自建后端
- 默认不上传聊天内容
- 默认不采集遥测
- 所有导出文件由用户本地生成和保存

## Installation (Development)

### Prerequisites

- Node.js 20+
- pnpm / npm / yarn
- Chrome / Edge / Firefox Developer Edition

### Setup

```bash
git clone https://github.com/Wanfeng1028/aichat_export_tools.git
cd aichat_export_tools
npm install
```

### Run in development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Load the extension

#### Chrome / Edge
1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择构建输出目录

#### Firefox
1. 打开 `about:debugging`
2. 选择 “This Firefox”
3. 点击 “Load Temporary Add-on”
4. 选择构建后的 manifest 文件

## Project Structure

```text
src/
├─ adapters/
├─ background/
├─ content/
├─ core/
├─ exporters/
├─ storage/
├─ ui/
└─ utils/
```

## Roadmap

### v0.1
- [ ] 项目初始化
- [ ] Popup / Dashboard
- [ ] ChatGPT 当前会话 Markdown 导出

### v0.2
- [ ] PDF / DOCX 导出
- [ ] 批量导出 ZIP
- [ ] 历史记录

### v0.3
- [ ] Claude / Gemini
- [ ] Kimi / DeepSeek / Grok
- [ ] Workspace 支持

### v0.4
- [ ] Firefox 兼容增强
- [ ] Adapter SDK
- [ ] 社区站点扩展指南

## Development Conventions

- 使用 TypeScript
- 所有站点逻辑必须放在独立 adapter 中
- 不允许把多站点 DOM 选择器混写在一个文件中
- 导出格式基于统一中间模型
- 权限申请遵循最小化原则

## Adapter Principles

每个站点适配器应当至少实现：
- 站点识别
- 登录状态检测
- 会话列表获取（若支持）
- 单个会话解析
- 能力声明

## Export Format Principles

### Markdown
- 便于知识库和 Git 管理
- 保留结构化消息内容

### PDF
- 适合归档、打印、分享

### DOCX
- 适合进一步编辑和办公协作

### ZIP
- 用于批量导出结果打包

## Limitations

- 某些站点可能因前端更新而暂时失效
- 某些工作空间能力需要额外授权或更复杂适配
- 某些附件可能只能导出元数据，无法直接下载原文件
- 批量导出能力依赖具体站点实现

## Security Notes

本项目不会尝试绕过登录、付费限制、访问控制或平台安全机制。

你只能导出你当前账号在当前浏览器中可访问的数据。

## Contributing

欢迎贡献：
- 新站点适配器
- 导出格式改进
- UI / UX 改进
- Bug 修复
- 文档完善

建议流程：
1. Fork 仓库
2. 新建分支
3. 提交变更
4. 发起 Pull Request

## Suggested Labels

- `adapter`
- `exporter`
- `ui`
- `permissions`
- `bug`
- `enhancement`
- `good first issue`
- `help wanted`

## License

MIT

## Disclaimer

This project is an independent open-source tool. It is not affiliated with or endorsed by OpenAI, Anthropic, Google, Moonshot, DeepSeek, xAI, or any other platform.
```

---

# 五、你现在就可以做的第一批提交

## Commit 1
- 初始化 `README.md`
- 添加 `LICENSE`
- 建立 `src/` 目录骨架

## Commit 2
- 接入 Vite + React + TS
- 输出 Popup 页面
- 配置 MV3 manifest

## Commit 3
- 定义 `core/types.ts`
- 实现 `markdown.ts`
- 实现 `download.ts`

## Commit 4
- 实现 ChatGPT adapter 最小版
- 支持当前会话导出 md

## Commit 5
- 增加 Dashboard
- 增加历史记录
- 增加任务状态

---

# 六、建议仓库说明文案（简版）

AI Chat Exporter 是一个完全开源、离线优先的浏览器扩展，支持从主流 AI 官网导出聊天记录到 Markdown、PDF、DOCX 和 ZIP。它采用站点适配器架构，支持个人账号与工作空间，并尽量在本地完成数据处理，不依赖第三方后端。

