import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '../engine/sanitize'

describe('sanitizeHtml', () => {
  it('strips script tags entirely', () => {
    const html = '<p>OK</p><script>alert(1)</script>'
    const out = sanitizeHtml(html)
    expect(out).not.toContain('script')
    expect(out).toContain('OK')
  })

  it('removes inline style/class attributes', () => {
    const html = '<p style="color: red" class="x">Text</p>'
    const out = sanitizeHtml(html)
    expect(out).toContain('<p>Text</p>')
    expect(out).not.toContain('style')
    expect(out).not.toContain('class')
  })

  it('keeps href on <a> + adds rel/target', () => {
    const html = '<a href="https://x.com">link</a>'
    const out = sanitizeHtml(html)
    expect(out).toContain('href="https://x.com"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
  })

  it('rejects javascript: URLs', () => {
    // eslint-disable-next-line no-script-url
    const html = '<a href="javascript:alert(1)">x</a>'
    const out = sanitizeHtml(html)
    expect(out).not.toContain('javascript:')
  })

  it('keeps allowed marks (strong/em/code) and unwraps disallowed (font)', () => {
    const html = '<p><strong>bold</strong> <font color="red">x</font></p>'
    const out = sanitizeHtml(html)
    expect(out).toContain('<strong>bold</strong>')
    expect(out).not.toContain('font')
    expect(out).toContain('x')
  })
})
