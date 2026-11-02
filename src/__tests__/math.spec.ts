import { describe, expect, it } from 'vitest'
import { renderMath } from '@dskripchenko/math'
import { EditorController } from '../engine'
import { htmlToMarkdown } from '../engine/htmlToMarkdown'
import { syncMath } from '../engine/mathIslands'
import { sanitizeHtml } from '../engine/sanitize'

/** What the Markdown renderer gives for `$…$` in a line and a `$$…$$` block. */
const inline = (tex: string): string => renderMath(tex)
const block = (tex: string): string => `<div class="uid-markdown__math">${renderMath(tex, { display: true })}</div>`

describe('formulas through the visual mode', () => {
  it('drawn formulas become islands holding their TeX alone', () => {
    const html = sanitizeHtml(`<p>Euler: ${inline('e^{i\\pi} + 1 = 0')}.</p>${block('\\sum_{i=1}^n i')}`)
    expect(html).toBe('<p>Euler: <span data-math="e^{i\\pi} + 1 = 0" data-display="inline"></span>.</p><p><span data-math="\\sum_{i=1}^n i" data-display="block"></span></p>')
  })

  it('written back as $…$ and a $$ block; an error’s TeX too', () => {
    const html = sanitizeHtml(`<p>Area ${inline('\\pi r^2')} here.</p>${block('a^2 + b^2 = c^2')}<p>Bad ${inline('\\nope')}</p>`)
    expect(htmlToMarkdown(html)).toBe('Area $\\pi r^2$ here.\n\n$$\na^2 + b^2 = c^2\n$$\n\nBad $\\nope$')
  })

  it('the editor draws the islands, and gives out only their TeX', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const editor = new EditorController(host, {})
    editor.setContent(`<p>x ${inline('x^2')}</p>`)
    const island = host.querySelector<HTMLElement>('span[data-math]')!
    expect(island.querySelector('math')).not.toBeNull()
    expect(island.getAttribute('contenteditable')).toBe('false')
    expect(editor.getHTML()).toBe('<p>x <span data-math="x^2" data-display="inline"></span></p>')
    // A changed TeX is drawn again.
    island.setAttribute('data-math', 'y^3')
    syncMath(host)
    expect(island.querySelector('annotation')?.textContent).toBe('y^3')
    editor.destroy()
    host.remove()
  })

  it('insertMath: a displayed formula in place of an empty paragraph, an inline one at the caret', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const editor = new EditorController(host, {})
    editor.setContent('<p><br></p>')
    const range = document.createRange()
    range.setStart(host.querySelector('p')!, 0)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    editor.chain().insertMath('\\int_0^1 x\\,dx', true).run()
    expect(htmlToMarkdown(editor.getHTML())).toBe('$$\n\\int_0^1 x\\,dx\n$$')
    editor.destroy()
    host.remove()
  })

  it('dollars and == in plain text: escaped only where they would be read as markup', () => {
    expect(htmlToMarkdown('<p>From $5 to $10</p>')).toBe('From $5 to $10')
    expect(htmlToMarkdown('<p>Typed $x$ here</p>')).toBe('Typed \\$x\\$ here')
    expect(htmlToMarkdown('<p>a == b, and ==this==</p>')).toBe('a == b, and \\==this==')
  })

  it('a highlight is written as ==text==', () => {
    expect(sanitizeHtml('<p>A <mark>marked</mark> word</p>')).toBe('<p>A <mark>marked</mark> word</p>')
    expect(htmlToMarkdown('<p>A <mark>marked</mark> word</p>')).toBe('A ==marked== word')
  })

  it('a formula’s drawing pasted from elsewhere carries no markup beyond the island', () => {
    const html = sanitizeHtml(`<math><semantics><mi onclick="x">a</mi><annotation encoding="application/x-tex">a" onclick="x</annotation></semantics></math>`)
    expect(html).toBe('<span data-math="a&quot; onclick=&quot;x" data-display="inline"></span>')
  })
})

describe('the browser’s placeholder <br>', () => {
  it('an empty paragraph and a <br> closing one are not hard breaks', () => {
    expect(htmlToMarkdown('<pre><code class="language-js">a</code></pre><p><br></p>')).toBe('```js\na\n```')
    expect(htmlToMarkdown('<p>text<br></p>')).toBe('text')
    expect(htmlToMarkdown('<p>one<br>two</p>')).toBe('one\\\ntwo')
  })
})

describe('Markdown to the visual mode and back', () => {
  it('formulas, highlights and prices come back as written', async () => {
    const { renderMarkdown } = await import('@dskripchenko/ui')
    const md = 'Area $\\pi r^2$ and ==this== for $5 or $10.\n\n$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$\n\nAfter.'
    expect(htmlToMarkdown(sanitizeHtml(renderMarkdown(md)))).toBe(md)
  })
})
