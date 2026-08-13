/**
 * htmlToMarkdown converts the editor's HTML into Markdown.
 *
 * What is supported:
 *   - p             → the text plus a double line break
 *   - h1/h2/h3      → `# ` / `## ` / `### `
 *   - strong/b      → `**text**`
 *   - em/i          → `*text*`
 *   - u             → `<u>text</u>` (not part of standard MD, so HTML is emitted)
 *   - s/strike/del  → `~~text~~`
 *   - code (inline) → `` `text` ``
 *   - pre/code      → fenced ```
 *   - ul/ol/li      → `- ` / `1. ` (without nesting — a simplification)
 *   - blockquote    → `> ...`
 *   - a             → `[text](href)`
 *   - img           → `![alt](src)`
 *   - hr            → `---`
 *   - br            → `\n`
 *
 * Not supported: lists nested deeper than one level, tables, mark/sup/sub.
 */
export function htmlToMarkdown(html: string): string {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  return walkNodes(root.childNodes).trim()
}

function walkNodes(nodes: NodeListOf<ChildNode> | ChildNode[]): string {
  let out = ''
  for (const n of Array.from(nodes)) {
    out += renderNode(n)
  }
  return out
}

function renderNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText((node as Text).data)
  }
  if (! (node instanceof HTMLElement)) return ''

  const tag = node.tagName.toLowerCase()
  const inner = walkNodes(node.childNodes)

  switch (tag) {
    case 'p':
      return inner.trim() === '' ? '' : `${inner}\n\n`
    case 'h1': return `# ${inner}\n\n`
    case 'h2': return `## ${inner}\n\n`
    case 'h3': return `### ${inner}\n\n`

    case 'strong':
    case 'b':
      return `**${inner}**`
    case 'em':
    case 'i':
      return `*${inner}*`
    case 'u':
      return `<u>${inner}</u>`
    case 's':
    case 'strike':
    case 'del':
      return `~~${inner}~~`

    case 'code': {
      // A <code> inside a <pre> is handled by the parent pre.
      const parentTag = node.parentElement?.tagName.toLowerCase()
      if (parentTag === 'pre') return inner
      return `\`${inner}\``
    }
    case 'pre': {
      // pre > code → fenced.
      const codeChild = node.querySelector('code')
      const content = codeChild ? codeChild.textContent ?? '' : node.textContent ?? ''
      return `\`\`\`\n${content.replace(/\n$/, '')}\n\`\`\`\n\n`
    }

    case 'ul':
      return walkList(node, '- ') + '\n'
    case 'ol':
      return walkList(node, '1. ') + '\n'
    case 'li':
      // Handled through walkList; on its own this is the fallback.
      return inner

    case 'blockquote':
      return inner
        .split('\n')
        .map((l) => (l.trim() === '' ? '>' : `> ${l}`))
        .join('\n') + '\n\n'

    case 'a': {
      const href = node.getAttribute('href') ?? ''
      const title = node.getAttribute('title')
      const titleSuffix = title ? ` "${title.replace(/"/g, '\\"')}"` : ''
      return `[${inner}](${href}${titleSuffix})`
    }
    case 'img': {
      const src = node.getAttribute('src') ?? ''
      const alt = node.getAttribute('alt') ?? ''
      return `![${alt}](${src})`
    }

    case 'hr':
      return `---\n\n`
    case 'br':
      return `\n`

    case 'span':
    case 'div':
      return inner
  }
  return inner
}

function walkList(list: HTMLElement, marker: string): string {
  const items: string[] = []
  let counter = 1
  for (const child of Array.from(list.children)) {
    if (child.tagName.toLowerCase() !== 'li') continue
    const inner = walkNodes(child.childNodes).trim()
    const m = marker === '1. ' ? `${counter}. ` : marker
    items.push(`${m}${inner}`)
    counter++
  }
  return items.join('\n')
}

function escapeText(text: string): string {
  // The Markdown characters are escaped in plain text so that a reverse
  // conversion produces no false positives.
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1')
}
