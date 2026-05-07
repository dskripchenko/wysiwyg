/**
 * HTML beautify/minify — для source-view editor'а.
 *
 * `beautifyHtml(html)` — добавляет переносы строк и indent между
 * блочными тегами (для удобного редактирования raw-HTML вручную).
 * Содержимое <pre> и <code class*="language-…"> сохраняется
 * как есть — внутри code/pre whitespace значимый.
 *
 * `minifyHtml(html)` — обратное преобразование: удаляет whitespace
 * между блочными тегами, чтобы в БД попадал компактный HTML.
 *
 * Реализация — DOMParser-based, без regex-monstrosity.
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
 * Render одного DOM-узла рекурсивно с indent'ом. Внутри PRESERVE_TAGS
 * (pre/code) контент остаётся нетронутым.
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

  // Inside preserve — нет переносов и indent'ов.
  if (preserve) {
    let inner = ''
    for (const child of Array.from(node.childNodes)) {
      inner += render(child, 0, true)
    }
    return block && ! insidePreserve ? `\n${pad}${openTag}${inner}${closeTag}` : `${openTag}${inner}${closeTag}`
  }

  // Если у block-элемента детей нет блочных — рендерим в одну строку
  // (так читабельнее: <li>текст</li>, <p>лорем ипсум</p>).
  const hasBlockChildren = Array.from(node.children).some(isBlock)
  if (block && ! hasBlockChildren) {
    let inner = ''
    for (const child of Array.from(node.childNodes)) {
      inner += render(child, 0, false)
    }
    return `\n${pad}${openTag}${inner}${closeTag}`
  }

  // Generic block: дети рендерятся с +1 indent, блок-теги на новых строках.
  if (block) {
    let inner = ''
    for (const child of Array.from(node.childNodes)) {
      inner += render(child, indent + 1, false)
    }
    return `\n${pad}${openTag}${inner}\n${pad}${closeTag}`
  }

  // Inline-тег — без переносов.
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
 * Удаляет whitespace-only text-nodes между блочными тегами. Внутри
 * pre/code/script/style whitespace оставляется. Возвращает
 * "компактный" HTML без переносов между `</p>` и `<p>`.
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
  // Идём в обратном порядке, чтобы безопасно удалять text-nodes.
  const children = Array.from(el.childNodes)
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child as Text).data
      if (/^\s+$/.test(text)) {
        const prev = child.previousSibling
        const next = child.nextSibling
        const prevIsBlockOrNull = prev === null || (prev instanceof Element && isBlock(prev))
        const nextIsBlockOrNull = next === null || (next instanceof Element && isBlock(next))
        // Удаляем whitespace-only text-node, если он граничит с
        // блочным элементом (или находится в начале/конце контейнера,
        // который сам блочный).
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
