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

Filter by typing more characters (`/h2`). ↑/↓ navigate, Enter selects,
Esc cancels.

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
img, hr, br.

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
