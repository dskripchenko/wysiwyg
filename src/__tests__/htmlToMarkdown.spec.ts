import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@dskripchenko/ui'
import { htmlToMarkdown } from '../engine/htmlToMarkdown'
import { sanitizeHtml } from '../engine/sanitize'

/** Markdown → the kit's HTML → the editor's sanitized HTML → Markdown. */
const roundTrip = (md: string): string => htmlToMarkdown(sanitizeHtml(renderMarkdown(md)))

const CASES: Record<string, string> = {
  paragraphs: 'Version 1.5 costs $10 (net) - see a-b.\n\nSecond paragraph.',
  headings: '# One\n\n## Two\n\n### Three',
  emphasis: 'Some **bold**, *italic*, ~~gone~~ and `code` text.',
  backticks: 'Run ``a ` b`` now.',
  links: 'A [link](https://example.com/a_b "Title") and ![alt](/img.png).',
  escapes: 'A \\*not bold\\* and \\_not italic\\_, \\[not a link\\], 2 \\< 3.',
  lineStarts: '\\# not a heading\n\n\\- not a list\n\n1\\. not a list\n\n\\> not a quote',
  breaks: 'One line\\\nnext line',
  lists: '- one\n- two\n  - nested\n  - nested too\n- three',
  ordered: '1. first\n2. second\n3. third',
  quote: '> quoted **text**\n>\n> second paragraph',
  code: '```js\nconst a = `x`\n```',
  fence: '````md\n```js\ncode\n```\n````',
  table: '| Name | Price | Note |\n| :--- | ---: | :---: |\n| A | 1.5 | ok |\n| B \\| C | 2 | |',
  rule: 'Above\n\n---\n\nBelow',
  softWrap: 'A paragraph wrapped\nin the source, as editors wrap it,\nstays wrapped.\n\n> A quote\n> wrapped too.',
}

describe('htmlToMarkdown round trip', () => {
  for (const [name, md] of Object.entries(CASES)) {
    it(name, () => {
      const once = roundTrip(md)
      expect(once).toBe(md)
      expect(roundTrip(once)).toBe(once)
    })
  }

  it('keeps preview islands out and unknown wrappers transparent', () => {
    expect(htmlToMarkdown('<p>a</p><div data-dsk-preview="1"><svg></svg></div><span>b</span>')).toBe('a\n\nb')
  })

  it('a list item wrapped in the source stays wrapped, indented under its marker', () => {
    expect(htmlToMarkdown('<ul><li><strong>No installer.</strong> A zip on Windows and macOS, an\nAppImage on Linux.</li><li>two</li></ul>')).toBe('- **No installer.** A zip on Windows and macOS, an\n  AppImage on Linux.\n- two')
    expect(htmlToMarkdown('<ol><li>one\n  two</li></ol>')).toBe('1. one\n   two')
    // Spaces still collapse; a break at the start of a line that would mean markup is escaped.
    expect(htmlToMarkdown('<p>a   b\n- c</p>')).toBe('a b\n\\- c')
  })

  it('a paragraph inside a list item stays in the item', () => {
    expect(htmlToMarkdown('<ul><li><p>one</p><p>more</p></li><li>two</li></ul>')).toBe('- one\n\n  more\n\n- two')
  })
})
