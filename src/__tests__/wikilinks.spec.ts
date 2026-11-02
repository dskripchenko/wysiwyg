import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@dskripchenko/ui'
import { htmlToMarkdown } from '../engine/htmlToMarkdown'
import { sanitizeHtml } from '../engine/sanitize'

const roundTrip = (md: string): string => htmlToMarkdown(sanitizeHtml(renderMarkdown(md)))

describe('internal links through the visual mode', () => {
  it('[[note]], with a heading, with a text of its own: written back as they were', () => {
    for (const md of ['See [[Plans]] today.', 'A [[Road map#Next steps]] and [[Road map#Next steps|what is next]].', 'Here: [[#Intro]].']) expect(roundTrip(md)).toBe(md)
  })

  it('the link’s text changed in the editor: kept as its own text', () => {
    expect(htmlToMarkdown('<p><a href="Plans.md" data-wikilink="Plans">our plans</a></p>')).toBe('[[Plans|our plans]]')
  })

  it('[[note]] typed as text is not escaped; other brackets are', () => {
    expect(htmlToMarkdown('<p>Typed [[New note]] and [x]</p>')).toBe('Typed [[New note]] and \\[x\\]')
  })

  it('the sanitizer keeps what an internal link needs, nothing more', () => {
    const html = sanitizeHtml('<a href="a.md" class="uid-markdown__wikilink evil" data-wikilink="a" onclick="x">a</a>')
    expect(html).toContain('class="uid-markdown__wikilink" data-wikilink="a"')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('evil')
  })
})
