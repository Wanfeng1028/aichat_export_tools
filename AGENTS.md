# AGENTS.md — AI 编码代理工作规范

> 本文件面向**任何在本仓库工作的 AI 编码代理**（ZCode / Claude Code / Codex / Qwen Code / opencode 等）。
> 进入本仓库后请先完整阅读本文件，再按需阅读 [docs/architecture.md](./docs/architecture.md)（架构）与 [docs/adapters.md](./docs/adapters.md)（站点适配）。
> 与仓库内其他文档冲突时，**以本文件为准**。

## 版本记录

| 版本 | 日期 | 修改人 | 修改摘要 |
| --- | --- | --- | --- |
| v1.0 | 2026-10-07 | AI 编写：ZCode CLI · GLM-5.3-Flash（account:zai-start-plan/GLM-5.3-Flash）；发起：晚风（Wanfeng1028，审核） | 初稿：确立「本机零验证」与「本机禁止一切下载」两大硬性约定 |

## 1. 项目上下文（30 秒版）

- Chrome MV3 扩展（ai-chat-exporter）：在浏览器**本地**把 AI 站点对话导出为 Markdown / PDF / DOCX / ZIP，不经任何服务器。
- 技术栈：TypeScript + React 18 + Vite + Tailwind；状态管理 zustand；本地存储 Dexie；导出依赖 pdf-lib / docx / jszip；HTML→Markdown 用 turndown。包管理用 **npm**（不是 pnpm）。
- 分层：`src/ui/`、`src/background/`、`src/content/`、`src/adapters/`（按站点隔离，禁止跨站点混用选择器）、`src/exporters/`、`src/storage/`、`src/core/`。
- **验证的唯一裁判是远端 CI**：`.github/workflows/ci.yml`（job `validate`）在 push 到 `master` / `main` / `codex/**` 或开 PR 时运行 `npm ci` → `npm run typecheck` → `npm test` → `npm run build`。

## 2. 硬性约定（违反即返工）

### 2.1 本机零验证

- 本机**禁止**运行任何验证命令：`npm test`、`npm run typecheck`、`npm run build`、`npm run dev` / `preview`、lint、eval 等一律不跑；不要试图在本机达成「全绿」再提交。
- 完成修改 → `git commit` → `git push` → 远端 CI 自动运行 → **只看 CI 结论**。
- CI 红（类型错误 / 测试失败 / 构建失败）是正常中间态：定位原因，用**下一个 commit** 修复；禁止 revert，禁止 force push。
- 本机对代码的唯一合法操作：**读写文件 + git**。
- 写测试仍是任务的一部分（新功能与修复应带测试），只是**不在本地执行**。

### 2.2 本机禁止一切下载

- 本机禁止执行任何安装 / 下载类命令：`npm install` / `npm ci` / `npm update` / `npm install -g`、`pip install`、`apt-get install`、`brew install`、浏览器与 CDN 拉取等。
- 排查问题时只使用仓库中**已有的** `node_modules`；缺失就直接读源码或查在线文档。
- **新增依赖的流程**：AI 只允许手改 `package.json`（版本区间明确），并在提交说明注明「锁文件待生成」；`npm install` 由人类执行，或经用户明示授权后进行。`package-lock.json` 只允许包含本次任务的改动。锁文件同步前 CI 的 `npm ci` 红是预期中间态。
- 若确需临时授权下载，先问一句网络情况（宽带还是热点），再执行。

### 2.3 参考项目禁止克隆到本地

- 任何外部项目 / 仓库**不得克隆或下载到本地**，包括参考实现与本仓库的历史版本。
- 只允许在线访问：`gh api` 或原始文件直读（raw）、npm registry、官方文档。
- 派生子代理执行任务时，必须在子代理的提示词中写明本条。

### 2.4 文件删除保护

- 不得删除任何现有文件，不得移动 / 重命名文件，除非用户明确指示。
- 用户口头下达删除指令时，必须先复述删除对象与后果、得到确认后再执行。

### 2.5 修改收敛，不夹带

- 一次会话的修改必须以 `git commit` + `git push` 收尾（除非用户明确要求暂存观察）。
- 不做当前任务之外的事；顺手发现的新想法记入 TODO / issue，不顺手实现。

### 2.6 文档变更必须更新版本记录表

- 任何带版本记录表的文档被修改时，在文首表格新增一行：版本号、日期、修改人、修改摘要。
- 版本号规则：笔误级修正 +0.0.1；增补或修改条款 +0.1；大范围重构或原则变化 +1.0。

### 2.7 语言与提交信息

- 文档与代码注释用中文；标识符用英文。
- 提交信息用 conventional commits 风格，沿仓库既有习惯；以任务为单位收敛提交。

## 3. 常用命令（CI 与人工排查工具箱，AI 本机不跑）

| 命令 | 作用 | AI 本机执行 |
| --- | --- | --- |
| `npm run typecheck` | TypeScript 类型检查（CI 同款） | ❌ 禁止 |
| `npm test` | vitest 测试（CI 同款） | ❌ 禁止 |
| `npm run build` | 构建扩展产物到 `dist/`（CI 同款） | ❌ 禁止 |
| `npm run dev` | Vite 监听构建 | ❌ 禁止（仅人类调试用） |

## 4. 工作节奏

1. 改代码 / 文档（含新增测试）；相关文档补版本记录行。
2. `git commit` → `git push`（推 `master` 或开 PR 均触发 CI）。
3. 看 CI 结论：绿 → 任务完成；红 → 下一个 commit 修复。

## 5. 规则的存放位置

- 本文件（`AGENTS.md`）是唯一主规则文件；ZCode / Codex / Qwen Code 原生读取，无需 shim。
- 只有在实际启用某工具且其不读 `AGENTS.md` 时，才为该工具创建一行 shim 文件（如 `CLAUDE.md` 内容仅 `@AGENTS.md`）。
