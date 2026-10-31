/**
 * htmlToMarkdown converts the editor's HTML into Markdown (CommonMark + GFM
 * tables and strikethrough), so that converting the result back gives the
 * same document:
 *
 *   - p                → the text, a blank line after it
 *   - h1…h6            → `#` … `######`
 *   - strong/b, em/i   → `**text**`, `*text*`
 *   - s/strike/del     → `~~text~~`
 *   - u, mark, sup, sub → the HTML element itself (Markdown has none)
 *   - code (inline)    → `` `text` `` (longer ticks when the text has some)
 *   - pre/code         → a fenced block with the `language-X` class's language,
 *                        the fence longer than any run of backticks inside
 *   - ul/ol/li         → `- ` / `1. `, nested by indentation; several
 *                        paragraphs in an item stay in it
 *   - blockquote       → `> `, nested quotes too
 *   - table            → a GFM table, the column alignment from text-align
 *   - a, img           → `[text](href "title")`, `![alt](src "title")`
 *   - hr               → `---`
 *   - br               → a hard break (`\` at the end of the line)
 *
 * Text is escaped only where a character would otherwise mean markup: `*`,
 * `_`, `` ` ``, `[`, `]`, `<`, `\`, and a `#`, `>`, `-`, `+` or `1.` that would
 * start a block at the beginning of a line. Plain text keeps its dots,
 * dashes and brackets.
 */
export function htmlToMarkdown(html: string): string {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  return blocks(root).replace(/\n{3,}/g, '\n\n').trim()
}

const BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'ul', 'ol', 'blockquote', 'hr', 'table', 'div'])

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE
}

function tagOf(node: Node): string {
  return isElement(node) ? node.tagName.toLowerCase() : ''
}

/** Block content: each block followed by a blank line; inline runs between blocks become paragraphs. */
function blocks(parent: Node): string {
  let out = ''
  let inline = ''
  const flush = (): void => {
    const text = inline.trim()
    if (text) out += `${escapeLineStarts(text)}\n\n`
    inline = ''
  }
  for (const node of Array.from(parent.childNodes)) {
    if (isElement(node) && node.hasAttribute('data-dsk-preview')) continue
    if (BLOCK.has(tagOf(node))) {
      flush()
      out += block(node as HTMLElement)
    } else {
      inline += inlineOf(node)
    }
  }
  flush()
  return out
}

function block(node: HTMLElement): string {
  const tag = tagOf(node)
  switch (tag) {
    case 'p': {
      const text = inlineChildren(node).trim()
      return text === '' ? '' : `${escapeLineStarts(text)}\n\n`
    }
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const text = inlineChildren(node).replace(/\n+/g, ' ').trim()
      return text === '' ? '' : `${'#'.repeat(Number(tag[1]))} ${text}\n\n`
    }
    case 'pre':
      return `${fenced(node)}\n\n`
    case 'ul':
    case 'ol':
      return `${list(node)}\n\n`
    case 'blockquote': {
      const inner = blocks(node).trim()
      return `${inner.split('\n').map((l) => (l === '' ? '>' : `> ${l}`)).join('\n')}\n\n`
    }
    case 'hr':
      return '---\n\n'
    case 'table':
      return `${table(node)}\n\n`
    default:
      return blocks(node)
  }
}

function fenced(pre: HTMLElement): string {
  const code = pre.querySelector('code')
  const content = ((code ?? pre).textContent ?? '').replace(/\u200B/g, '').replace(/\n$/, '')
  const lang = code?.className.match(/(?:^|\s)language-([\w+#.-]+)/)?.[1] ?? ''
  const longest = Math.max(0, ...(content.match(/`+/g) ?? []).map((m) => m.length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}${lang}\n${content}\n${fence}`
}

function list(node: HTMLElement): string {
  const ordered = tagOf(node) === 'ol'
  let n = Number(node.getAttribute('start') ?? '1') || 1
  const items: string[] = []
  for (const li of Array.from(node.children)) {
    if (tagOf(li) !== 'li') continue
    const marker = ordered ? `${n++}. ` : '- '
    const pad = ' '.repeat(marker.length)
    const body = itemBody(li as HTMLElement)
    const lines = body.split('\n')
    items.push(marker + lines[0] + (lines.length > 1 ? '\n' + lines.slice(1).map((l) => (l === '' ? '' : pad + l)).join('\n') : ''))
  }
  // A list whose items hold several blocks is a loose list: a blank line between items.
  const loose = items.some((i) => /\n\n/.test(i))
  return items.join(loose ? '\n\n' : '\n')
}

/**
 * A list item: text with lists nested in it stays tight (the nested list on
 * the next line); an item with paragraphs or other blocks is written as
 * blocks.
 */
function itemBody(li: HTMLElement): string {
  const children = Array.from(li.childNodes).filter((n) => !(isElement(n) && n.hasAttribute('data-dsk-preview')))
  const tight = children.every((n) => !BLOCK.has(tagOf(n)) || tagOf(n) === 'ul' || tagOf(n) === 'ol')
  if (!tight) return blocks(li).trim()
  let text = ''
  const nested: string[] = []
  for (const n of children) {
    if (tagOf(n) === 'ul' || tagOf(n) === 'ol') nested.push(list(n as HTMLElement))
    else text += inlineOf(n)
  }
  return [escapeLineStarts(text.trim()), ...nested].filter((x) => x !== '').join('\n')
}

function table(node: HTMLElement): string {
  const rows = Array.from(node.querySelectorAll('tr')).filter((tr) => tr.closest('table') === node)
  if (rows.length === 0) return ''
  const cells = rows.map((tr) => Array.from(tr.children).filter((c) => /^t[hd]$/.test(tagOf(c))) as HTMLElement[])
  const width = Math.max(...cells.map((r) => r.length))
  const text = (cell: HTMLElement | undefined): string => (cell ? inlineChildren(cell).replace(/\n+/g, ' ').trim().replace(/\|/g, '\\|') : '')
  const align = (cell: HTMLElement | undefined): string => {
    const a = (cell?.style.textAlign || cell?.getAttribute('align') || '').toLowerCase()
    return a === 'center' ? ':---:' : a === 'right' ? '---:' : a === 'left' ? ':---' : '---'
  }
  const row = (values: string[]): string => `|${values.map((v) => (v === '' ? ' ' : ` ${v} `)).join('|')}|`
  const line = (r: HTMLElement[]): string => row(Array.from({ length: width }, (_, i) => text(r[i])))
  const head = cells[0]
  return [line(head), row(Array.from({ length: width }, (_, i) => align(head[i]))), ...cells.slice(1).map(line)].join('\n')
}

function inlineChildren(node: Node): string {
  let out = ''
  for (const child of Array.from(node.childNodes)) out += inlineOf(child)
  return out
}

function inlineOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeInline((node as Text).data.replace(/\u200B/g, '').replace(/\s+/g, ' '))
  if (!isElement(node) || node.hasAttribute('data-dsk-preview')) return ''
  const tag = tagOf(node)
  const inner = (): string => inlineChildren(node)
  const wrap = (mark: string): string => {
    const text = inner()
    if (text.trim() === '') return text
    // Emphasis must hug its text: spaces go outside the markers.
    const lead = text.match(/^\s*/)![0]
    const trail = text.match(/\s*$/)![0]
    return `${lead}${mark}${text.trim()}${mark}${trail}`
  }
  switch (tag) {
    case 'strong': case 'b': return wrap('**')
    case 'em': case 'i': return wrap('*')
    case 's': case 'strike': case 'del': return wrap('~~')
    case 'u': case 'mark': case 'sup': case 'sub': return `<${tag}>${inner()}</${tag}>`
    case 'code': {
      const text = node.textContent ?? ''
      const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((m) => m.length))
      const ticks = '`'.repeat(longest + 1)
      const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
      return `${ticks}${pad}${text}${pad}${ticks}`
    }
    case 'a': {
      const href = (node.getAttribute('href') ?? '').replace(/[()\s]/g, (c) => encodeURIComponent(c))
      const title = node.getAttribute('title')
      return `[${inner()}](${href}${title ? ` "${title.replace(/"/g, '\\"')}"` : ''})`
    }
    case 'img': {
      const src = (node.getAttribute('src') ?? '').replace(/[()\s]/g, (c) => encodeURIComponent(c))
      const alt = (node.getAttribute('alt') ?? '').replace(/[[\]]/g, '\\$&')
      const title = node.getAttribute('title')
      return `![${alt}](${src}${title ? ` "${title.replace(/"/g, '\\"')}"` : ''})`
    }
    case 'br':
      return '\\\n'
    default:
      return inner()
  }
}

/** Characters that would start markup anywhere in a line. */
function escapeInline(text: string): string {
  return text.replace(/[\\`*_[\]<]/g, '\\$&').replace(/~~/g, '\\~\\~')
}

/** A block marker at the start of a line of plain text: `#`, `>`, `-`, `+`, `1.`, `---`. */
function escapeLineStarts(text: string): string {
  return text
    .split('\n')
    .map((line) => line
      .replace(/^(\s*)([#>+])/, '$1\\$2')
      .replace(/^(\s*)-(\s|$)/, '$1\\-$2')
      .replace(/^(\s*)(\d+)([.)])(\s|$)/, '$1$2\\$3$4')
      .replace(/^(\s*)(=+|-{3,})\s*$/, '$1\\$2'))
    .join('\n')
}
