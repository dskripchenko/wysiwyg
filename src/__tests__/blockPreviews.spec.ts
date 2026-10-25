import { beforeEach, describe, expect, it } from 'vitest'
import { EditorController, sanitizeHtml, type BlockRenderers } from '../engine'
import { htmlToMarkdown } from '../engine/htmlToMarkdown'
import { PREVIEW_ATTR, STATE_ATTR } from '../engine/blockPreviews'

const MERMAID = '<pre><code class="language-mermaid">flowchart LR\n  A --&gt; B</code></pre><p>after</p>'

const renderers: BlockRenderers = {
  mermaid: (code) => (code.includes('oops') ? { error: 'Unexpected "oops" (line 1)' } : { html: `<svg data-src="${code.length}"></svg>` }),
}

function setup(html = MERMAID, r: BlockRenderers = renderers): { host: HTMLElement; c: EditorController } {
  const host = document.createElement('div')
  host.contentEditable = 'true'
  document.body.appendChild(host)
  const c = new EditorController(host, { blockRenderers: r })
  c.setContent(html)
  return { host, c }
}

function caretIn(node: Node, offset = 0): Range {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  return range
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('block previews', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('shows a renderer language as its preview and keeps the code out of sight', () => {
    const { host } = setup()
    const pre = host.querySelector('pre')!
    const island = pre.nextElementSibling!
    expect(island.hasAttribute(PREVIEW_ATTR)).toBe(true)
    expect(island.getAttribute('contenteditable')).toBe('false')
    expect(island.innerHTML).toContain('<svg')
    expect(pre.getAttribute(STATE_ATTR)).toBe('view')
  })

  it('keeps the islands and the state out of getHTML and the history', () => {
    const { host, c } = setup()
    expect(c.getHTML()).toBe(MERMAID)
    host.querySelector('p')!.textContent = 'changed'
    c.history.commit()
    c.chain().undo().run()
    expect(c.getHTML()).toBe(MERMAID)
    // The restored snapshot is decorated again.
    expect(host.querySelector(`[${PREVIEW_ATTR}] svg`)).not.toBeNull()
  })

  it('leaves code blocks without a renderer alone', () => {
    const html = '<pre><code class="language-js">let a = 1</code></pre><pre>plain</pre>'
    const { host, c } = setup(html)
    expect(host.querySelector(`[${PREVIEW_ATTR}]`)).toBeNull()
    expect(c.getHTML()).toBe(html)
    const none = setup(MERMAID, {})
    expect(none.host.querySelector(`[${PREVIEW_ATTR}]`)).toBeNull()
  })

  it('shows the code with the message when the renderer cannot read it', () => {
    const { host } = setup('<pre><code class="language-mermaid">oops</code></pre>')
    const pre = host.querySelector('pre')!
    expect(pre.getAttribute(STATE_ATTR)).toBe('error')
    expect(pre.nextElementSibling!.textContent).toBe('Unexpected "oops" (line 1)')
    expect(pre.nextElementSibling!.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('opens the code under the caret and closes it when the caret leaves', () => {
    const { host, c } = setup()
    const pre = host.querySelector('pre')!
    c.previews.edit(pre.nextElementSibling as HTMLElement)
    expect(pre.getAttribute(STATE_ATTR)).toBe('edit')
    expect(c.previews.openCodeAt(window.getSelection()!.getRangeAt(0))).toBe(pre)
    c.previews.followSelection(caretIn(host.querySelector('p')!.firstChild!))
    expect(pre.getAttribute(STATE_ATTR)).toBe('view')
  })

  it('re-renders on sync only when the code changed', () => {
    let calls = 0
    const { host, c } = setup(MERMAID, { mermaid: (code) => { calls++; return { html: `<svg>${code.length}</svg>` } } })
    c.previews.sync()
    expect(calls).toBe(1)
    host.querySelector('code')!.textContent = 'flowchart TD\n  A --> B --> C'
    c.previews.sync()
    expect(calls).toBe(2)
    expect(host.querySelector(`[${PREVIEW_ATTR}]`)!.textContent).toBe('28')
  })

  it('a late async answer never overwrites a newer one', async () => {
    const pending: Array<(r: { html: string }) => void> = []
    const { host, c } = setup(MERMAID, { mermaid: () => new Promise((resolve) => pending.push(resolve)) })
    host.querySelector('code')!.textContent = 'flowchart TD'
    c.previews.sync()
    pending[1]!({ html: '<svg>new</svg>' })
    await flush()
    pending[0]!({ html: '<svg>old</svg>' })
    await flush()
    expect(host.querySelector(`[${PREVIEW_ATTR}]`)!.textContent).toBe('new')
  })

  it('a deleted preview takes its hidden code along', () => {
    const { host, c } = setup()
    host.querySelector(`[${PREVIEW_ATTR}]`)!.remove()
    expect(c.previews.dropOrphanedCode()).toBe(true)
    expect(host.querySelector('pre')).toBeNull()
    expect(c.getHTML()).toBe('<p>after</p>')
  })

  it('drops an island whose code block is gone or changed language', () => {
    const { host, c } = setup()
    host.querySelector('code')!.className = 'language-js'
    c.previews.sync()
    expect(host.querySelector(`[${PREVIEW_ATTR}]`)).toBeNull()
    expect(host.querySelector('pre')!.hasAttribute(STATE_ATTR)).toBe(false)
  })

  it('insertCodeBlock replaces an empty paragraph and opens the code', () => {
    const { host, c } = setup('<p>before</p><p><br></p>')
    caretIn(host.querySelectorAll('p')[1]!, 0)
    c.chain().insertCodeBlock('mermaid').run()
    const pre = host.querySelector('pre')!
    expect(pre.previousElementSibling!.textContent).toBe('before')
    expect(c.getHTML()).toBe('<p>before</p><pre><code class="language-mermaid"></code></pre><p><br></p>')
    // Empty code: nothing drawn yet and no error.
    expect(pre.nextElementSibling!.hasAttribute(PREVIEW_ATTR)).toBe(true)
    expect(pre.nextElementSibling!.childNodes.length).toBe(0)
    c.previews.followSelection(window.getSelection()!.getRangeAt(0))
    expect(pre.getAttribute(STATE_ATTR)).toBe('edit')
  })

  it('leave() puts the caret into the block after the preview', () => {
    const { host, c } = setup('<pre><code class="language-mermaid">pie\n  "a" : 1</code></pre>')
    const pre = host.querySelector('pre')!
    c.previews.edit(pre.nextElementSibling as HTMLElement)
    c.previews.leave(pre)
    expect(pre.getAttribute(STATE_ATTR)).toBe('view')
    const caret = window.getSelection()!.getRangeAt(0)
    expect(caret.startContainer).toBe(host.lastElementChild)
    expect(host.lastElementChild!.tagName).toBe('P')
  })

  it('sanitize drops a copied island whole; markdown keeps the language', () => {
    const copied = `<pre><code class="language-mermaid">pie</code></pre><div data-dsk-preview contenteditable="false"><svg><text>Books</text></svg></div>`
    expect(sanitizeHtml(copied)).toBe('<pre><code class="language-mermaid">pie</code></pre>')
    expect(htmlToMarkdown(copied)).toBe('```mermaid\npie\n```')
    expect(htmlToMarkdown('<pre><code>x</code></pre>')).toBe('```\nx\n```')
  })
})
