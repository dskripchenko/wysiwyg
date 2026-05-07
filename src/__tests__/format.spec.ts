import { describe, expect, it } from 'vitest'
import { beautifyHtml, minifyHtml } from '../engine/format'

describe('beautifyHtml', () => {
  it('добавляет переносы между блочными тегами', () => {
    const out = beautifyHtml('<h1>Title</h1><p>Body</p>')
    expect(out).toContain('<h1>Title</h1>\n')
    expect(out).toContain('\n<p>Body</p>')
  })

  it('идентирует вложенные блоки', () => {
    const out = beautifyHtml('<ul><li>a</li><li>b</li></ul>')
    expect(out).toMatch(/<ul>\n  <li>a<\/li>\n  <li>b<\/li>\n<\/ul>/)
  })

  it('сохраняет содержимое <pre> как есть', () => {
    const out = beautifyHtml('<pre><code>line1\n  line2</code></pre>')
    // Внутри pre/code — никакого переформатирования.
    expect(out).toContain('line1\n  line2')
  })

  it('inline-теги остаются на одной строке', () => {
    const out = beautifyHtml('<p>Hello <strong>world</strong>!</p>')
    expect(out).toContain('<p>Hello <strong>world</strong>!</p>')
    expect(out).not.toMatch(/<strong>\n/)
  })
})

describe('minifyHtml', () => {
  it('удаляет whitespace между блочными тегами', () => {
    const beautified = '<h1>Title</h1>\n<p>Body</p>\n<ul>\n  <li>x</li>\n</ul>'
    expect(minifyHtml(beautified)).toBe('<h1>Title</h1><p>Body</p><ul><li>x</li></ul>')
  })

  it('сохраняет whitespace внутри inline-контента', () => {
    const html = '<p>Hello <strong>world</strong>!</p>'
    expect(minifyHtml(html)).toBe(html)
  })

  it('не трогает содержимое <pre>', () => {
    const html = '<pre><code>line1\n  line2</code></pre>'
    expect(minifyHtml(html)).toContain('line1\n  line2')
  })

  it('beautify → minify даёт исходный HTML', () => {
    const original = '<h1>T</h1><p>p</p><ul><li>a</li><li>b</li></ul>'
    expect(minifyHtml(beautifyHtml(original))).toBe(original)
  })
})
