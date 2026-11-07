import { describe, expect, it } from 'vitest'
import { EditorController } from '../engine'
import { syncBlockIds } from '../engine/blockIds'
import { htmlToMarkdown } from '../engine/htmlToMarkdown'
import { sanitizeHtml } from '../engine/sanitize'

describe('block ids through the visual mode', () => {
  it('a trailing ^id written as text becomes an island holding the id', () => {
    expect(sanitizeHtml('<p>Pay by the fifth. ^pay-rule</p>')).toBe('<p>Pay by the fifth.<span data-block-id="pay-rule"></span></p>')
    expect(sanitizeHtml('<h2>Goals ^goals</h2>')).toBe('<h2>Goals<span data-block-id="goals"></span></h2>')
    expect(sanitizeHtml('<table><tbody><tr><td>cell ^c1</td></tr></tbody></table>')).toContain('<td>cell<span data-block-id="c1"></span></td>')
  })

  it('in a list item the id ends the item’s own line, before a nested list', () => {
    expect(sanitizeHtml('<ul><li>first ^li-1<ul><li>inner ^in2</li></ul></li></ul>'))
      .toBe('<ul><li>first<span data-block-id="li-1"></span><ul><li>inner<span data-block-id="in2"></span></li></ul></li></ul>')
  })

  it('takes the ids the kit’s renderer put on blocks as attributes', () => {
    expect(sanitizeHtml('<p id="^pay" data-block-id="pay">Pay.</p>')).toBe('<p>Pay.<span data-block-id="pay"></span></p>')
    expect(sanitizeHtml('<h2 id="goals" data-block-id="g1"><a class="uid-markdown__block-anchor" id="^g1" aria-hidden="true"></a>Goals</h2>'))
      .toBe('<h2>Goals<span data-block-id="g1"></span></h2>')
  })

  it('leaves what is not an id: no letter, no space before it, inside the text, too long', () => {
    for (const text of ['Year ^2026', 'x^2', 'a ^b c', `long ^${'a'.repeat(33)}`]) {
      expect(sanitizeHtml(`<p>${text}</p>`)).toBe(`<p>${text}</p>`)
    }
    expect(sanitizeHtml('<p>x<span data-block-id="no good"></span></p>')).toBe('<p>x<span></span></p>')
  })

  it('writes an island back as ` ^id` at the end of its block, one space before it', () => {
    expect(htmlToMarkdown('<p>Pay by the fifth.<span data-block-id="pay-rule"></span></p>')).toBe('Pay by the fifth. ^pay-rule')
    expect(htmlToMarkdown('<p>Trailing space   <span data-block-id="t1"></span></p>')).toBe('Trailing space ^t1')
    expect(htmlToMarkdown('<ul><li>first<span data-block-id="li-1"></span><ul><li>inner</li></ul></li></ul>')).toBe('- first ^li-1\n  - inner')
    expect(htmlToMarkdown('<h2>Goals<span data-block-id="goals"></span></h2>')).toBe('## Goals ^goals')
  })

  it('the editor draws an island as a quiet mark, keeps it last in its block, and gives out the id alone', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const editor = new EditorController(host, {})
    editor.setContent('<p>Pay by the fifth. ^pay-rule</p>')

    const island = host.querySelector<HTMLElement>('span[data-block-id]')!
    expect(island.textContent).toBe('^pay-rule')
    expect(island.getAttribute('contenteditable')).toBe('false')
    expect(island.classList.contains('dsk-block-id')).toBe(true)
    expect(editor.getHTML()).toBe('<p>Pay by the fifth.<span data-block-id="pay-rule"></span></p>')

    // Text typed after the mark: given out before it at once, and moved before it on sync.
    island.after(document.createTextNode(' Or the sixth.'))
    expect(htmlToMarkdown(editor.getHTML())).toBe('Pay by the fifth. Or the sixth. ^pay-rule')
    syncBlockIds(host)
    expect(host.querySelector('p')!.lastChild).toBe(island)

    editor.destroy()
    host.remove()
  })

  it('a round through the kit’s renderer keeps every id where it was', async () => {
    const { renderMarkdown } = await import('@dskripchenko/ui')
    const md = '## Goals ^goals\n\nPay by the fifth. ^pay-rule\n\n- first ^li-1\n- second\n\n> Quoted ^q1'
    // As the Markdown editor renders for the visual mode (ids left as text)…
    expect(htmlToMarkdown(sanitizeHtml(renderMarkdown(md, { blockIds: false })))).toBe(md)
    // …and as the kit renders by default (ids as attributes, lower case).
    expect(htmlToMarkdown(sanitizeHtml(renderMarkdown(md)))).toBe(md)
  })
})
