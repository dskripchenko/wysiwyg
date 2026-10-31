# Migration Guide

## 0.2.x → 0.2.7 (resize-handle)

**Breaking** (nur CSS):
`min-height`/`max-height` wurden von `.dsk-wysiwyg__content` auf das
Root-Element `.dsk-wysiwyg` verschoben. Wenn Ihr Host-Projekt Größen über den
inneren Content-Selektor setzt, wechseln Sie auf das Root-Element oder
verwenden Sie die neuen CSS-Variablen (`--dsk-wysiwyg-min-height`,
`--dsk-wysiwyg-max-height`), die die alte API beibehalten.

## 0.2.0 → Patch-Serie 0.2.x (B1-B7, F1-F4)

Nicht breaking — Bugfixes und neue Toolbar-Funktionen (Source-Modus,
Beautify/Minify, Syntax-Highlighting-Overlay).

## 0.1.x → 0.2.0

**Bundle**: ~7 KB → ~12 KB gz (Markdown-Shortcuts, Slash-Menü, Tabellen,
Syntax-Highlighting hinzugekommen). Keine neuen Peer-Dependencies.

**Sanitize-Whitelist** erweitert: `table`/`thead`/`tbody`/`tr`/`th`/`td`,
`class`-Attribut auf `code`/`span` mit den Präfixen `language-` und
`dsk-tok-`.

**Ergänzungen der öffentlichen API**:
- `htmlToMarkdown(html)` — Konverter von HTML nach Markdown
- `highlight(code, language)` — Syntax-Highlighting (liefert HTML)
- `DskWysiwygSlashMenu` + Typ `SlashCommand` — für eigene
  Slash-Befehl-Erweiterungen

## 0.0.x → 0.1.0 (erste stabile Version)

Vorab-Releases. Alles vor 0.1.0 kann Breaking Changes enthalten.

## Siehe auch

- [`CHANGELOG.md`](../../CHANGELOG.md) — vollständige Historie
