# Changelog

本仓库变更记录遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循语义化版本。更细的历史以 git log 与 GitHub Releases 为准。

## [Unreleased]

### Added

- `AGENTS.md`：AI 编码代理工作规范（本机零验证、本机禁止一切下载等硬性约定）。
- 根目录文档套件：`ARCHITECTURE.md`（架构）、`DESIGN.md`（视觉）、`CHANGELOG.md`；`QWEN.md` 指向 `AGENTS.md`。
- `CONTRIBUTING.md` 增加 AI 编码代理例外说明（不本地跑测试与构建，以 CI 为准）。

### Fixed

- Markdown 导出：表格单元格转义 `|` 与换行、无 `thead` 表格首行重复、`thead` 内 `td` 表头整表丢失、代码块含 ``` 时围栏被击穿、附件链接的 URL 与标签转义。
- 文件名：按码点截断（不再切断 emoji 代理对）、剥离控制字符、处理 Windows 保留设备名（CON/PRN/…）、截断后去尾部点与空格。
- DOCX：剥离 XML 非法控制字符（避免 Word 拒开整份文档）、补 `w:eastAsia` 中文字体槽、标题使用 Heading1 样式、导出时间转义。
- 批量导出：单个会话失败不再拖垮整批（写入 error.txt 并计失败数）、文件夹名对 id 做净化并去重。
- PDF：字体资产全部加载失败时用标准字体兜底，不再因 CJK 字符直接抛编码错误（替换为 `?`）；纯 HTML 消息在 PDF/DOCX/ZIP/HTML 导出中不再显示为空。
- 站点适配：generic 适配器角色识别改词边界匹配（`me` 不再命中 `message`）、不再把前一条消息正文混入角色判断；嵌套消息容器去重改为包含度判断（不再静默丢消息、保留短消息）；qianwen 适配器不再把整段会话当第一条消息、会话列表改用条目真实 id/url、会话根选择器按优先级尝试；标题只剥站点后缀（`C++ - 入门` 不再被截断）；ChatGPT 附件提取排除头像/图标图片与普通正文链接。
- 权限与站点识别：主机名精确匹配（`netflix.com` 不再被误判成 Grok 并弹出错误站点的授权框）；popup/dashboard 导出流程先申请权限再查询状态（修复首次使用必报错）；URL 识别不出站点时显式停止而非兜底 chatgpt。
- 后台：导出任务状态改 Dexie 原子更新（消除并发覆盖竞态）；批量导出回报归档内的真实成功/失败计数。
- Manifest：`web_accessible_resources` 收敛到受支持站点；移除未使用的 `notifications` 可选权限；移除与实际实现不符的 Firefox gecko 声明。
- UI：嵌入式浮窗卡片背景色改用合法 Tailwind 透明度刻度（`bg-white/90`）；响应形状异常时显示明确的「未知响应」文案而非成功文案。

## [0.1.0] - 2026-04-08

### Added

- Chrome MV3 扩展 MVP：ChatGPT 对话导出 Markdown，popup / dashboard / options 三界面。
- PDF / DOCX 导出（pdf-lib 内嵌 Noto Sans SC；docx 生成）。
- ZIP 打包、批量导出、任务与历史记录（本地 IndexedDB 存储）。

[Unreleased]: https://github.com/Wanfeng1028/aichat_export_tools/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Wanfeng1028/aichat_export_tools/releases/tag/v0.1.0
