---
title: Migration Guide
locale: en
status: stable
---

# Migration Guide

## 0.2.x → 0.2.7 (resize-handle)

**Breaking** (CSS-only):
`min-height`/`max-height` moved from `.dsk-wysiwyg__content` to the
root `.dsk-wysiwyg`. If your host project sets sizes via the inner
content selector, switch to the root or use the new CSS variables
(`--dsk-wysiwyg-min-height`, `--dsk-wysiwyg-max-height`) which keep
the old API.

## 0.2.0 → 0.2.x patch series (B1-B7, F1-F4)

Non-breaking — bug fixes and new toolbar features (source mode,
beautify/minify, syntax highlighting overlay).

## 0.1.x → 0.2.0

**Bundle**: ~7 KB → ~12 KB gz (markdown shortcuts, slash menu, tables,
syntax highlighting added). No new peer-deps.

**Sanitize whitelist** extended: `table`/`thead`/`tbody`/`tr`/`th`/`td`,
`class` attribute on `code`/`span` with `language-` and `dsk-tok-`
prefixes.

**Public API additions**:
- `htmlToMarkdown(html)` — HTML to Markdown converter
- `highlight(code, language)` — syntax highlighting (returns HTML)
- `DskWysiwygSlashMenu` + `SlashCommand` type — for custom slash
  command extensions

## 0.0.x → 0.1.0 (first stable)

Pre-stable releases. Anything before 0.1.0 may have breaking changes.

## See also

- [`CHANGELOG.md`](../../CHANGELOG.md) — full history
