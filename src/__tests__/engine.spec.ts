import { beforeEach, describe, expect, it } from 'vitest'
import { EditorController } from '../engine'

function setupHost(html = ''): HTMLElement {
  const host = document.createElement('div')
  host.contentEditable = 'true'
  host.innerHTML = html
  document.body.appendChild(host)
  return host
}

function selectAll(host: HTMLElement): void {
  // A selection inside the first block child — the typical scenario of a user
  // selecting text in a paragraph. selectNodeContents(host) gives
  // startContainer=host, which has no block ancestor inside the editor.
  const target = host.firstElementChild ?? host
  const range = document.createRange()
  range.selectNodeContents(target)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
}

describe('EditorController', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('setContent + getHTML round-trip with sanitize', () => {
    const host = setupHost()
    const c = new EditorController(host)
    c.setContent('<p>Hello <script>x</script><strong>world</strong></p>')
    expect(c.getHTML()).toContain('<strong>world</strong>')
    expect(c.getHTML()).not.toContain('script')
  })

  it('setContent keeps the host markers the controller was given', () => {
    const host = setupHost()
    const c = new EditorController(host, { allowedAttributes: { img: ['data-signature-stamp'] } })
    c.setContent('<p><img src="x.png" data-signature-stamp="client"></p>')
    expect(c.getHTML()).toContain('data-signature-stamp="client"')
    expect(new EditorController(setupHost()).sanitizeOptions).toEqual({})
  })

  it('isEmpty true for empty host', () => {
    const host = setupHost()
    const c = new EditorController(host)
    expect(c.isEmpty()).toBe(true)
  })

  it('toggleInlineMark wraps selection in <strong>', () => {
    const host = setupHost('<p>hello</p>')
    const c = new EditorController(host)
    selectAll(host)
    c.chain().bold().run()
    expect(host.innerHTML).toContain('<strong>')
  })

  it('setBlockTag changes paragraph to h1', () => {
    const host = setupHost('<p>title</p>')
    const c = new EditorController(host)
    selectAll(host)
    c.chain().heading(1).run()
    expect(host.innerHTML).toContain('<h1>')
  })

  it('history undo restores previous state', () => {
    const host = setupHost('<p>x</p>')
    const c = new EditorController(host)
    selectAll(host)
    c.chain().heading(1).run()
    expect(host.innerHTML).toContain('<h1>')
    c.chain().undo().run()
    expect(host.innerHTML).toContain('<p>x</p>')
    expect(host.innerHTML).not.toContain('<h1>')
  })

  it('toggleList wraps in <ul><li>', () => {
    const host = setupHost('<p>item</p>')
    const c = new EditorController(host)
    selectAll(host)
    c.chain().bulletList().run()
    expect(host.innerHTML).toMatch(/<ul>.*<li>.*<\/li>.*<\/ul>/s)
  })

  it('insertImage adds <img> at caret', () => {
    const host = setupHost('<p>x</p>')
    const c = new EditorController(host)
    selectAll(host)
    c.chain().setImage('https://example.com/x.png', 'alt').run()
    expect(host.innerHTML).toContain('<img')
    expect(host.innerHTML).toContain('https://example.com/x.png')
  })

  it('getHTML strips ZWSP (U+200B) from output', () => {
    const host = setupHost('<p>before<strong>​bold</strong>​ end</p>')
    const c = new EditorController(host)
    expect(host.innerHTML).toContain('​')
    expect(c.getHTML()).not.toContain('​')
    expect(c.getHTML()).toContain('<strong>bold</strong> end')
  })

  it('setBlockTag on <li> extracts to new block after list (B5b)', () => {
    const host = setupHost('<ul><li>first</li><li>second</li><li>third</li></ul>')
    const c = new EditorController(host)
    // The caret in the middle of the second li.
    const secondLi = host.querySelectorAll('li')[1]
    const range = document.createRange()
    range.selectNodeContents(secondLi)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    c.chain().heading(2).run()
    // Expected: <ul><li>first</li></ul><h2>second</h2><ul><li>third</li></ul>
    expect(host.innerHTML).toMatch(/<ul><li>first<\/li><\/ul><h2>second<\/h2><ul><li>third<\/li><\/ul>/)
  })

  describe('the caret survives a block replacement', () => {
    function caretAt(node: Node, offset: number): void {
      const range = document.createRange()
      range.setStart(node, offset)
      range.collapse(true)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    }

    /** The block holding the caret and the text before it in that block. */
    function caret(): { tag: string; before: string } {
      const range = window.getSelection()!.getRangeAt(0)
      let n: Node | null = range.startContainer
      while (n && !(n instanceof HTMLElement && /^(P|H\d|BLOCKQUOTE|LI|PRE)$/.test(n.tagName))) n = n.parentNode
      const block = n as HTMLElement
      const before = document.createRange()
      before.selectNodeContents(block)
      before.setEnd(range.startContainer, range.startOffset)
      return { tag: block.tagName, before: before.toString() }
    }

    it('heading keeps the caret at its offset in the text', () => {
      const host = setupHost('<p>first</p><p>hello <strong>bold</strong> tail</p>')
      const c = new EditorController(host)
      caretAt(host.children[1].querySelector('strong')!.firstChild!, 2)
      c.chain().heading(2).run()
      expect(host.innerHTML).toBe('<p>first</p><h2>hello <strong>bold</strong> tail</h2>')
      expect(caret()).toEqual({ tag: 'H2', before: 'hello bo' })
    })

    it('an emptied block gets a <br> and keeps the caret', () => {
      const host = setupHost('<p>first</p><p></p>')
      const c = new EditorController(host)
      caretAt(host.children[1], 0)
      c.chain().blockquote().run()
      expect(host.innerHTML).toBe('<p>first</p><blockquote><br></blockquote>')
      expect(caret()).toEqual({ tag: 'BLOCKQUOTE', before: '' })
    })

    it('a list keeps the caret inside the new item', () => {
      const host = setupHost('<p>first</p><p>item text</p>')
      const c = new EditorController(host)
      caretAt(host.children[1].firstChild!, 4)
      c.chain().bulletList().run()
      expect(host.innerHTML).toBe('<p>first</p><ul><li>item text</li></ul>')
      expect(caret()).toEqual({ tag: 'LI', before: 'item' })
    })
  })
})
