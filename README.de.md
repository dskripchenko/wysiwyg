# @dskripchenko/wysiwyg

> 🌐 [English](README.md) · [Русский](README.ru.md) · **Deutsch** · [中文](README.zh.md)

Ein vollständiger Vue 3 WYSIWYG-Editor mit **null Peer-Dependencies auf
Editor-Bibliotheken** — kein Tiptap, kein ProseMirror, kein Quill,
kein Slate. Aufgebaut auf `contenteditable` + Selection/Range API.

[![npm](https://img.shields.io/npm/v/@dskripchenko/wysiwyg)](https://www.npmjs.com/package/@dskripchenko/wysiwyg)
[![License](https://img.shields.io/npm/l/@dskripchenko/wysiwyg)](LICENSE)

~12 KB gzip. Verwendet optional `@dskripchenko/ui` für Toolbar-Icons.

## Installation

```bash
npm i @dskripchenko/wysiwyg
```

Optional (für schönere Icons):

```bash
npm i @dskripchenko/ui lucide-vue-next
```

## Schnellstart

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'
import '@dskripchenko/wysiwyg/style.css'

const html = ref('<p>Hallo <strong>Welt</strong>!</p>')
</script>

<template>
  <DskWysiwyg v-model="html" :resizable="true" />
</template>
```

## Funktionen

- **Inline-Marks** — bold/italic/underline/strike/code, Link, Bild, hr.
- **Block-Formate** — Überschriften (h1-h6), Blockquote, ul/ol,
  Code-Block.
- **Markdown-Shortcuts** — `# `, `## `, `- `, `1. `, `> `, ` ``` ` am
  Anfang eines Blocks.
- **Slash-Befehle** — geben Sie `/` ein, um ein Popup mit Heading/List/
  Quote/Code/Hr/Table-Befehlen zu öffnen.
- **Tabellen** — insert / addRow / addColumn / removeRow / removeColumn
  / removeTable.
- **Syntax-Highlighting** — js/ts/tsx/jsx/php/html/css/json in
  `<pre><code class="language-X">`-Blöcken.
- **HTML→Markdown** — `htmlToMarkdown(html)`-Helper.
- **Source-Modus** — Umschalten auf Raw-HTML-Editor mit Beautify auf
  Anzeige, Minify auf Speichern, Syntax-Highlighting-Overlay.
- **Sanitize** — DOMParser-basierte Whitelist (eigene Implementierung).
- **Undo/Redo** — Custom-History-Stack.
- **Hotkeys** — ⌘B, ⌘I, ⌘U, ⌘Z, ⌘⇧Z.
- **Themes** — `data-theme="dark"` / `:root.dark` /
  `prefers-color-scheme: dark`-aware.
- **Resizable** — Benutzer kann das Widget vertikal in der Größe
  ändern (min/max über Props).

## Dokumentation

- [Erste Schritte](docs/en/getting-started.md) (en)
- [Controller-API](docs/en/controller-api.md) (en)
- [Erweiterungen](docs/en/extensions.md) (en)
- [Anpassung](docs/en/customization.md) (en)
- [Migration Guide](docs/en/migration-guide.md) (en)

## Lizenz

[MIT](LICENSE) © Denis Skripchenko
