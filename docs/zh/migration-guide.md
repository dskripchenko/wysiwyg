# 迁移指南

## 0.2.x → 0.2.7（调整大小手柄）

**破坏性变更**（仅 CSS）：
`min-height`/`max-height` 从 `.dsk-wysiwyg__content` 移到了根元素
`.dsk-wysiwyg`。如果你的宿主项目通过内部内容选择器设置尺寸，请改为作用于根元素，
或使用新的 CSS 变量（`--dsk-wysiwyg-min-height`、`--dsk-wysiwyg-max-height`），
它们保留了旧的 API。

## 0.2.0 → 0.2.x 补丁系列（B1-B7、F1-F4）

非破坏性——缺陷修复和新的工具栏功能（源代码模式、美化/压缩、语法高亮覆盖层）。

## 0.1.x → 0.2.0

**包体积**：约 7 KB → 约 12 KB gz（新增 Markdown 快捷方式、斜杠菜单、表格、
语法高亮）。没有新增 peer 依赖。

**清洗白名单**扩展：`table`/`thead`/`tbody`/`tr`/`th`/`td`，以及
`code`/`span` 上带 `language-` 和 `dsk-tok-` 前缀的 `class` 属性。

**新增的公共 API**：
- `htmlToMarkdown(html)` — HTML 到 Markdown 的转换器
- `highlight(code, language)` — 语法高亮（返回 HTML）
- `DskWysiwygSlashMenu` + `SlashCommand` 类型 — 用于自定义斜杠命令扩展

## 0.0.x → 0.1.0（首个稳定版）

预稳定版本。0.1.0 之前的任何版本都可能包含破坏性变更。

## 另请参阅

- [`CHANGELOG.md`](../../CHANGELOG.md) — 完整的变更历史
