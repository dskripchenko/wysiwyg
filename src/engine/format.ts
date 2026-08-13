/**
 * The HTML beautify and minify used by the editor's source view.
 *
 * `beautifyHtml(html)` adds line breaks and indentation between the block tags
 * (so that raw HTML is comfortable to edit by hand). The contents of <pre> and
 * <code class*="language-..."> are preserved as they are — inside code and pre
 * the whitespace is significant.
 *
 * `minifyHtml(html)` is the reverse: it removes the whitespace between the block
 * tags so that compact HTML reaches the database.
 *
 * The implementation is DOMParser-based, without any regex monstrosity.
 */

const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre',
  'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption', 'section', 'article',
  'header', 'footer', 'nav', 'main', 'aside',
])

const VOID_TAGS = new Set([
  'br', 'hr', 'img', 'input', 'meta', 'link',
])

const PRESERVE_TAGS = new Set(['pre', 'code', 'script', 'style', 'textarea'])

function isBlock(el: Element): boolean {
  return BLOCK_TAGS.has(el.tagName.toLowerCase())
}

/**
 * Renders one DOM node recursively, with indentation. Inside PRESERVE_TAGS
 * (pre/code) the content is left untouched.
 */
function render(node: Node, indent: number, insidePreserve: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node as Text).data
    return insidePreserve ? text : text
  }
  if (! (node instanceof Element)) return ''

  const tag = node.tagName.toLowerCase()
  const block = isBlock(node)
  const preserve = insidePreserve || PRESERVE_TAGS.has(tag)
  const pad = '  '.repeat(indent)

  // Open tag string with attributes.
  let openTag = `<${tag}`
  for (const attr of Array.from(node.attributes)) {
    openTag += ` ${attr.name}="${escapeAttr(attr.value)}"`
  }

  if (VOID_TAGS.has(tag)) {
    return block && ! insidePreserve ? `\n${pad}${openTag}>` : `${openTag}>`
  }
  openTag += '>'
  const closeTag = `</${tag}>`

  // Inside a preserved tag there are no line breaks and no indentation.
  if (preserve) {
    let inner = ''
    for (const child of Array.from(node.childNodes)) {
      inner += render(child, 0, true)
    }
    return block && ! insidePreserve ? `\n${pad}${openTag}${inner}${closeTag}` : `${openTag}${inner}${closeTag}`
  }

  // When a block element has no block children we render it on one line (that
  // reads better: <li>text</li>, <p>lorem ipsum</p>).
  const hasBlockChildren = Array.from(node.children).some(isBlock)
  if (block && ! hasBlockChildren) {
    let inner = ''
    for (const child of Array.from(node.childNodes)) {
      inner += render(child, 0, false)
    }
    return `\n${pad}${openTag}${inner}${closeTag}`
  }

  // A generic block: the children are rendered one indent deeper, the block tags on new lines.
  if (block) {
    let inner = ''
    for (const child of Array.from(node.childNodes)) {
      inner += render(child, indent + 1, false)
    }
    return `\n${pad}${openTag}${inner}\n${pad}${closeTag}`
  }

  // An inline tag — no line breaks.
  let inner = ''
  for (const child of Array.from(node.childNodes)) {
    inner += render(child, indent, false)
  }
  return `${openTag}${inner}${closeTag}`
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;')
}

export function beautifyHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(`<div id="__beautify-root">${html}</div>`, 'text/html')
  const root = doc.getElementById('__beautify-root')
  if (! root) return html
  let out = ''
  for (const child of Array.from(root.childNodes)) {
    out += render(child, 0, false)
  }
  return out.replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n')
}

/**
 * Removes the whitespace-only text nodes between the block tags. Inside
 * pre/code/script/style the whitespace is kept. Returns "compact" HTML with no
 * line breaks between `</p>` and `<p>`.
 */
export function minifyHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return html
  const doc = new DOMParser().parseFromString(`<div id="__minify-root">${html}</div>`, 'text/html')
  const root = doc.getElementById('__minify-root')
  if (! root) return html
  cleanWhitespace(root)
  return root.innerHTML
}

function cleanWhitespace(el: Element): void {
  if (PRESERVE_TAGS.has(el.tagName.toLowerCase())) return
  // We walk in reverse order so that the text nodes can be deleted safely.
  const children = Array.from(el.childNodes)
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child as Text).data
      if (/^\s+$/.test(text)) {
        const prev = child.previousSibling
        const next = child.nextSibling
        const prevIsBlockOrNull = prev === null || (prev instanceof Element && isBlock(prev))
        const nextIsBlockOrNull = next === null || (next instanceof Element && isBlock(next))
        // A whitespace-only text node is deleted when it borders a block
        // element (or sits at the start or the end of a container that is
        // itself a block).
        if (prevIsBlockOrNull && nextIsBlockOrNull) {
          child.remove()
        } else if ((prevIsBlockOrNull && next === null) || (prev === null && nextIsBlockOrNull)) {
          child.remove()
        }
      }
    } else if (child instanceof Element) {
      cleanWhitespace(child)
    }
  }
}
