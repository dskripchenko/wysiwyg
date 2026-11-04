import { beforeEach, describe, expect, it } from 'vitest'
import { EditorController } from '../engine'
import { toggleTask } from '../engine/commands'
import { htmlToMarkdown } from '../engine/htmlToMarkdown'
import { applyMarkdownShortcut } from '../engine/markdownShortcuts'
import { sanitizeHtml } from '../engine/sanitize'

function caretIn(node: Node, offset: number): void {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
}

describe('task lists', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('a checkbox opening an item — as a Markdown renderer or GitHub writes it — becomes the item’s state', () => {
    const html = sanitizeHtml(
      '<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" checked disabled> Cart</li>' +
        '<li><p><input type="checkbox"> Refunds</p></li><li>Plain</li></ul>',
    )
    expect(html).toBe('<ul><li data-checked="true">Cart</li><li data-checked="false"><p>Refunds</p></li><li>Plain</li></ul>')
    // Any other value is no state of a box.
    expect(sanitizeHtml('<ul><li data-checked="maybe">x</li></ul>')).toBe('<ul><li data-checked="false">x</li></ul>')
  })

  it('written back as GFM, ticked and not, nested and ordered too', () => {
    const md = htmlToMarkdown(
      '<ul><li data-checked="true">Cart</li><li data-checked="false">Refunds<ul><li data-checked="false">Partial</li></ul></li><li>Plain</li></ul>' +
        '<ol><li data-checked="true">First</li></ol>',
    )
    expect(md).toBe('- [x] Cart\n- [ ] Refunds\n  - [ ] Partial\n- Plain\n\n1. [x] First')
  })

  it('a box typed at the start of a list item makes it a task', () => {
    const host = document.createElement('div')
    host.contentEditable = 'true'
    host.innerHTML = '<ul><li>[x] </li></ul>'
    document.body.append(host)
    const text = host.querySelector('li')!.firstChild!
    caretIn(text, 4)
    expect(applyMarkdownShortcut(host).applied).toBe(true)
    expect(host.innerHTML).toBe('<ul><li data-checked="true"><br></li></ul>')
    // Not in a paragraph: `[ ] ` there is text.
    host.innerHTML = '<p>[ ] </p>'
    caretIn(host.querySelector('p')!.firstChild!, 4)
    expect(applyMarkdownShortcut(host).applied).toBe(false)
  })

  it('the command makes a list of tasks and back; a click’s toggle ticks one', () => {
    const host = document.createElement('div')
    host.contentEditable = 'true'
    document.body.append(host)
    const editor = new EditorController(host)
    editor.setContent('<p>Buy tea</p>')
    caretIn(host.querySelector('p')!.firstChild!, 3)
    editor.chain().taskList().run()
    expect(editor.getHTML()).toBe('<ul><li data-checked="false">Buy tea</li></ul>')
    const li = host.querySelector('li')!
    expect(toggleTask(li)).toBe(true)
    expect(htmlToMarkdown(editor.getHTML())).toBe('- [x] Buy tea')
    caretIn(li.firstChild!, 2)
    editor.chain().taskList().run()
    expect(editor.getHTML()).toBe('<ul><li>Buy tea</li></ul>')
    expect(toggleTask(host.querySelector('li')!)).toBe(false)
  })
})
