---
title: 自定义
locale: zh
status: stub
translated_from: ../en/customization.md
---

# 自定义

> ⚠️ **此页面尚未完全翻译。** 在此期间请阅读[英文版本](../en/customization.md)。

## 全屏

工具栏项 `fullscreen`（默认集合中，位于 `source` 之后）让编辑器铺满整个窗口——
适合长文本和图表、API 组件等宽块。按 Escape 或再次点击按钮退出；全屏时下方页面
不会滚动，宽屏上正文保持易读的栏宽。

```ts
const editor = ref()
editor.value.toggleFullscreen()      // 或 setFullscreen(true)
editor.value.fullscreen              // 当前状态
```

```vue
<DskWysiwyg ref="editor" v-model="html" @fullscreen-change="(on) => …" />
```

若宿主有自己的固定层，可调高 `--dsk-wysiwyg-fullscreen-z`（默认 1000）。

## 界面语言

工具栏提示、斜杠菜单和占位符提供英文和俄文两种语言。语言来源按以下顺序，先匹配者生效：

1. `labels` —— 覆盖语言中的单个字符串；
2. `locale` —— `'en'` 或 `'ru'`；
3. @dskripchenko/ui 组件库的语言：已安装组件库且编辑器上方存在
   `UidLocaleProvider`（或 `provideLocale()`）时，`code` 以 `ru` 开头则为俄文，否则为英文；
4. 英文。

```vue
<DskWysiwyg v-model="html" locale="ru" />

<DskWysiwyg
  v-model="html"
  :labels="{ placeholder: '开始输入…', toolbar: { bold: '粗体 (⌘B)' }, slash: { h1: '标题 1' } }"
/>
```

`placeholder` 属性仍优先于语言自带的占位符。分组为 `toolbar`（按钮提示、工具栏 aria-label 用的
`label`、`sourceBack`、`fullscreenExit`、备用 prompt 用的 `linkPrompt`）和 `slash`
（内置菜单项及其提示）；完整的语言包导出为 `wysiwygEn` 和 `wysiwygRu`，类型为
`WysiwygLabels` 和 `WysiwygPartialLabels`。单独使用 `DskWysiwygToolbar` 和
`DskWysiwygSlashMenu` 时，它们接受相同的 `locale` 和 `labels`。

组件库是可选的 peer 依赖：没有它时，除非另行指定，编辑器为英文。
