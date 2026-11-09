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
| `taskList()` | 把当前列表变为任务列表（`- [ ]`）或恢复为普通列表；不在列表中时新建一个。点击条目的复选框即可勾选。 |
| `blockquote()` | 将当前块设为 `<blockquote>`。 |
| `codeBlock()` | 将当前块设为 `<pre>`。 |
| `insertCodeBlock(language: string, code?: string)` | 插入 `<pre><code class="language-X">code</code></pre>`（空的当前段落会被替换），光标置于代码末尾。 |
| `insertMath(tex: string, block?: boolean)` | 插入 TeX 公式：独占一行（`block`；空的当前段落会被替换），或插入到光标处的文本中。公式是由 `@dskripchenko/math` 绘制为 MathML 的独立块；双击可编辑其 TeX（`labels.mathPrompt`）。 |
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

## 内容、光标与块

| 方法 | |
|---|---|
| `patchContent(html: string)` | 将内容更新为 `html`（经过清理），只替换不同的顶层节点；开头和结尾共有的节点保持为同一批 DOM 节点，因此其中的选区保持不动，位于被替换块中的选区按块序号和偏移恢复。会清空撤销/重做栈（历史从结果重新开始）。没有任何变化时返回 `false`。编辑器对外部变更的 `modelValue` 使用此方法。 |
| `caretPosition()` | `{ block, offset } \| null`——选区起点所在的顶层块及其文本中的字符偏移。 |
| `moveBlock(from: number, to: number)` | 将顶层块（连同其预览）移动到序号 `to`。一个历史步骤。 |
| `duplicateBlock(index: number)` | 在块之后紧接着插入其副本，不带块 ID。一个历史步骤。 |
| `removeBlock(index: number)` | 删除该块；若为最后一个块则改为清空。一个历史步骤。 |

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
