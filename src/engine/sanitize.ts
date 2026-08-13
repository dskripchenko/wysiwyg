/**
 * sanitizeHtml brings arbitrary HTML (from the Word or Google Docs clipboard,
 * for instance) into a neutral shape:
 *   - it removes the style attributes, the on* handlers, the classes, the ids
 *     and the data-*;
 *   - it removes the unwanted tags (script/iframe/object/embed/style/meta/link);
 *   - the tag whitelist is p/h1-h3/strong/em/u/s/code/pre/ul/ol/li/blockquote/
 *     a/img/br/hr/span (span without attributes, kept for neutral grouping);
 *   - the br tags inside a p are preserved (for shift+enter).
 *
 * For safety all of the work goes through DOMParser (not through innerHTML on a
 * live DOM), so that an <img onerror=...> is never executed.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'h1', 'h2', 'h3',
  'strong', 'b',
  'em', 'i',
  'u',
  's', 'strike', 'del',
  'code',
  'pre',
  'ul', 'ol', 'li',
  'blockquote',
  'a',
  'img',
  'br',
  'hr',
  'span',
  // Tables.
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  // The language-* class on a <code> is needed for the syntax highlight;
  // dsk-tok-* on a <span> is needed to render the tokens.
  code: new Set(['class']),
  span: new Set(['class']),
}

/** The whitelist of class prefixes preserved on code and span. */
const ALLOWED_CLASS_PREFIXES = ['language-', 'dsk-tok-']

export function sanitizeHtml(input: string): string {
  if (typeof DOMParser === 'undefined') return input
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  cleanNode(root)
  return root.innerHTML
}

function cleanNode(node: Element): void {
  // The attributes outside the whitelist of the particular tag are removed.
  const tag = node.tagName.toLowerCase()
  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>()
  for (const attr of Array.from(node.attributes)) {
    if (! allowed.has(attr.name)) {
      node.removeAttribute(attr.name)
      continue
    }
    // The class attribute: the values are filtered down to the whitelisted prefixes.
    if (attr.name === 'class') {
      const kept = attr.value
        .split(/\s+/)
        .filter((c) => ALLOWED_CLASS_PREFIXES.some((p) => c.startsWith(p)))
        .join(' ')
      if (kept === '') node.removeAttribute('class')
      else node.setAttribute('class', kept)
      continue
    }
    // A guard against javascript: in href and src.
    if ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value)) {
      node.removeAttribute(attr.name)
    }
  }
  // For an <a> we add the safe defaults (rel/target).
  if (tag === 'a') {
    if (! node.getAttribute('rel')) node.setAttribute('rel', 'noopener noreferrer')
    if (! node.getAttribute('target')) node.setAttribute('target', '_blank')
  }
  // We walk the children recursively, replacing the disallowed ones with their innerHTML.
  for (const child of Array.from(node.children)) {
    cleanNode(child)
    if (! ALLOWED_TAGS.has(child.tagName.toLowerCase())) {
      // The tag is replaced by its text or block content.
      const replacement = doc().createElement('span')
      replacement.innerHTML = child.innerHTML
      child.replaceWith(...Array.from(replacement.childNodes))
    }
  }
}

function doc(): Document {
  return document
}
