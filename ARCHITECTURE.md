# ARCHITECTURE.md — 架构规范

> 本文档描述 AI Chat Exporter（Chrome MV3 扩展）的架构分层、运行时流程与数据模型。
> 动架构前先读本文件与 [AGENTS.md](./AGENTS.md)；站点支持明细见 [docs/adapters.md](./docs/adapters.md)，权限模型见 [docs/permissions.md](./docs/permissions.md)。

## 版本记录

| 版本 | 日期 | 修改人 | 修改摘要 |
| --- | --- | --- | --- |
| v1.0 | 2026-10-07 | AI 编写：ZCode CLI · GLM-5.3-Flash（account:zai-start-plan/GLM-5.3-Flash）；发起：晚风（Wanfeng1028，审核） | 初稿：自 docs/architecture.md 扩充为根目录主架构文档 |

## 1. 总览

Chrome MV3 扩展，全部导出逻辑在浏览器**本地**完成：解析当前标签页的对话 DOM → 归一化数据 → 生成 Markdown / PDF / DOCX / ZIP → 经 `chrome.downloads` 落盘。无自建服务器，不经任何第三方转存。

## 2. 分层与目录

| 目录 | 职责 |
| --- | --- |
| `src/ui/` | 三个人机界面：`popup/`（弹窗）、`dashboard/`（仪表盘）、`options/`（设置页），React 渲染 |
| `src/ui/shared/` | 跨界面共享：`theme/`（全局样式与设计令牌）、`i18n.ts` + `useLanguage`（中英双语） |
| `src/background/` | Service Worker：消息路由、权限保障、下载管线、任务与历史记录 |
| `src/content/` | Content Script 桥：站点检测（`detectSupportedSiteFromUrl()` / `getAdapter()`）并把请求路由给适配器 |
| `src/adapters/` | 站点适配器，按站点隔离：`chatgpt/`、`qianwen/`、`generic/`（兜底）、`shared/` |
| `src/exporters/` | 导出器：`markdown.ts`、`pdf.ts`、`docx.ts`、`zip.ts`、`batch.ts`、`html-template.ts` |
| `src/storage/` | Dexie（IndexedDB）持久化：导出任务与历史 |
| `src/core/` | 共享类型、文件名生成、通用工具 |
| `src/manifest.ts` | MV3 manifest 生成源，构建期落盘 |

依赖方向：`ui → background（runtime 消息）→ content → adapters → core`；`exporters` 只依赖 `core` 的归一化模型。禁止反向依赖与跨层直连；站点选择器只允许出现在该站点的适配器目录内。

## 3. 运行时流程

1. UI 发起 `chrome.runtime` 消息。
2. Background 校验权限，必要时注入 Content Script。
3. Content Script 把请求路由给当前站点适配器。
4. 适配器返回归一化对话数据。
5. Exporter 生成 `Blob` 产物（PDF 用 pdf-lib + fontkit 内嵌 Noto Sans SC；HTML→Markdown 用 turndown）。
6. Background 经 `chrome.downloads` 下载文件，并把任务 / 历史状态写入 Dexie。

## 4. 数据模型

核心归一化模型 `ChatConversation`：

- 会话元数据：站点、id、标题、URL、导出时间
- 有序消息列表（角色归一化）
- 可选附件元数据

所有导出器共用该模型，站点特有逻辑与输出格式互相隔离。

## 5. 权限模型

- 常驻权限：`storage`、`downloads`、`scripting`、`activeTab`。
- 可选权限：`tabs`、`notifications`；站点主机权限全部声明为 `optional_host_permissions`，按需申请（最小权限原则）。
- 明细见 [docs/permissions.md](./docs/permissions.md)。

## 6. 构建与 CI

- 构建：`vite build` + `scripts/build-content.mjs`（content script 产物）+ `scripts/copy-manifest.mjs`（manifest 落盘）→ `dist/`，在 Chrome `chrome://extensions/` 以「加载已解压的扩展程序」载入。
- CI（`.github/workflows/ci.yml`，job `validate`）：`npm ci` → `npm run typecheck` → `npm test` → `npm run build`；push 到 `master` / `main` / `codex/**` 或 PR 触发。**CI 是验证的唯一裁判**（AGENTS.md §2.1，本机零验证）。

## 7. 当前约束与扩展点

- 站点支持进度以 [README.md](./README.md) 支持表与 [docs/adapters.md](./docs/adapters.md) 为准；未完整支持的站点必须在 UI 中明确标注为占位 / 部分支持，不得写成已完成。
- 批量导出依赖后台逐个打开会话标签页。
- 新增站点适配器：在 `src/adapters/` 下新建目录，实现 `SiteAdapter` 接口（`getStatus()` / `exportCurrentConversation()` / `scanConversationList()`），并在 `src/content/index.ts` 注册主机匹配；步骤详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
