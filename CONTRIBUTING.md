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

### 开发流程

1. 从最新的 `main` 或当前主分支拉出新分支。
2. 进行聚焦、单一目的的修改。
3. 运行 `npm test`。
4. 运行 `npm run build`。
5. 提交 Pull Request，并附上验证说明。

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

### Development Flow

1. Create a branch from the latest `main` branch or the current primary branch.
2. Make focused, single-purpose changes.
3. Run `npm test`.
4. Run `npm run build`.
5. Open a pull request with validation notes.

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
