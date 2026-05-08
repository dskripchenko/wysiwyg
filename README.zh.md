# @dskripchenko/wysiwyg

> 🌐 [English](README.md) · [Русский](README.ru.md) · [Deutsch](README.de.md) · **中文**

完整的 Vue 3 WYSIWYG 编辑器，**对编辑器库零 peer 依赖** — 无 Tiptap、
无 ProseMirror、无 Quill、无 Slate。基于 `contenteditable` +
Selection/Range API 构建。

[![npm](https://img.shields.io/npm/v/@dskripchenko/wysiwyg)](https://www.npmjs.com/package/@dskripchenko/wysiwyg)
[![License](https://img.shields.io/npm/l/@dskripchenko/wysiwyg)](LICENSE)

~12 KB gzip。可选地使用 `@dskripchenko/ui` 提供工具栏图标。

## 安装

```bash
npm i @dskripchenko/wysiwyg
```

可选（用于更好的图标）：

```bash
npm i @dskripchenko/ui lucide-vue-next
```

## 快速开始

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'
import '@dskripchenko/wysiwyg/style.css'

const html = ref('<p>你好 <strong>世界</strong>！</p>')
</script>

<template>
  <DskWysiwyg v-model="html" :resizable="true" />
</template>
```

## 功能

- **行内标记** — bold/italic/underline/strike/code、链接、图片、hr。
- **块格式** — 标题 (h1-h6)、blockquote、ul/ol、code-block。
- **Markdown 快捷方式** — 块开始处的 `# `、`## `、`- `、`1. `、`> `、
  ` ``` `。
- **斜杠命令** — 输入 `/` 打开包含 heading/list/quote/code/hr/table
  命令的弹窗。
- **表格** — insert / addRow / addColumn / removeRow / removeColumn /
  removeTable。
- **代码语法高亮** — `<pre><code class="language-X">` 块中的
  js/ts/tsx/jsx/php/html/css/json。
- **HTML→Markdown** — `htmlToMarkdown(html)` 助手。
- **源代码模式** — 切换到原始 HTML 编辑器，查看时美化，保存时压缩，
  语法高亮覆盖层。
- **Sanitize** — 基于 DOMParser 的白名单（自有实现）。
- **撤销/重做** — 带节流提交的自定义历史栈。
- **热键** — ⌘B、⌘I、⌘U、⌘Z、⌘⇧Z。
- **主题** — 感知 `data-theme="dark"` / `:root.dark` /
  `prefers-color-scheme: dark`。
- **可调整大小** — 用户可以垂直调整小部件大小（通过 props 设置
  min/max）。

## 文档

- [快速开始](docs/en/getting-started.md) (en)
- [控制器 API](docs/en/controller-api.md) (en)
- [扩展](docs/en/extensions.md) (en)
- [自定义](docs/en/customization.md) (en)
- [迁移指南](docs/en/migration-guide.md) (en)

## 许可证

[MIT](LICENSE) © Denis Skripchenko
