# DESIGN.md — 视觉设计规范

> 本文档约束 AI Chat Exporter 三个界面（popup / dashboard / options）的视觉语言。改 UI 前先读本文件与 [AGENTS.md](./AGENTS.md)。
> 设计令牌的唯一来源是 `tailwind.config.ts` 与 `src/ui/shared/theme/index.css`；本文件是它们的设计语义说明，两者不一致时以代码为准并回改本文件。

## 版本记录

| 版本 | 日期 | 修改人 | 修改摘要 |
| --- | --- | --- | --- |
| v1.0 | 2026-10-07 | AI 编写：ZCode CLI · GLM-5.3-Flash（account:zai-start-plan/GLM-5.3-Flash）；发起：晚风（Wanfeng1028，审核） | 初稿：自 tailwind.config.ts 与 theme/index.css 沉淀设计令牌 |

## 1. 设计原则

- 本地工具的克制感：信息密度优先于装饰，无插画、无营销感。
- 「海面」隐喻：底色为泡沫白（foam），文字为墨色（ink），结构线为薄雾（mist），次级信息为潮青（tide），唯一强调色为琥珀（ember）。
- 中英双语同等优先：所有用户可见文案走 `src/ui/shared/i18n.ts` + `useLanguage`，禁止在组件里硬编码文案。

## 2. 色彩令牌

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `ink` | `#101828` | 主文字、强调内容 |
| `mist` | `#dce6f2` | 分隔线、弱填充、卡片描边 |
| `tide` | `#6d8aa8` | 次级文字、图标、辅助信息 |
| `foam` | `#f7fbff` | 页面底色起点 |
| `ember` | `#e67e22` | 唯一强调色：主按钮、进行中状态、焦点；不得作大面积底色 |

页面背景为双层渐变（`theme/index.css`）：左上角 18% 透明度的 ember 径向光晕，叠 `foam → #edf4fb` 纵向线性渐变。

## 3. 字体

- 默认字族（Tailwind `font-sans`）：`Space Grotesk`，回退 `ui-sans-serif` / `system-ui` / `sans-serif`。
- 中文：`@fontsource/noto-sans-sc`（Noto Sans SC），同时用作 PDF 导出的内嵌字体（fontkit）。
- 层级用字重与 `ink` / `tide` 灰阶区分，不引入第二字族。

## 4. 形状与阴影

- 卡片使用 `shadow-panel`：`0 18px 40px rgba(16, 24, 40, 0.12)`，配大圆角与 `mist` 浅描边。
- `body` 最小高度 520px（弹窗场景）；全局 `box-sizing: border-box`。

## 5. 界面清单

| 界面 | 入口 | 定位 |
| --- | --- | --- |
| Popup | 工具栏图标 | 当前会话快速导出 |
| Dashboard | 扩展页 | 会话列表、批量导出、任务与历史 |
| Options | 设置页 | 语言、权限、站点偏好 |

本表描述信息架构，不锁定像素；具体交互以实现为准。

## 6. 图标资产

- `public/icons/`：`icon-16 / 32 / 48 / 128.png`，由 `src/manifest.ts` 的 `icons` 字段引用，更换需同步该文件。
- `public/logo.png`：仓库标识。

## 7. 明确未实现

- 暗色模式：未实现。不得在文档或 UI 中声称支持；若要支持，先在 `theme/` 扩令牌，再动组件。
