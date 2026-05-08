# @dskripchenko/wysiwyg

> 🌐 **English** · [Русский](README.ru.md) · [Deutsch](README.de.md) · [中文](README.zh.md)

A full-featured Vue 3 WYSIWYG editor with **zero peer dependencies on
editor libraries** — no Tiptap, no ProseMirror, no Quill, no Slate.
Built on `contenteditable` + Selection/Range API.

[![npm](https://img.shields.io/npm/v/@dskripchenko/wysiwyg)](https://www.npmjs.com/package/@dskripchenko/wysiwyg)
[![License](https://img.shields.io/npm/l/@dskripchenko/wysiwyg)](LICENSE)

~12 KB gzip. Optionally uses `@dskripchenko/ui` for toolbar icons.

## Install

```bash
npm i @dskripchenko/wysiwyg
```

Optional (for nicer icons):

```bash
npm i @dskripchenko/ui lucide-vue-next
```

## Quick start

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'
import '@dskripchenko/wysiwyg/style.css'

const html = ref('<p>Hello <strong>world</strong>!</p>')
</script>

<template>
  <DskWysiwyg v-model="html" :resizable="true" />
</template>
```

## Features

- **Inline marks** — bold/italic/underline/strike/code, link, image, hr.
- **Block formats** — headings (h1-h6), blockquote, ul/ol, code-block.
- **Markdown shortcuts** — `# `, `## `, `- `, `1. `, `> `, ` ``` ` at
  the start of a block.
- **Slash commands** — type `/` to open a popup with heading/list/quote/
  code/hr/table commands.
- **Tables** — insert / addRow / addColumn / removeRow / removeColumn /
  removeTable.
- **Code syntax highlighting** — js/ts/tsx/jsx/php/html/css/json
  in `<pre><code class="language-X">` blocks.
- **HTML→Markdown** — `htmlToMarkdown(html)` helper.
- **Source mode** — toggle to raw HTML editor with beautify on view,
  minify on save, syntax highlighting overlay.
- **Sanitize** — DOMParser-based whitelist (own implementation).
- **Undo/Redo** — custom history stack with throttled commits.
- **Hotkeys** — ⌘B, ⌘I, ⌘U, ⌘Z, ⌘⇧Z.
- **Themes** — `data-theme="dark"` / `:root.dark` /
  `prefers-color-scheme: dark` aware.
- **Resizable** — user can resize the widget vertically (min/max via
  props).

## Documentation

- [Getting started](docs/en/getting-started.md)
- [Controller API](docs/en/controller-api.md) (chain-style API)
- [Extensions](docs/en/extensions.md) — markdown shortcuts, slash, tables, highlight
- [Customization](docs/en/customization.md) — toolbar, themes, sizing
- [Migration guide](docs/en/migration-guide.md)

## License

[MIT](LICENSE) © Denis Skripchenko
