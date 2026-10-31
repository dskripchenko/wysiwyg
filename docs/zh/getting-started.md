# 快速开始

## 安装

```bash
npm i @dskripchenko/wysiwyg
```

可选（用于更好看的工具栏图标）：

```bash
npm i @dskripchenko/ui lucide-vue-next
```

## 基本用法

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'
import '@dskripchenko/wysiwyg/style.css'

const html = ref('<p>Hello <strong>world</strong>!</p>')
</script>

<template>
  <DskWysiwyg v-model="html" />
</template>
```

该组件**内部是非受控的**（uncontrolled）——`v-model` 是唯一的数据源。编辑器输出的
HTML 在发出（emit）之前会经过内部基于 DOMParser 的白名单清洗。

## Props

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `modelValue` | `string` | `''` | HTML 字符串。发出时进行清洗。 |
| `placeholder` | `string` | 当前语言自带的 | 内容为空时显示。 |
| `locale` | `'en' \| 'ru'` | 组件库的语言，否则为 `'en'` | 界面语言，参见[自定义](customization.md#界面语言)。 |
| `labels` | `WysiwygPartialLabels` | — | 覆盖语言自带文案中的单个界面字符串。 |
| `toolbar` | `boolean` | `true` | 显示工具栏。 |
| `toolbarItems` | `ToolbarItem[]` | （默认集合） | 覆盖工具栏顺序。 |
| `readonly` | `boolean` | `false` | |
| `minHeight` | `string` | `'200px'` | 作用于根元素的 CSS 长度。 |
| `maxHeight` | `string` | `undefined` | 作用于根元素的 CSS 长度。 |
| `resizable` | `boolean` | `true` | 用户可垂直调整大小。 |
| `blockRenderers` | `BlockRenderers` | `{}` | 以其绘制结果显示的代码块语言，例如 `{ mermaid }`。参见[扩展](extensions.md#图表与示意图的块预览)。 |
| `slashCommands` | `SlashCommand[]` | `[]` | 添加到斜杠菜单中、位于内置项之后的命令项。 |
| `allowedAttributes` | `Record<string, string[]>` | `{}` | 在内置白名单之外按标签保留的属性——你自己的标记，例如 `{ img: ['data-signature'] }`。`on*` 事件处理属性永远不会被保留。 |

## 事件

`@update:modelValue` — 与 `v-model` 相同。

## 默认工具栏

Bold / Italic / Underline / Strike / Code · H1 H2 H3 · Bullet List /
Ordered List / Blockquote · Link / Image / HR · Code Block · Table ·
Undo / Redo · 源代码模式切换。

## 自定义工具栏

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', 'h2', 'h3', '|', 'link', 'image', 'source']"
/>
```

`|` 插入分隔符。可用项：`bold`、`italic`、`underline`、
`strike`、`code`、`h1`-`h3`、`ul`、`ol`、`quote`、`link`、`image`、
`hr`、`codeblock`、`table`、`undo`、`redo`、`source`、`fullscreen`。

## 下一步

- [控制器 API](controller-api.md) — 以编程方式编辑
- [扩展](extensions.md) — Markdown 快捷方式、斜杠命令、表格、语法高亮
- [自定义](customization.md) — 主题、尺寸、自定义命令
