# Changelog

## 0.2.0 — 2026-05-02

### Added
- Markdown shortcuts: `# `, `## `, `### `, `- `, `* `, `1. `, `> `, ` ``` ` в начале блока автоматически конвертируются в heading/list/quote/codeblock.
- `htmlToMarkdown(html)` — HTML→MD конвертер (p, h1-h3, strong/em/u/s, code, pre, ul/ol, blockquote, a, img, hr, br).
- Code syntax highlighting: при blur'е блоки `<pre><code class="language-X">` автоматически подсвечиваются. Token-based regex highlighter, языки: js/ts/tsx/jsx/php/html/css/json. Экспортируется как `highlight(code, language)`.
- Tables: вставка/редактирование таблиц через `controller.chain().insertTable(rows, cols).run()` + addRow/addColumn/removeRow/removeColumn/removeTable. Toolbar-кнопка `table` (insert или addRowAfter в зависимости от контекста).
- Slash-commands popup: ввод `/` в начале блока открывает меню с heading/list/quote/code/hr/table командами. Стрелки/Enter/Esc навигация, query-фильтр.
- Public API: `DskWysiwygSlashMenu` + `SlashCommand` тип.

### Changed
- Sanitize whitelist расширен: `table`/`thead`/`tbody`/`tr`/`th`/`td` + class-атрибут на `code`/`span` с префиксами `language-` и `dsk-tok-`.
- Bundle size: ~7 KB → ~12 KB gzip (включая все 4 новых extension'а, остаётся без peer-deps).

## 0.1.0 — 2026-05-02

Первый релиз. Vue 3 WYSIWYG поверх contenteditable + Selection API.
Zero editor-deps. Inline marks (bold/italic/underline/strike/code),
block formats (h1-h3/p/quote/codeblock), lists (ul/ol), link/image/hr,
sanitize, undo/redo, paste cleanup, hotkeys (⌘B/I/U/Z), toolbar с
@dskripchenko/ui иконками.
