# Controller API

`<DskWysiwyg>` отдаёт контроллер через template ref. Контроллер
предоставляет API цепочек, похожий на `editor.chain()` из Tiptap.

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

## Методы цепочки

| Method | Effect |
|---|---|
| `focus()` | Ставит фокус в редактор. |
| `bold()` / `italic()` / `underline()` / `strike()` / `code()` | Переключает inline-разметку. |
| `heading(level: 1..6)` | Превращает текущий блок в `<h{level}>`. |
| `paragraph()` | Превращает текущий блок в `<p>`. |
| `bulletList()` / `orderedList()` | Оборачивает текущий блок в `<ul>`/`<ol>`. |
| `blockquote()` | Превращает текущий блок в `<blockquote>`. |
| `codeBlock()` | Превращает текущий блок в `<pre>`. |
| `insertCodeBlock(language: string, code?: string)` | Вставляет `<pre><code class="language-X">code</code></pre>` (пустой текущий абзац заменяется), курсор — в конце кода. |
| `link(href: string, target?: '_blank')` | Оборачивает выделение в `<a href>`. |
| `unlink()` | Снимает `<a>` вокруг выделения. |
| `image(src: string, alt?: string)` | Вставляет `<img>`. |
| `hr()` | Вставляет горизонтальную линию. |
| `insertText(text: string)` | Вставка простого текста. |
| `insertHTML(html: string)` | Вставка санитизированного HTML. |
| `undo()` / `redo()` | Навигация по истории. |
| `clear()` | Сбрасывает содержимое до пустого `<p><br></p>`. |
| `setContent(html: string)` | Заменяет содержимое. |
| `getHTML()` | Возвращает текущий санитизированный HTML (заодно очищенный от маркеров ZWSP). |

### Таблицы

| Method | |
|---|---|
| `insertTable(rows: number, cols: number)` | |
| `addRow()` / `addRowAfter()` / `addRowBefore()` | |
| `addColumn()` / `addColumnAfter()` / `addColumnBefore()` | |
| `removeRow()` / `removeColumn()` / `removeTable()` | |

### Режим исходного кода

| Method | |
|---|---|
| `toggleSource()` | Переключает между WYSIWYG и редактором сырого HTML. |
| `isSource()` | Boolean. |

## Императивный вызов без цепочки

```js
const c = editorRef.value.controller
c.focus()
c.bold()
c.insertText('Bold')
```

Каждый метод фиксирует снимок истории (с троттлингом). Если нужно
выполнить много операций без промежуточных снимков, оберните их в
`controller.batch(() => { ... })`.

## События

Компонент эмитит `@update:modelValue` после каждой фиксации. Слушайте
его в родителе — например, чтобы сохранять по blur.

## См. также

- [Расширения](extensions.md) — что уже подключено
- [Кастомизация](customization.md) — регистрация своих команд
