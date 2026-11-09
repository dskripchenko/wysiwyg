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
| `taskList()` | Make the current list a task list (`- [ ]`), or plain again; outside a list, start one. A click on an item's box ticks it. |
| `blockquote()` | Set current block to `<blockquote>`. |
| `codeBlock()` | Set current block to `<pre>`. |
| `insertCodeBlock(language: string, code?: string)` | Insert `<pre><code class="language-X">code</code></pre>` (an empty current paragraph is replaced), caret at the end of the code. |
| `insertMath(tex: string, block?: boolean)` | Insert a TeX formula: on a line of its own (`block`; an empty current paragraph is replaced) or in the text at the caret. It is an island drawn as MathML by `@dskripchenko/math`; a double click edits its TeX (`labels.mathPrompt`). |
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

## Content, caret and blocks

| Method | |
|---|---|
| `patchContent(html: string)` | Bring the content to `html` (sanitized) by replacing only the top-level nodes that differ; the common leading and trailing ones stay the same DOM nodes, so a selection in them stays put, and a selection in a replaced block is put back by block index and offset. Clears the undo/redo stacks (the history is rebased on the result). Returns `false` when nothing changed. The editor uses it for a `modelValue` that changed outside. |
| `caretPosition()` | `{ block, offset } \| null` — the top-level block the selection starts in and the character offset in its text. |
| `moveBlock(from: number, to: number)` | Move a top-level block (with its preview) to index `to`. One history step. |
| `duplicateBlock(index: number)` | A copy of the block right after it, without its block id. One history step. |
| `removeBlock(index: number)` | Delete the block; the last one is emptied instead. One history step. |

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
