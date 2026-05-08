---
title: Controller API
locale: en
status: stable
---

# Controller API

`<DskWysiwyg>` exposes a controller via template ref. The controller
provides a chain-style API similar to Tiptap's `editor.chain()`.

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'

const editorRef = ref(null)
const html = ref('')

function insertGreeting() {
  editorRef.value?.controller.chain()
    .focus()
    .heading(2)
    .insertText('Hello!')
    .paragraph()
    .insertText('Welcome.')
    .run()
}
</script>

<template>
  <DskWysiwyg ref="editorRef" v-model="html" />
  <button @click="insertGreeting">Insert greeting</button>
</template>
```

## Chain methods

| Method | Effect |
|---|---|
| `focus()` | Focus the editor. |
| `bold()` / `italic()` / `underline()` / `strike()` / `code()` | Toggle inline mark. |
| `heading(level: 1..6)` | Set current block to `<h{level}>`. |
| `paragraph()` | Set current block to `<p>`. |
| `bulletList()` / `orderedList()` | Wrap current block in `<ul>`/`<ol>`. |
| `blockquote()` | Set current block to `<blockquote>`. |
| `codeBlock(lang?: string)` | Set current block to `<pre><code class="language-X">`. |
| `link(href: string, target?: '_blank')` | Wrap selection in `<a href>`. |
| `unlink()` | Remove `<a>` around selection. |
| `image(src: string, alt?: string)` | Insert `<img>`. |
| `hr()` | Insert horizontal rule. |
| `insertText(text: string)` | Plain text insert. |
| `insertHTML(html: string)` | Sanitized HTML insert. |
| `undo()` / `redo()` | History navigation. |
| `clear()` | Reset to empty `<p><br></p>`. |
| `setContent(html: string)` | Replace content. |
| `getHTML()` | Return current sanitized HTML (also stripped of ZWSP markers). |

### Tables

| Method | |
|---|---|
| `insertTable(rows: number, cols: number)` | |
| `addRow()` / `addRowAfter()` / `addRowBefore()` | |
| `addColumn()` / `addColumnAfter()` / `addColumnBefore()` | |
| `removeRow()` / `removeColumn()` / `removeTable()` | |

### Source mode

| Method | |
|---|---|
| `toggleSource()` | Switch between WYSIWYG and raw HTML editor. |
| `isSource()` | Boolean. |

## Imperative usage without chain

```js
const c = editorRef.value.controller
c.focus()
c.bold()
c.insertText('Bold')
```

Each method commits a history snapshot (throttled). If you need to
batch many ops without intermediate snapshots, wrap them in
`controller.batch(() => { ... })`.

## Events

The component emits `@update:modelValue` after every commit. Listen at
the parent for save-on-blur etc.

## See also

- [Extensions](extensions.md) — what's already wired
- [Customization](customization.md) — register your own commands
