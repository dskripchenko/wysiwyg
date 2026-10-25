---
title: Extensions
locale: en
status: stable
---

# Extensions

Built-in extensions are enabled by default. They don't require any
setup.

## Markdown shortcuts

Trigger at the start of a block (any of `<p>`, `<div>`, `<h1>`-`<h3>`,
`<blockquote>`, `<pre>`, `<li>`):

| Type | Becomes |
|---|---|
| `# ` | `<h1>` |
| `## ` | `<h2>` |
| `### ` | `<h3>` |
| `- ` or `* ` | `<ul><li>` |
| `1. ` | `<ol><li>` |
| `> ` | `<blockquote>` |
| ` ``` ` | `<pre><code>` |

The trigger sequence (e.g. `## `) is consumed.

## Slash commands

Type `/` at the start of a block — a popup appears with:

- `/h1`, `/h2`, `/h3` — heading
- `/list`, `/ul` — bulleted list
- `/ol` — numbered list
- `/quote` — blockquote
- `/code` — code block
- `/hr` — horizontal rule
- `/table` — insert table

A host adds its own items with the `slashCommands` prop; they are listed
after the built-in ones.

Filter by typing more characters (`/h2`). ↑/↓ navigate, Enter selects,
Esc cancels.

## Block previews (diagrams, charts)

A code block can show as what it draws. Pass a renderer per language:

```ts
import { render, DiagramError } from '@dskripchenko/diagrams'
import type { BlockRenderers, SlashCommand } from '@dskripchenko/wysiwyg'

const blockRenderers: BlockRenderers = {
  mermaid: (code) => {
    try {
      return { html: render(code).svg }
    } catch (e) {
      if (e instanceof DiagramError) return { error: e.message }
      throw e
    }
  },
}

const slashCommands: SlashCommand[] = [{
  key: 'diagram',
  label: 'Diagram',
  aliases: ['mermaid'],
  apply: (c) => c.chain().focus().insertCodeBlock('mermaid', 'flowchart LR\n  A --> B').run(),
}]
```

```vue
<DskWysiwyg v-model="html" :block-renderers="blockRenderers" :slash-commands="slashCommands" />
```

- A `<pre><code class="language-mermaid">` shows as its diagram; the code is hidden.
- A click on the diagram opens the code, with a live preview under it. Typing
  re-renders after a short pause. Escape, or moving the caret out, closes it.
- A renderer that answers `{ error }` leaves the code open with the message
  under it.
- Backspace over a shown diagram deletes it together with its code; undo
  brings both back.
- In readonly mode diagrams are shown and do not open.

The stored HTML never changes: `getHTML()`, the v-model, the history and
`htmlToMarkdown` see only the code block (` ```mermaid `). The preview is a
non-editable island the editor adds and drops.

A renderer has the contract of the kit's UidMarkdown `blockRenderers`:
`(code, { language, index }) => { html?, error? }` or a promise of it, so
one registry serves both. `html` is inserted as is, and the renderer answers
for its safety. The editor itself has no dependency on any diagram library.

### Live blocks (widgets)

A renderer can answer with `mount` instead of `html`. The island then holds
a live widget — a form, a request builder — that is the block's editor:

```ts
const blockRenderers: BlockRenderers = {
  api: () => ({
    mount: (el, { code, editable, setCode }) => {
      const widget = createWidget(el, { code, readonly: !editable, onChange: setCode })
      return { update: (next) => widget.setCode(next), destroy: () => widget.unmount() }
    },
  }),
}
```

- The code stays hidden and never opens: the widget edits it through
  `setCode(code)`, which the editor records as one history step and emits.
- Undo and redo change the code from outside: the widget gets it through
  `update(code)`; without `update` it is mounted again.
- Keys, typing, pasting and clicks inside the widget stay there — the editor
  does not treat them as its own.
- In readonly mode `editable` is `false` and `setCode` is ignored; switching
  the mode mounts the widgets again.
- `destroy` runs when the block is deleted, replaced by an undo, or the editor
  unmounts.

The contract (`BlockMountContext`, `BlockMountHandle`) is the kit's
UidMarkdown one, so a renderer registered once works in both.

## Code syntax highlighting

`<pre><code class="language-{lang}">` blocks are highlighted on blur.
Supported languages: `js`, `ts`, `tsx`, `jsx`, `php`, `html`, `css`,
`json`.

The highlighter is a token-based regex implementation (~5 KB). For
exotic languages, drop the `language-` class and the block stays as
plain code.

## Tables

`controller.insertTable(3, 4)` inserts a 3×4 table with `<thead>` /
`<tbody>` / `<th>` / `<td>`. Once inside a table, the toolbar shows
addRow / addColumn / remove buttons (or use the controller).

## HTML→Markdown

```ts
import { htmlToMarkdown } from '@dskripchenko/wysiwyg'

const md = htmlToMarkdown('<h1>Hi</h1><p><strong>bold</strong></p>')
// '# Hi\n\n**bold**\n'
```

Supports: p, h1-h3, strong/em/u/s, code, pre, ul/ol, blockquote, a,
img, hr, br. A code block keeps its language: ` ```mermaid `.

## Source mode

Toolbar's `[</>]` button toggles between WYSIWYG and a raw-HTML
editor (`<textarea>` with overlay-syntax-highlighting). On the way in
the HTML is **beautified** (newlines + 2-space indent between block
tags). On the way out — **minified** (whitespace between block tags
collapsed). Persisted form-state has the minified version.

## Public extension API

```ts
import { highlight } from '@dskripchenko/wysiwyg'

highlight('const x = 1', 'js')   // returns HTML string with <span class="dsk-tok-*">
```

## See also

- [Controller API](controller-api.md) — programmatic invocation
- [Customization](customization.md) — host-side customization
