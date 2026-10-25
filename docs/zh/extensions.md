---
title: 扩展
locale: zh
status: stub
translated_from: ../en/extensions.md
---

# 扩展

> ⚠️ **此页面尚未完全翻译。** 在此期间请阅读[英文版本](../en/extensions.md)。

## 块预览与实时块

`blockRenderers`（`DskWysiwyg` 的 prop、`EditorController` 的选项）把
`<pre><code class="language-X">` 显示为其绘制结果：`{ mermaid }` 返回带图表的
`{ html }` 或 `{ error }`。点击会打开代码并实时预览；保存的 HTML 只包含代码。

### 实时块（组件）

渲染器可以返回 `mount` 而不是 `html`。此时岛中挂载一个实时组件——表单、
请求构建器——它本身就是该块的编辑器：

```ts
const blockRenderers: BlockRenderers = {
  api: () => ({
    mount: (el, { code, editable, setCode }) => {
      const widget = createWidget(el, { code, readonly: !editable, onChange: setCode })
      return { update: (next) => widget.setCode(next), destroy: () => widget.unmount() }
    },
  }),
}
```

- 代码保持隐藏，永不展开：组件通过 `setCode(code)` 修改它，编辑器将其记为
  一步历史并发出 HTML。
- 撤销和重做从外部改变代码：组件通过 `update(code)` 收到新代码；没有
  `update` 时组件会重新挂载。
- 组件内的按键、输入、粘贴和点击都留给组件，编辑器不会拦截。
- 只读模式下 `editable` 为 `false`，`setCode` 被忽略；切换模式会重新挂载组件。
- 当块被删除、被撤销替换或编辑器卸载时调用 `destroy`。

该契约（`BlockMountContext`、`BlockMountHandle`）与组件库 UidMarkdown 的相同：
注册一次的渲染器在两处都能使用。

