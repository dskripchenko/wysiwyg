# 控制器 API

`<DskWysiwyg>` 通过模板引用（template ref）暴露一个控制器（controller）。该控制器
提供类似 Tiptap `editor.chain()` 的链式 API。

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

## 链式方法

| 方法 | 作用 |
|---|---|
| `focus()` | 让编辑器获得焦点。 |
| `bold()` / `italic()` / `underline()` / `strike()` / `code()` | 切换行内标记。 |
| `heading(level: 1..6)` | 将当前块设为 `<h{level}>`。 |
| `paragraph()` | 将当前块设为 `<p>`。 |
| `bulletList()` / `orderedList()` | 用 `<ul>`/`<ol>` 包裹当前块。 |
| `blockquote()` | 将当前块设为 `<blockquote>`。 |
| `codeBlock()` | 将当前块设为 `<pre>`。 |
| `insertCodeBlock(language: string, code?: string)` | 插入 `<pre><code class="language-X">code</code></pre>`（空的当前段落会被替换），光标置于代码末尾。 |
| `link(href: string, target?: '_blank')` | 用 `<a href>` 包裹选区。 |
| `unlink()` | 移除选区周围的 `<a>`。 |
| `image(src: string, alt?: string)` | 插入 `<img>`。 |
| `hr()` | 插入水平分隔线。 |
| `insertText(text: string)` | 插入纯文本。 |
| `insertHTML(html: string)` | 插入经过清洗（sanitize）的 HTML。 |
| `undo()` / `redo()` | 在历史记录中导航。 |
| `clear()` | 重置为空的 `<p><br></p>`。 |
| `setContent(html: string)` | 替换内容。 |
| `getHTML()` | 返回当前经过清洗的 HTML（同时去除 ZWSP 标记）。 |

### 表格

| 方法 | |
|---|---|
| `insertTable(rows: number, cols: number)` | |
| `addRow()` / `addRowAfter()` / `addRowBefore()` | |
| `addColumn()` / `addColumnAfter()` / `addColumnBefore()` | |
| `removeRow()` / `removeColumn()` / `removeTable()` | |

### 源代码模式

| 方法 | |
|---|---|
| `toggleSource()` | 在 WYSIWYG 和原始 HTML 编辑器之间切换。 |
| `isSource()` | 布尔值。 |

## 不使用链式调用的命令式用法

```js
const c = editorRef.value.controller
c.focus()
c.bold()
c.insertText('Bold')
```

每个方法都会提交一个历史快照（带节流）。如果需要批量执行多个操作而不产生中间快照，
请将它们包裹在 `controller.batch(() => { ... })` 中。

## 事件

组件在每次提交后发出 `@update:modelValue`。可在父组件中监听，用于失焦时保存等场景。

## 另请参阅

- [扩展](extensions.md) — 已内置的功能
- [自定义](customization.md) — 注册你自己的命令
