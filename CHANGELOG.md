# Changelog

## 0.2.5 — 2026-05-07

### Added
- **Syntax highlighting в source-view** (overlay pattern): `<pre>` с подсвеченным HTML рендерится позади textarea с прозрачным текстом. Синхронный scroll. Использует существующий `highlight(html, 'html')`. Палитра — VS-style для светлого фона: теги (#2563eb), атрибуты (#b45309), строки (#16a34a), комментарии italic gray.

## 0.2.4 — 2026-05-07

### Added
- **Beautify в source-view**: при переключении в source-mode HTML форматируется (\n + 2-space indent между блочными тегами, inline-теги остаются на одной строке). Содержимое `<pre>`/`<code>`/`<script>`/`<style>` сохраняется как есть.
- **Minify при возврате/save**: при toggle обратно в WYSIWYG (или live-эмите v-model из source) HTML проходит через `minifyHtml` — убирает whitespace между блочными тегами, в БД попадает компактный HTML.
- Public API: `beautifyHtml(html)` и `minifyHtml(html)` экспортируются.

## 0.2.3 — 2026-05-07

### Added
- **Source-mode toggle** — toolbar-кнопка `source` (иконка FileCode) переключает редактор между WYSIWYG и raw-HTML editor (textarea с monospace). При возврате обратно HTML проходит через `sanitizeHtml()` + history-snapshot. Полезно для прямой правки разметки. По умолчанию добавлена в конец default-toolbar после undo/redo.

## 0.2.2 — 2026-05-07

### Fixed
- **B5a:** двойной Enter в пустом `<li>` теперь корректно выходит из `<ul>`/`<ol>` — создаёт `<p>` сразу после списка. Раньше Chrome не выходил из списка в нашем contenteditable-контексте, и пустой li оставался жить.
- **B5b:** slash-команды (heading/paragraph/blockquote/codeBlock) внутри `<li>` теперь "вырезают" пункт из списка, превращая в нужный блок ПОСЛЕ списка. Если списочный пункт был серединным — список разрезается на два. Раньше получалось `<ul><h2>…</h2></ul>` (невалидный HTML).
- **B6:** `getHTML()` теперь удаляет zero-width spaces (U+200B) из выходного HTML. ZWSP всё ещё используется в DOM как caret-target для пустых mark'ов и exit-cursor'ов, но в БД/v-model улетает чистый HTML.
- **Bonus:** `setContent()` гарантирует наличие хотя бы одного `<p><br></p>` блока на пустом editor'е. Без этого markdown-shortcuts (`# `, `- `, …) не срабатывали при первом вводе в свежем редакторе — не было block-ancestor'а.

### Tests
- 14/14 (было 12) — добавлены проверки на vacuumZwsp и setBlockTag-on-li.

## 0.2.1 — 2026-05-07

### Fixed (после real-browser smoke в demo)
- **⌘B/I/U на collapsed selection** больше не создают вложенный `<strong><strong>…</strong></strong>` при повторном нажатии. Теперь, если caret уже внутри active-mark, toggle "выходит" из неё через ZWSP-text-node после ancestor'а.
- **Markdown shortcuts** (`# `, `## `, `- `, `1. `, `> `, ``` `) работают в Chrome. `markdownShortcuts.blockAncestor` теперь распознаёт `<div>`-блоки (Chrome contenteditable создаёт div'ы по умолчанию).
- **Enter** обрабатывается собственным `handleEnter` в `DskWysiwyg.vue` — split в новый `<p>` без клонирования active inline-marks. `defaultParagraphSeparator=p` устанавливается при mount как fallback.
- **Slash-menu /h2 фильтр** работает (исправилось как side-effect Enter+bold-fix'ов; ранее был сломан из-за наследуемого `<strong>` wrapper'а).

### Known limitations
- Внутри `<ul>/<ol>` двойной Enter не выходит из списка (Chrome default не срабатывает в нашем контексте). Workaround: ставьте курсор за списком вручную. Решится в 0.2.2 (B5).
- После bold-toggle в HTML остаются zero-width spaces (`​`) — невидимы, но мусорят. Решится в 0.2.2 (B6).

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
