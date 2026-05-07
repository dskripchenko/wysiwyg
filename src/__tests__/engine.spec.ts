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
  // Select inside first block child — это типичный сценарий когда юзер
  // выделяет текст в параграфе. selectNodeContents(host) даёт startContainer=host,
  // что не имеет block-ancestor'а внутри editor'а.
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
})
