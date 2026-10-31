# 自定义

## 主题

编辑器通过 CSS 识别常见的深色模式信号：

- `:root` 或任意祖先元素上的 `data-theme="dark"`（例如由应用的主题切换器设置）
- `:root.dark`（Tailwind 风格）
- `[data-theme='dark']` 祖先元素（大多数应用级切换器）
- `@media (prefers-color-scheme: dark)`（系统偏好）
- `[data-theme='light']` 即使系统为深色也强制使用浅色

也可以直接应用：

```vue
<DskWysiwyg v-model="html" class="dsk-wysiwyg--dark-theme" />
```

## 设计令牌（Tokens）

所有颜色都是 CSS 自定义属性——可以在任何位置覆盖：

```css
.dsk-wysiwyg {
  --dsk-wysiwyg-bg: #fff;
  --dsk-wysiwyg-fg: #111;
  --dsk-wysiwyg-border: #e5e7eb;
  --dsk-wysiwyg-accent: #14b8a6;
  --dsk-wysiwyg-muted: #6b7280;

  /* 语法 token 颜色 */
  --dsk-wysiwyg-tok-keyword: #2563eb;
  --dsk-wysiwyg-tok-string: #16a34a;
  --dsk-wysiwyg-tok-comment: #9ca3af;
  --dsk-wysiwyg-tok-number: #b45309;
  --dsk-wysiwyg-tok-tag: #2563eb;
  --dsk-wysiwyg-tok-attr: #b45309;
  --dsk-wysiwyg-tok-function: #7c3aed;
  --dsk-wysiwyg-tok-punct: #4b5563;
}
```

## 尺寸与调整大小

```vue
<DskWysiwyg
  v-model="html"
  min-height="150px"
  max-height="600px"
  :resizable="true"
/>
```

用户可以垂直拖动右下角的手柄。要禁用此功能：

```vue
<DskWysiwyg :resizable="false" />
```

## 自定义工具栏项

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', '|', 'h2', 'h3', '|', 'link', 'image', 'source']"
/>
```

`|` 表示分隔符。可用项：`bold`、`italic`、`underline`、`strike`、
`code`、`h1`-`h3`、`ul`、`ol`、`quote`、`link`、`image`、`hr`、
`codeblock`、`table`、`undo`、`redo`、`source`、`fullscreen`。

## 自定义命令

从宿主的按钮中使用控制器：

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'

const editorRef = ref(null)
const html = ref('')

function insertSignature() {
  editorRef.value.controller.chain()
    .focus()
    .paragraph()
    .insertText('— Sent from MyApp')
    .run()
}
</script>

<template>
  <DskWysiwyg ref="editorRef" v-model="html" />
  <button @click="insertSignature">Insert signature</button>
</template>
```

## 内容清洗（Sanitization）

`getHTML()` 会让输出经过一个基于 DOMParser 的白名单：

- 允许的标签：`p`、`br`、`strong`、`em`、`u`、`s`、`code`、`pre`、
  `h1`-`h6`、`ul`、`ol`、`li`、`blockquote`、`a`（`href`、`target`、
  `rel`）、`img`（`src`、`alt`、`width`、`height`）、`hr`、`table`、
  `thead`、`tbody`、`tr`、`th`、`td`，以及带有 `language-`/`dsk-tok-`
  前缀 `class` 的 `span`/`code`。
- 其余内容一律丢弃。

如需扩展：fork 本项目，或在保存前用你自己的 `sanitizeHtml` 进行包装。

## 事件 / 生命周期

- `@update:modelValue` — 在每次提交编辑后触发（带防抖）。
- `controller.on('blur', fn)` — 供宿主实现失焦时保存。

## 另请参阅

- [控制器 API](controller-api.md)
- [扩展](extensions.md)

## 全屏

工具栏项 `fullscreen`（位于默认集合中 `source` 之后）让编辑器铺满整个窗口——
适合长文本以及图表、API 组件等宽块。按 Escape 或再次点击同一按钮即可退出；
全屏期间下方页面不会滚动，宽屏上正文保持易读的栏宽。

```ts
const editor = ref()
editor.value.toggleFullscreen()      // 或 setFullscreen(true)
editor.value.fullscreen              // 当前状态
```

```vue
<DskWysiwyg ref="editor" v-model="html" @fullscreen-change="(on) => …" />
```

若宿主有自己的固定定位层，可调高 `--dsk-wysiwyg-fullscreen-z`（默认 1000）。

## 界面语言

工具栏提示、斜杠菜单和占位符提供英文和俄文两种语言。语言来源按以下顺序确定，
先匹配者生效：

1. `labels` —— 覆盖语言自带文案中的单个字符串；
2. `locale` —— `'en'` 或 `'ru'`；
3. @dskripchenko/ui 组件库的语言：当已安装组件库且编辑器上层存在
   `UidLocaleProvider`（或 `provideLocale()`）时，`code` 以 `ru` 开头则为俄文，
   其他情况为英文；
4. 英文。

```vue
<DskWysiwyg v-model="html" locale="ru" />

<DskWysiwyg
  v-model="html"
  :labels="{ placeholder: 'Schreiben…', toolbar: { bold: 'Fett (⌘B)' }, slash: { h1: 'Überschrift 1' } }"
/>
```

`placeholder` prop 仍然优先于语言自带的占位符。分组包括 `toolbar`（按钮提示、
用作工具栏 aria-label 的 `label`、`sourceBack`、`fullscreenExit`，以及用于备用
prompt 的 `linkPrompt`）和 `slash`（内置菜单项及其提示）；完整的文案集导出为
`wysiwygEn` 和 `wysiwygRu`，类型导出为 `WysiwygLabels` 和
`WysiwygPartialLabels`。单独使用 `DskWysiwygToolbar` 和 `DskWysiwygSlashMenu`
时，它们接受相同的 `locale` 和 `labels`。

组件库是可选的 peer 依赖：没有它时，除非另行指定，编辑器界面为英文。
