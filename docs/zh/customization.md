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
