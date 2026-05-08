# @dskripchenko/wysiwyg

> 🌐 [English](README.md) · **Русский** · [Deutsch](README.de.md) · [中文](README.zh.md)

Полноценный Vue 3 WYSIWYG-редактор без сторонних editor-движков
(не Tiptap, не ProseMirror, не Quill, не Slate). Собственная реализация
поверх contenteditable + Selection/Range API.

**Zero peer-dependencies** на editor-libs. Опционально использует
`@dskripchenko/ui` для иконок toolbar'а — без ui-kit'а fallback'ит на
текстовые символы.

## Установка

```bash
npm install @dskripchenko/wysiwyg
```

Опционально (для иконок):

```bash
npm install @dskripchenko/ui lucide-vue-next
```

## Использование

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'
import '@dskripchenko/wysiwyg/style.css'

const html = ref('<p>Привет</p>')
</script>

<template>
  <DskWysiwyg v-model="html" placeholder="Начните писать…" />
</template>
```

## Props

| Prop | Type | Default | Описание |
|---|---|---|---|
| `modelValue` | `string` | `''` | HTML-content (v-model). |
| `placeholder` | `string` | `'Введите текст…'` | Подсказка. |
| `toolbar` | `boolean` | `true` | Показать toolbar. |
| `toolbarItems` | `ToolbarItem[]` | весь набор | Кастомный список. |
| `readonly` | `boolean` | `false` | Read-only режим. |
| `minHeight` | `string` | `'200px'` | Min-height area. |
| `maxHeight` | `string` | — | Max-height (overflow-y auto). |

## Events

- `@update:modelValue` — emit при каждом edit'е (HTML).
- `@image-request` — host подключает upload-flow → зовёт
  `controller.chain().focus().setImage(url).run()`.
- `@link-request` — host открывает modal для редактирования URL.
- `@ready` — emit после mount; передаёт готовый `EditorController`.

## Toolbar items

```ts
type ToolbarItem =
  | 'bold' | 'italic' | 'underline' | 'strike' | 'code'
  | 'h1' | 'h2' | 'h3' | 'paragraph'
  | 'bullet-list' | 'ordered-list'
  | 'blockquote' | 'code-block'
  | 'link' | 'image'
  | 'horizontal-rule'
  | 'undo' | 'redo'
  | '|'
```

Минималистичный пример:

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', '|', 'h1', 'h2', '|', 'undo', 'redo']"
/>
```

## Программные команды

```vue
<script setup>
import { ref } from 'vue'

const wysiwyg = ref(null)

function makeBold() {
  wysiwyg.value?.controller?.chain().focus().bold().run()
}
</script>

<template>
  <DskWysiwyg ref="wysiwyg" v-model="html" />
  <button @click="makeBold">Bold</button>
</template>
```

API `chain()` (намеренно похож на Tiptap для лёгкой миграции):

| Method | Effect |
|---|---|
| `.bold()` / `.italic()` / `.underline()` / `.strike()` / `.code()` | toggle inline-mark |
| `.heading(1\|2\|3)` / `.paragraph()` | block-level format |
| `.bulletList()` / `.orderedList()` | toggle list |
| `.blockquote()` / `.codeBlock()` | toggle block |
| `.setLink(url \| null)` | wrap selection в `<a>` / unwrap |
| `.setImage(src, alt?)` | вставить `<img>` |
| `.horizontalRule()` | вставить `<hr>` |
| `.undo()` / `.redo()` | history |
| `.focus()` | focus editor |
| `.run()` | finalize chain (commit history snapshot) |

Запросы:

```ts
controller.isActive('bold')                  // boolean
controller.isActive('heading', { level: 2 }) // boolean
controller.canUndo() / .canRedo()            // boolean
controller.getHTML()                         // string
controller.isEmpty()                         // boolean
controller.setContent(html)                  // sanitize + reset history
```

## Image upload

```vue
<script setup>
async function onImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const url = await uploadToCdn(file)
    wysiwyg.value?.controller?.chain().focus().setImage(url, file.name).run()
  }
  input.click()
}
</script>

<template>
  <DskWysiwyg ref="wysiwyg" v-model="html" @image-request="onImage" />
</template>
```

## Sanitize

При `setContent()` и paste HTML проходит через `sanitizeHtml`:
удаляются `<script>` / `<iframe>` / `<style>`, inline-style/class/id/data-*
атрибуты, `javascript:` URLs. Whitelist: `p`, `h1-h3`, `strong`, `em`,
`u`, `s`, `code`, `pre`, `ul`, `ol`, `li`, `blockquote`, `a`, `img`,
`br`, `hr`, `span`. Paste из Word/Google Docs автоматически
нормализуется.

```ts
import { sanitizeHtml } from '@dskripchenko/wysiwyg'

const safe = sanitizeHtml(unsafeUserInput)
```

## Темизация

Все цвета — CSS-переменные:

```css
.dsk-wysiwyg {
  --dsk-wysiwyg-bg: #ffffff;
  --dsk-wysiwyg-fg: #1f2937;
  --dsk-wysiwyg-border: #e5e7eb;
  --dsk-wysiwyg-border-focus: #2dd4bf;
  --dsk-wysiwyg-toolbar-bg: #f9fafb;
  --dsk-wysiwyg-btn-active-bg: rgba(45, 212, 191, 0.16);
  --dsk-wysiwyg-btn-active-fg: #0d9488;
  --dsk-wysiwyg-link-color: #2563eb;
  --dsk-wysiwyg-code-bg: #f3f4f6;
  /* … см. src/style.css */
}
```

Dark-вариант через `@media (prefers-color-scheme: dark)` встроен.

## Markdown shortcuts

В начале блока автоматически срабатывают:

| Ввод | Результат |
|---|---|
| `# ` / `## ` / `### ` | Heading 1/2/3 |
| `- ` или `* ` | Bullet list |
| `1. ` | Ordered list |
| `> ` | Blockquote |
| ` ``` ` (3 backticks + space) | Code block |

## Slash-commands

Введите `/` в начале блока — откроется popup со списком команд
(headings, lists, quote, code-block, hr, table). Стрелки/Enter/Esc
для навигации. Query-фильтр после `/` (например `/h2`, `/list`).

## HTML → Markdown

```ts
import { htmlToMarkdown } from '@dskripchenko/wysiwyg'

const md = htmlToMarkdown('<h1>Hello</h1><p><strong>World</strong></p>')
// → "# Hello\n\n**World**"
```

Поддержка: p, h1-h3, strong/b, em/i, u, s, code, pre, ul/ol/li,
blockquote, a, img, hr, br.

## Code syntax highlighting

`<pre><code class="language-js">…</code></pre>` блоки автоматически
подсвечиваются на blur'е. Поддержка: `js`, `ts`, `tsx`, `jsx`, `php`,
`html`, `css`, `json`. Token-based regex (без AST), ~1 KB gzip.

```ts
import { highlight } from '@dskripchenko/wysiwyg'

const html = highlight('const x = 42', 'js')
// → '<span class="dsk-tok-keyword">const</span> x = <span class="dsk-tok-number">42</span>'
```

## Tables

Toolbar-кнопка `table` вставляет 3×3 таблицу. Когда курсор внутри
таблицы — повторное нажатие добавляет строку снизу. Программные
команды:

```ts
controller.chain().insertTable(rows, cols).run()
controller.chain().addRowAfter().run()
controller.chain().addRowBefore().run()
controller.chain().addColumnAfter().run()
controller.chain().addColumnBefore().run()
controller.chain().removeRow().run()
controller.chain().removeColumn().run()
controller.chain().removeTable().run()
```

## Архитектура

```
src/
├── engine/
│   ├── selection.ts        — Selection/Range helpers + saveRange/restoreRange
│   ├── commands.ts         — toggleInlineMark / setBlockTag / toggleList / setLink / …
│   ├── history.ts          — undo/redo stack (snapshot innerHTML, throttle)
│   ├── sanitize.ts         — DOMParser-based sanitize
│   ├── markdownShortcuts.ts — `# `, `- `, `1. `, `> `, ` ``` ` → block-format
│   ├── htmlToMarkdown.ts   — HTML → MD конвертер
│   ├── highlight.ts        — token-regex syntax highlighter
│   ├── table.ts            — table insert/edit команды
│   └── index.ts            — EditorController + chain() API
├── DskWysiwyg.vue          — root (contenteditable + paste/keydown)
├── DskWysiwygToolbar.vue   — toolbar (lazy-loaded UidIcon из ui-kit'а)
├── DskWysiwygSlashMenu.vue — slash-commands popup
└── style.css               — CSS-переменные
```

Размер бандла: ~12 KB gzip ESM, без peer-deps.

## Browser support

ES2022 + современные Selection/Range API. Тестировано в Chrome 120+,
Firefox 120+, Safari 17+.

## License

MIT © Denis Skripchenko
