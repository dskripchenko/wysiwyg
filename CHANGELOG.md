# Changelog

## 0.2.8 — 2026-07-28

### Changed
- Documentation: i18n coverage (English by default plus ru/de/zh). The widget
  code is unchanged.

## 0.2.7 — 2026-05-07

### Added
- **Resize handle on the root container** (`<DskWysiwyg>`). The user drags the
  marker in the bottom-right corner and the widget changes height. Min and max
  are set through the `minHeight` (default `'200px'`) and `maxHeight` (default
  `undefined` = unbounded) props. Controlled by the `resizable` prop (default
  `true`).
- In source mode the resize applies to the root container; the textarea/pre
  inside it flex-grow to fill the available space. In readonly mode resizing is
  disabled automatically.

### Breaking
- CSS `min-height`/`max-height` moved from `.dsk-wysiwyg__content` to the root
  `.dsk-wysiwyg`. If the host set the height directly through the
  `.dsk-wysiwyg__content { min-height: ... }` selector, it now has to target
  `.dsk-wysiwyg`. Through the `--dsk-wysiwyg-min-height` /
  `--dsk-wysiwyg-max-height` CSS variables everything works as before.

## 0.2.6 — 2026-05-07

### Added
- **Dark theme support through `data-theme="dark"` / `class="dark"`** on a
  parent element (or `:root`). The editor used to react only to
  `@media (prefers-color-scheme: dark)` and stayed light when the host drives
  the theme from a UI toggle (as laravel-admin does). Now these all work:
  - `[data-theme='dark']` / `:root[data-theme='dark']` (the @dskripchenko/ui
    and laravel-admin convention)
  - `:root.dark` / `[data-theme='dark']` (Tailwind-like conventions)
  - `@media (prefers-color-scheme: dark)` (OS level, through `:where()` so it
    does not beat the host's light override)
  - `[data-theme='light']` forces the light palette back even under an OS dark
    theme.
  - `class="dsk-wysiwyg--dark-theme"` can also be put on the editor itself.
- **Syntax-token colours unified through CSS variables**:
  `--dsk-wysiwyg-tok-{keyword,string,comment,number,tag,attr,function,punct}`.
  The editor and the source overlay used to carry different hard-coded
  palettes; both now follow one theme and the host can override any of the
  eight colours.

## 0.2.5 — 2026-05-07

### Added
- **Syntax highlighting in the source view** (overlay pattern): a `<pre>` with
  highlighted HTML is rendered behind a textarea with transparent text.
  Scrolling is synchronized. Uses the existing `highlight(html, 'html')`. The
  palette is VS-style for a light background: tags (#2563eb), attributes
  (#b45309), strings (#16a34a), comments in italic grey.

## 0.2.4 — 2026-05-07

### Added
- **Beautify in the source view**: switching to source mode formats the HTML
  (newline + 2-space indent between block tags, inline tags stay on one line).
  The contents of `<pre>`/`<code>`/`<script>`/`<style>` are preserved as is.
- **Minify on return/save**: toggling back to WYSIWYG (or emitting v-model live
  from source) passes the HTML through `minifyHtml` — whitespace between block
  tags is dropped and compact HTML reaches the database.
- Public API: `beautifyHtml(html)` and `minifyHtml(html)` are exported.

## 0.2.3 — 2026-05-07

### Added
- **Source-mode toggle** — the `source` toolbar button (FileCode icon)
  switches the editor between WYSIWYG and a raw-HTML editor (a monospace
  textarea). On the way back the HTML passes through `sanitizeHtml()` plus a
  history snapshot. Useful for editing markup directly. Added to the end of the
  default toolbar after undo/redo.

## 0.2.2 — 2026-05-07

### Fixed
- **B5a:** a double Enter in an empty `<li>` now leaves the `<ul>`/`<ol>`
  correctly — it creates a `<p>` right after the list. Chrome would not leave
  the list in our contenteditable context, and the empty `li` stayed behind.
- **B5b:** slash commands (heading/paragraph/blockquote/codeBlock) inside an
  `<li>` now cut the item out of the list, turning it into the requested block
  AFTER the list. If the item was in the middle, the list is split in two.
  Previously the result was `<ul><h2>…</h2></ul>` (invalid HTML).
- **B6:** `getHTML()` now strips zero-width spaces (U+200B) from the output.
  ZWSP is still used in the DOM as a caret target for empty marks and exit
  cursors, but clean HTML goes to the database and to v-model.
- **Bonus:** `setContent()` guarantees at least one `<p><br></p>` block in an
  empty editor. Without it markdown shortcuts (`# `, `- `, …) did not fire on
  the first input in a fresh editor — there was no block ancestor.

### Tests
- 14/14 (was 12) — added checks for `vacuumZwsp` and `setBlockTag` on `li`.

## 0.2.1 — 2026-05-07

### Fixed (after a real-browser smoke run in demo)
- **⌘B/I/U on a collapsed selection** no longer produce a nested
  `<strong><strong>…</strong></strong>` on a repeated press. If the caret is
  already inside an active mark, the toggle now leaves it through a ZWSP text
  node placed after the ancestor.
- **Markdown shortcuts** (`# `, `## `, `- `, `1. `, `> `, ``` `) work in
  Chrome. `markdownShortcuts.blockAncestor` now recognizes `<div>` blocks
  (Chrome's contenteditable creates divs by default).
- **Enter** is handled by our own `handleEnter` in `DskWysiwyg.vue` — a split
  into a new `<p>` without cloning the active inline marks.
  `defaultParagraphSeparator=p` is set on mount as a fallback.
- **The /h2 slash-menu filter** works (fixed as a side effect of the Enter and
  bold fixes; it had been broken by an inherited `<strong>` wrapper).

### Known limitations
- Inside `<ul>/<ol>` a double Enter does not leave the list (Chrome's default
  does not fire in our context). Workaround: place the cursor after the list
  manually. To be resolved in 0.2.2 (B5).
- After a bold toggle zero-width spaces remain in the HTML — invisible, but
  they litter it. To be resolved in 0.2.2 (B6).

## 0.2.0 — 2026-05-02

### Added
- Markdown shortcuts: `# `, `## `, `### `, `- `, `* `, `1. `, `> `, ` ``` ` at
  the start of a block are converted into a heading/list/quote/code block.
- `htmlToMarkdown(html)` — an HTML→MD converter (p, h1-h3, strong/em/u/s, code,
  pre, ul/ol, blockquote, a, img, hr, br).
- Code syntax highlighting: on blur, `<pre><code class="language-X">` blocks
  are highlighted automatically. A token-based regex highlighter; languages:
  js/ts/tsx/jsx/php/html/css/json. Exported as `highlight(code, language)`.
- Tables: insertion and editing through
  `controller.chain().insertTable(rows, cols).run()` plus
  addRow/addColumn/removeRow/removeColumn/removeTable. The `table` toolbar
  button inserts a table or adds a row after the current one depending on
  context.
- Slash-command popup: typing `/` at the start of a block opens a menu with
  heading/list/quote/code/hr/table commands. Arrow/Enter/Esc navigation and a
  query filter.
- Public API: `DskWysiwygSlashMenu` plus the `SlashCommand` type.

### Changed
- The sanitize whitelist is extended:
  `table`/`thead`/`tbody`/`tr`/`th`/`td` plus the `class` attribute on
  `code`/`span` with the `language-` and `dsk-tok-` prefixes.
- Bundle size: ~7 KB → ~12 KB gzip (including all four new extensions, still
  with no peer dependencies).

## 0.1.0 — 2026-05-02

First release. A Vue 3 WYSIWYG on top of contenteditable and the Selection API.
Zero editor dependencies. Inline marks (bold/italic/underline/strike/code),
block formats (h1-h3/p/quote/codeblock), lists (ul/ol), link/image/hr,
sanitize, undo/redo, paste cleanup, hotkeys (⌘B/I/U/Z) and a toolbar with
@dskripchenko/ui icons.
