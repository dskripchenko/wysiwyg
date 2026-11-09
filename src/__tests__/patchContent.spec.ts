import { beforeEach, describe, expect, it } from 'vitest'
import { EditorController, type BlockRenderers } from '../engine'
import { PREVIEW_ATTR } from '../engine/blockPreviews'
import { positionOf, rangeAt, topBlocks } from '../engine/blocks'

function setup(html: string, blockRenderers: BlockRenderers = {}): { host: HTMLElement; c: EditorController } {
  const host = document.createElement('div')
  host.contentEditable = 'true'
  document.body.appendChild(host)
  const c = new EditorController(host, { blockRenderers })
  c.setContent(html)
  return { host, c }
}

function caretIn(node: Node, offset: number): void {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
}

function caret(): Range {
  return window.getSelection()!.getRangeAt(0)
}

const mermaid: BlockRenderers = { mermaid: (code) => ({ html: `<svg data-len="${code.length}"></svg>` }) }

describe('patchContent', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('replaces only the blocks that differ and keeps the others as the same nodes', () => {
    const { host, c } = setup('<p>one</p><p>two</p><p>three</p>')
    const [first, second, third] = Array.from(host.children)
    expect(c.patchContent('<p>one</p><p>TWO</p><p>three</p>')).toBe(true)
    expect(c.getHTML()).toBe('<p>one</p><p>TWO</p><p>three</p>')
    expect(host.children[0]).toBe(first)
    expect(host.children[1]).not.toBe(second)
    expect(host.children[2]).toBe(third)
  })

  it('answers false and touches nothing when the content is the same', () => {
    const { host, c } = setup('<p>one</p><p>two</p>')
    const before = Array.from(host.children)
    expect(c.patchContent('<p>one</p><p>two</p>')).toBe(false)
    expect(Array.from(host.children)).toEqual(before)
  })

  it('handles inserted and removed blocks at either end and in the middle', () => {
    const { c } = setup('<p>a</p><p>b</p>')
    c.patchContent('<h2>top</h2><p>a</p><p>b</p>')
    expect(c.getHTML()).toBe('<h2>top</h2><p>a</p><p>b</p>')
    c.patchContent('<h2>top</h2><p>a</p><p>new</p><p>b</p><p>end</p>')
    expect(c.getHTML()).toBe('<h2>top</h2><p>a</p><p>new</p><p>b</p><p>end</p>')
    c.patchContent('<p>b</p>')
    expect(c.getHTML()).toBe('<p>b</p>')
    c.patchContent('')
    expect(c.getHTML()).toBe('<p><br></p>')
  })

  it('keeps the caret exactly where it is when its block is untouched', () => {
    const { host, c } = setup('<p>hello</p><p>world</p>')
    const text = host.children[1]!.firstChild!
    caretIn(text, 3)
    c.patchContent('<p>HELLO there</p><p>world</p>')
    expect(caret().startContainer).toBe(text)
    expect(caret().startOffset).toBe(3)
  })

  it('puts the caret back by block index and offset when its block was replaced', () => {
    const { host, c } = setup('<p>one</p><p>hello world</p><p>three</p>')
    caretIn(host.children[1]!.firstChild!, 5)
    c.patchContent('<p>one</p><p>hello <strong>big</strong> world</p><p>three</p>')
    expect(c.caretPosition()).toEqual({ block: 1, offset: 5 })
    expect(host.children[1]!.contains(caret().startContainer)).toBe(true)
  })

  it('clamps a restored caret to the block\'s end', () => {
    const { host, c } = setup('<p>long text here</p>')
    caretIn(host.firstChild!.firstChild!, 12)
    c.patchContent('<p>short</p>')
    expect(c.caretPosition()).toEqual({ block: 0, offset: 5 })
  })

  it('rebases the history: an undo never takes back a change from outside', () => {
    const { host, c } = setup('<p>mine</p>')
    host.firstChild!.textContent = 'mine edited'
    c.history.commit()
    expect(c.canUndo()).toBe(true)
    c.patchContent('<p>mine edited</p><p>theirs</p>')
    expect(c.canUndo()).toBe(false)
    c.chain().undo().run()
    expect(c.getHTML()).toBe('<p>mine edited</p><p>theirs</p>')
  })

  it('keeps an untouched preview and its island; renders a new one', () => {
    const html = '<pre><code class="language-mermaid">pie</code></pre><p>after</p>'
    const { host, c } = setup(html, mermaid)
    const island = host.querySelector(`[${PREVIEW_ATTR}]`)
    c.patchContent('<pre><code class="language-mermaid">pie</code></pre><p>after, changed</p><pre><code class="language-mermaid">flowchart</code></pre>')
    expect(host.querySelector(`[${PREVIEW_ATTR}]`)).toBe(island)
    expect(host.querySelectorAll(`[${PREVIEW_ATTR}]`)).toHaveLength(2)
    expect(c.getHTML()).toBe('<pre><code class="language-mermaid">pie</code></pre><p>after, changed</p><pre><code class="language-mermaid">flowchart</code></pre>')
  })

  it('replaces a changed code block together with its island', () => {
    const { host, c } = setup('<p>x</p><pre><code class="language-mermaid">pie</code></pre><p>y</p>', mermaid)
    c.patchContent('<p>x</p><pre><code class="language-mermaid">pie chart</code></pre><p>y</p>')
    expect(host.querySelectorAll(`[${PREVIEW_ATTR}]`)).toHaveLength(1)
    expect(host.querySelector(`[${PREVIEW_ATTR}] svg`)!.getAttribute('data-len')).toBe('9')
    expect(topBlocks(host).map((b) => b.tagName)).toEqual(['P', 'PRE', 'P'])
  })
})

describe('positions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('counts top-level blocks without the islands and offsets across inline marks', () => {
    const { host } = setup('<pre><code class="language-mermaid">pie</code></pre><p>a <em>bc</em> d</p>', mermaid)
    const em = host.querySelector('em')!.firstChild!
    expect(positionOf(host, em, 1)).toEqual({ block: 1, offset: 3 })
    const range = rangeAt(host, { block: 1, offset: 3 })!
    expect(range.startContainer).toBe(em)
    expect(range.startOffset).toBe(1)
    // Past the last block: the end of the content.
    const end = rangeAt(host, { block: 9 })!
    expect(positionOf(host, end.startContainer, end.startOffset)).toEqual({ block: 1, offset: 6 })
  })
})

describe('block operations', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('moves a block, one history step each', () => {
    const { c } = setup('<p>a</p><p>b</p><p>c</p>')
    expect(c.moveBlock(0, 2)).toBe(true)
    expect(c.getHTML()).toBe('<p>b</p><p>c</p><p>a</p>')
    expect(c.caretPosition()).toEqual({ block: 2, offset: 0 })
    expect(c.moveBlock(2, 1)).toBe(true)
    expect(c.getHTML()).toBe('<p>b</p><p>a</p><p>c</p>')
    expect(c.moveBlock(1, 1)).toBe(false)
    c.chain().undo().run()
    expect(c.getHTML()).toBe('<p>b</p><p>c</p><p>a</p>')
  })

  it('moves a code block with its preview island', () => {
    const { host, c } = setup('<p>a</p><pre><code class="language-mermaid">pie</code></pre><p>b</p>', mermaid)
    c.moveBlock(1, 0)
    expect(c.getHTML()).toBe('<pre><code class="language-mermaid">pie</code></pre><p>a</p><p>b</p>')
    expect(host.children[1]!.hasAttribute(PREVIEW_ATTR)).toBe(true)
    c.moveBlock(0, 2)
    expect(c.getHTML()).toBe('<p>a</p><p>b</p><pre><code class="language-mermaid">pie</code></pre>')
    expect(host.lastElementChild!.hasAttribute(PREVIEW_ATTR)).toBe(true)
  })

  it('duplicates a block without its block id, and removes one', () => {
    const { c } = setup('<p>a ^first</p><p>b</p>')
    expect(c.duplicateBlock(0)).toBe(true)
    const html = c.getHTML()
    expect(html.match(/data-block-id/g)).toHaveLength(1)
    expect(c.caretPosition()?.block).toBe(1)
    expect(c.removeBlock(0)).toBe(true)
    expect(c.getHTML()).toBe('<p>a</p><p>b</p>')
    c.removeBlock(1)
    c.removeBlock(0)
    expect(c.getHTML()).toBe('<p><br></p>')
  })
})
