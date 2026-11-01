import { describe, expect, it } from 'vitest'
import { highlight } from '../engine/highlight'

const text = (html: string): string => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

describe('highlight', () => {
  it('tokens as dsk-tok-* spans; the text unchanged', () => {
    const html = highlight('const x = 42 // n', 'js')
    expect(html).toContain('<span class="dsk-tok-keyword">const</span>')
    expect(html).toContain('<span class="dsk-tok-number">42</span>')
    expect(html).toContain('<span class="dsk-tok-comment">// n</span>')
    expect(text(html)).toBe('const x = 42 // n')
  })

  it('languages beyond the old eight, and aliases', () => {
    expect(highlight('fn main() {}', 'rust')).toContain('dsk-tok-keyword')
    expect(highlight('SELECT 1', 'postgresql')).toContain('<span class="dsk-tok-keyword">SELECT</span>')
    expect(highlight('a: 1', 'yml')).toContain('<span class="dsk-tok-attr">a</span>')
  })

  it('markup escaped; an unknown language plain', () => {
    expect(highlight('<b>&</b>', 'html')).not.toContain('<b>')
    expect(text(highlight('<b>&</b>', 'html'))).toBe('<b>&</b>')
    expect(highlight('<b>', 'nope')).toBe('&lt;b&gt;')
    expect(highlight('<b>')).toBe('&lt;b&gt;')
  })
})
