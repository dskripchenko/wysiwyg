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

## 原地编辑：浮动工具栏与 frameless

要在页面原处编辑，可以去掉边框，由选区上方的小型深色工具条提供格式：

```vue
<DskWysiwyg v-model="html" frameless bubble :toolbar="false" :resizable="false" />
```

`bubble` 在内容中的选区非空时显示工具条（源码模式和只读模式下不显示）；选区折叠、
离开编辑器或按 Escape 时隐藏。点击其按钮不会丢失选区。它居中显示在选区上方，上方
没有空间时显示在下方，并始终保持在编辑器内。`true` 为粗体、斜体、下划线、删除线、
行内代码、链接、二级标题和无序列表；数组用于指定项（`:bubble="['bold', 'italic', 'link']"`）。

`frameless` 去掉内容周围的边框、圆角、背景和内边距以及工具栏的背景，并沿用页面的
文字颜色和字号。`--dsk-wysiwyg-frameless-padding`（默认 0）可恢复内边距。

工具条的令牌（深色主题下更浅一级并带边框）：

```css
.dsk-wysiwyg {
  --dsk-wysiwyg-bubble-bg: #18181b;
  --dsk-wysiwyg-bubble-fg: #f4f4f5;
  --dsk-wysiwyg-bubble-border: transparent;
  --dsk-wysiwyg-bubble-radius: 8px;
  --dsk-wysiwyg-bubble-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.16);
  --dsk-wysiwyg-bubble-hover-bg: rgba(255, 255, 255, 0.1);
  --dsk-wysiwyg-bubble-active-bg: rgba(255, 255, 255, 0.16);
  --dsk-wysiwyg-bubble-active-fg: #5eead4;
  --dsk-wysiwyg-bubble-divider: rgba(255, 255, 255, 0.16);
  --dsk-wysiwyg-bubble-z: 20;
}
```

### 浮动工具栏中的自定义操作

`bubbleActions` 在浮动工具栏末尾、分隔线之后添加你自己的按钮——例如「评论」按钮：

```vue
<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next'
import type { BubbleAction } from '@dskripchenko/wysiwyg'

const actions: BubbleAction[] = [
  { key: 'comment', label: '评论', icon: MessageSquare, run: ({ text, block }) => openComment(text, block) },
]
</script>

<template>
  <DskWysiwyg v-model="html" bubble :bubble-actions="actions" />
</template>
```

每个按钮显示其 `icon`（任何接受 `size` 属性的组件）和 `label`。与其他按钮一样，
按下时保留选区；`run` 接收所选文本和 `block`——选区起点所在顶层块（内容的直接子元素）
的序号。关闭 `bubble` 时，浮动工具栏只显示这些操作。

## 块拖柄

`blockHandles` 在指针所在块（指针不在内容上时为光标所在块）左侧的边栏中放置「+」和
「⋮⋮」拖柄：

- 「+」在下方添加一个空段落并在其中打开斜杠菜单：段落以 `/` 开头，就像刚输入的一样，
  因此继续输入会过滤菜单，按 Escape 则保留 `/` 作为文本。
- 拖动拖柄（鼠标、触控笔或触摸）可移动块；一条线显示块将落下的位置。图表会连同其
  代码一起移动。
- 点击拖柄（或在其上按 Enter / 空格）打开菜单：上移、下移、复制、删除。用方向键、
  Home 和 End 在菜单中移动，Escape 关闭菜单。

每次更改都是一个撤销步骤，并触发 `update:modelValue`。复制的块不保留其块 ID
（`^id`）：ID 是唯一的。只读模式、源代码模式以及宽度小于 600px 的屏幕上不显示拖柄。
带边框的编辑器在内边距中为拖柄留出空间；`frameless` 编辑器则把拖柄放在页面边距中、
自身盒子之外——请在其左侧留出约 `--dsk-wysiwyg-handles-gutter`（52px）的空间。
插入线使用 `--dsk-wysiwyg-drop-color`；文案位于 `blocks` 组（参见[界面语言](#界面语言)）。

控制器上也有相同的操作：`moveBlock(from, to)`、`duplicateBlock(index)`、
`removeBlock(index)`。

## 协同编辑：他人的光标与外部变更

为了实时协同编辑，编辑器会报告自己的光标位置，在不丢失光标的情况下接受外部传入的
新值，并绘制他人的光标。

- 外部传入的新 `modelValue`（他人的编辑）以补丁方式合入，而不是整体替换：新旧值
  在开头和结尾共有的顶层块保持为同一批 DOM 节点，只替换中间不同的部分。位于未改动
  块中的光标保持原位；位于被替换块中的光标按块序号和块文本中的偏移恢复。
  `controller.patchContent(html)` 可在代码中做同样的事。
- `@caret` 报告 `{ block, offset }`——顶层块的序号及其文本中的字符偏移——最多每
  100ms 一次；编辑器失去焦点时报告 `null`。把它发送给其他人。
- `remoteCarets` 绘制他们的光标：一条该用户颜色的细线，上方的小旗显示其名字。

```vue
<DskWysiwyg
  v-model="html"
  :remote-carets="[{ id: 'u2', name: 'Anna', color: '#e11d48', block: 3, offset: 12 }]"
  @caret="(pos) => channel.send({ caret: pos })"
/>
```

未指定 `color` 的光标按其 `id` 从一个小调色板中取色；未指定 `offset` 或超出块文本
时，光标位于块末尾；块不存在时不绘制。光标是内容上方的一层：不接收指针事件，不触碰
内容和值，并随输入、尺寸变化和滚动而更新，浅色和深色主题下都清晰可见。

**外部变更之后的历史。** 本地撤销不应把他人的编辑当作自己的编辑撤回，因此补丁会
重建历史：撤销和重做栈被清空，并从合入后的内容重新开始。外部变更之前的步骤将无法
再撤销。

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

块拖柄的文案位于 `blocks` 组（`add`、`grip`、`menu`、`moveUp`、`moveDown`、
`duplicate`、`remove`），带预览的已打开块的切换按钮位于 `preview` 组（`split`、
`preview`）。
