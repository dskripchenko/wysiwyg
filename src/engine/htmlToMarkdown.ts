/**
 * htmlToMarkdown — конвертирует HTML editor'а в Markdown.
 *
 * Поддержка:
 *   - p             → текст + двойной перенос
 *   - h1/h2/h3      → `# ` / `## ` / `### `
 *   - strong/b      → `**text**`
 *   - em/i          → `*text*`
 *   - u             → `<u>text</u>` (не входит в стандарт MD; выводим HTML)
 *   - s/strike/del  → `~~text~~`
 *   - code (inline) → `` `text` ``
 *   - pre/code      → fenced ```
 *   - ul/ol/li      → `- ` / `1. ` (без вложенности — упрощение)
 *   - blockquote    → `> ...`
 *   - a             → `[text](href)`
 *   - img           → `![alt](src)`
 *   - hr            → `---`
 *   - br            → `\n`
 *
 * Не поддерживает: вложенные списки глубже 1 уровня, table, mark/sup/sub.
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
      // <code> внутри <pre> — обрабатывает родительский pre.
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
      // Обрабатывается через walkList; самостоятельно — fallback.
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
  // Экранируем символы Markdown в plain-тексте, чтобы при обратной
  // конвертации не было ложных срабатываний.
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1')
}
