# 扩展

内置扩展默认启用，无需任何配置。

## Markdown 快捷方式

在块的开头触发（`<p>`、`<div>`、`<h1>`-`<h3>`、`<blockquote>`、
`<pre>`、`<li>` 均可）：

| 输入 | 转换为 |
|---|---|
| `# ` | `<h1>` |
| `## ` | `<h2>` |
| `### ` | `<h3>` |
| `- ` 或 `* ` | `<ul><li>` |
| `1. ` | `<ol><li>` |
| `> ` | `<blockquote>` |
| ` ``` ` | `<pre><code>` |

触发序列（例如 `## `）会被消耗掉，不会留在文本中。

## 斜杠命令

在块的开头输入 `/`，会弹出包含以下命令的菜单：

- `/h1`、`/h2`、`/h3` — 标题
- `/list`、`/ul` — 无序列表
- `/ol` — 有序列表
- `/quote` — 引用块（blockquote）
- `/code` — 代码块
- `/hr` — 水平分隔线
- `/table` — 插入表格

宿主应用可以通过 `slashCommands` prop 添加自己的命令项；它们会列在内置命令之后。

继续输入字符即可筛选（`/h2`）。↑/↓ 切换选项，Enter 确认，Esc 取消。

## 图表与示意图的块预览

代码块可以显示为它所绘制的内容。为每种语言传入一个渲染器（renderer）：

```ts
import { render, DiagramError } from '@dskripchenko/diagrams'
import type { BlockRenderers, SlashCommand } from '@dskripchenko/wysiwyg'

const blockRenderers: BlockRenderers = {
  mermaid: (code) => {
    try {
      return { html: render(code).svg }
    } catch (e) {
      if (e instanceof DiagramError) return { error: e.message }
      throw e
    }
  },
}

const slashCommands: SlashCommand[] = [{
  key: 'diagram',
  label: 'Diagram',
  aliases: ['mermaid'],
  apply: (c) => c.chain().focus().insertCodeBlock('mermaid', 'flowchart LR\n  A --> B').run(),
}]
```

```vue
<DskWysiwyg v-model="html" :block-renderers="blockRenderers" :slash-commands="slashCommands" />
```

- `<pre><code class="language-mermaid">` 显示为其图表，代码本身被隐藏。
- 点击图表会打开代码，并在其下方显示实时预览。输入停顿片刻后重新渲染。按
  Escape 或把光标移出即可关闭。
- 如果渲染器返回 `{ error }`，代码保持打开，错误信息显示在其下方。
- 在已显示的图表上按 Backspace 会将其连同代码一起删除；撤销会把两者一起恢复。
- 只读模式下图表照常显示，但不能打开。

存储的 HTML 永远不会改变：`getHTML()`、v-model、历史记录和 `htmlToMarkdown`
看到的只有代码块（` ```mermaid `）。预览是编辑器添加和移除的不可编辑“岛”（island）。

渲染器的契约与组件库（kit）UidMarkdown 的 `blockRenderers` 相同：
`(code, { language, index }) => { html?, error? }` 或返回它的 Promise，因此
同一个注册表可以同时服务于两者。`html` 会被原样插入，其安全性由渲染器负责。
编辑器本身不依赖任何图表库。

### 实时块（组件）

渲染器可以返回 `mount` 而不是 `html`。此时岛中承载一个实时组件（widget）——
表单、请求构建器等——它本身就是该块的编辑器：

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

- 代码保持隐藏，永远不会展开：组件通过 `setCode(code)` 修改它，编辑器将其记为
  一步历史并发出（emit）新的 HTML。
- 撤销和重做会从外部改变代码：组件通过 `update(code)` 收到新代码；没有
  `update` 时组件会被重新挂载。
- 组件内部的按键、输入、粘贴和点击都留在组件内——编辑器不会把它们当作自己的事件处理。
- 只读模式下 `editable` 为 `false`，`setCode` 被忽略；切换模式会重新挂载所有组件。
- 当块被删除、被撤销替换或编辑器卸载时，会调用 `destroy`。

该契约（`BlockMountContext`、`BlockMountHandle`）与组件库 UidMarkdown 的相同，
因此注册一次的渲染器在两处都能使用。

## 代码语法高亮

`<pre><code class="language-{lang}">` 块会在失去焦点（blur）时进行高亮。
支持的语言：`js`、`ts`、`tsx`、`jsx`、`php`、`html`、`css`、`json`。

高亮器是基于 token 的正则实现（约 5 KB）。对于其他小众语言，去掉 `language-`
类即可，该块会保持为普通代码。

## 表格

`controller.insertTable(3, 4)` 插入一个 3×4 的表格，包含 `<thead>` /
`<tbody>` / `<th>` / `<td>`。光标位于表格内时，工具栏会显示
addRow / addColumn / remove 按钮（也可以使用控制器）。

## HTML→Markdown

```ts
import { htmlToMarkdown } from '@dskripchenko/wysiwyg'

const md = htmlToMarkdown('<h1>Hi</h1><p><strong>bold</strong> text, version 1.5</p>')
// '# Hi\n\n**bold** text, version 1.5'
```

将编辑器的 HTML 转换为 CommonMark（带 GFM 表格和删除线），其写法保证再转换回去
得到的是同一个文档——第二次转换不会产生任何变化：

- 标题 h1–h6、段落、`**bold**`、`*italic*`、`~~struck~~`；
  `u`、`mark`、`sup`、`sub` 保留为 HTML（Markdown 中没有对应语法）；
- 行内代码使用所需数量的反引号；代码块的围栏（fence）比其中任何反引号序列都长，
  并保留语言（` ```mermaid `）；
- 列表通过缩进嵌套，一个列表项中可以有多个段落；
- 引用（包括嵌套引用）；表格保留列对齐方式；链接和图片保留其 title；
  `<br>` 作为硬换行（行尾的 `\`）；
- 只在字符会被理解为标记时才进行转义（`*`、`_`、`` ` ``、`[`、`<`，以及行首的
  `#`、`-`、`1.`）：句点、连字符和括号保持原样。

编辑器的预览岛不会被输出。

## 源代码模式

工具栏的 `[</>]` 按钮在 WYSIWYG 和原始 HTML 编辑器（带语法高亮覆盖层的
`<textarea>`）之间切换。进入时 HTML 会被**美化**（beautify，块级标签之间加换行和
2 个空格缩进）。退出时会被**压缩**（minify，块级标签之间的空白被折叠）。
持久化的表单状态保存的是压缩后的版本。

## 公共扩展 API

```ts
import { highlight } from '@dskripchenko/wysiwyg'

highlight('const x = 1', 'js')   // 返回带 <span class="dsk-tok-*"> 的 HTML 字符串
```

## 另请参阅

- [控制器 API](controller-api.md) — 以编程方式调用
- [自定义](customization.md) — 宿主侧的自定义
