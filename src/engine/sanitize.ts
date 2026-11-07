/**
 * sanitizeHtml brings arbitrary HTML (from the Word or Google Docs clipboard,
 * for instance) into a neutral shape:
 *   - it removes the style attributes, the on* handlers, the classes, the ids
 *     and the data-*;
 *   - it removes the unwanted tags (script/iframe/object/embed/style/meta/link);
 *   - the tag whitelist is p/h1-h3/strong/em/u/s/code/pre/ul/ol/li/blockquote/
 *     a/img/br/hr/span (span without attributes, kept for neutral grouping);
 *   - the br tags inside a p are preserved (for shift+enter);
 *   - a task item — a checkbox opening a list item, as Markdown renderers and
 *     GitHub write one — becomes `<li data-checked="true|false">`.
 *
 * For safety all of the work goes through DOMParser (not through innerHTML on a
 * live DOM), so that an <img onerror=...> is never executed.
 *
 * A host whose content carries markers of its own — `<img data-signature="…">`
 * that it swaps for a picture and back, say — lists them in
 * `allowedAttributes`; without it they would be stripped on every setContent.
 * The on* handlers are never allowed, whatever the list says.
 */

import { mathToIslands } from './mathIslands'
import { BLOCK_ID_ATTR, blockIdsToIslands, isBlockId } from './blockIds'

/** Extra attributes kept per tag, on top of the built-in whitelist. */
export type AllowedAttributes = Record<string, readonly string[]>

export interface SanitizeOptions {
  allowedAttributes?: AllowedAttributes
}

const ALLOWED_TAGS = new Set([
  'p',
  'h1', 'h2', 'h3',
  'strong', 'b',
  'em', 'i',
  'u',
  's', 'strike', 'del',
  'mark',
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
  // data-checked: a task item ("true" or "false"), written back as `- [x]` / `- [ ]`.
  li: new Set(['data-checked']),
  // data-wikilink: an internal link ([[note]]), written back as one.
  a: new Set(['href', 'target', 'rel', 'title', 'data-wikilink', 'class']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  // The language-* class on a <code> is needed for the syntax highlight;
  // dsk-tok-* on a <span> is needed to render the tokens.
  code: new Set(['class']),
  // data-math: a formula island (its TeX), data-display: inline or block.
  // data-block-id: a block id island (` ^id` at the end of the block).
  span: new Set(['class', 'data-math', 'data-display', 'data-tag', 'data-embed', 'data-block-id']),
}

/** The whitelist of class prefixes preserved on code and span. */
const ALLOWED_CLASS_PREFIXES = ['language-', 'dsk-tok-', 'uid-markdown__wikilink', 'uid-markdown__tag', 'uid-markdown__embed']

export function sanitizeHtml(input: string, options: SanitizeOptions = {}): string {
  if (typeof DOMParser === 'undefined') return input
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  // The editor's own preview islands (copied along with a diagram) are
  // dropped whole: unwrapped, their SVG labels would turn into stray text.
  for (const island of Array.from(root.querySelectorAll('[data-dsk-preview]'))) island.remove()
  // Drawn formulas (MathML with its TeX) become islands holding the TeX alone.
  mathToIslands(root)
  // Block ids (` ^id`, or the renderer's attributes) become islands holding the id alone.
  blockIdsToIslands(root)
  tasksToItems(root)
  cleanNode(root, options.allowedAttributes ?? {})
  return root.innerHTML
}

/**
 * A list item opened by a checkbox (in the item, or in its first paragraph):
 * the box becomes the item's `data-checked`, the box itself goes.
 */
function tasksToItems(root: Element): void {
  for (const li of Array.from(root.querySelectorAll('li'))) {
    let first: ChildNode | null = li.firstChild
    // Past blank text and into a paragraph that opens the item.
    while (first && first.nodeType === Node.TEXT_NODE && (first.textContent ?? '').trim() === '') first = first.nextSibling
    if (first instanceof Element && first.tagName === 'P') {
      let inner: ChildNode | null = first.firstChild
      while (inner && inner.nodeType === Node.TEXT_NODE && (inner.textContent ?? '').trim() === '') inner = inner.nextSibling
      first = inner
    }
    if (!(first instanceof Element) || first.tagName !== 'INPUT' || (first.getAttribute('type') ?? '').toLowerCase() !== 'checkbox') {
      if (li.hasAttribute('data-checked')) li.setAttribute('data-checked', li.getAttribute('data-checked') === 'true' ? 'true' : 'false')
      continue
    }
    li.setAttribute('data-checked', first.hasAttribute('checked') ? 'true' : 'false')
    // The space after the box was the separator, not text.
    const next = first.nextSibling
    if (next && next.nodeType === Node.TEXT_NODE) next.textContent = (next.textContent ?? '').replace(/^\s+/, '')
    first.remove()
  }
}

function cleanNode(node: Element, extra: AllowedAttributes): void {
  // The attributes outside the whitelist of the particular tag are removed.
  const tag = node.tagName.toLowerCase()
  const allowed = new Set<string>([...(ALLOWED_ATTRS[tag] ?? []), ...(extra[tag] ?? [])])
  // A table cell keeps its alignment (text-align), and nothing else of its style.
  if ((tag === 'td' || tag === 'th') && node.hasAttribute('style')) {
    const align = /(?:^|;)\s*text-align\s*:\s*(left|center|right)\b/i.exec(node.getAttribute('style') ?? '')?.[1]
    if (align) node.setAttribute('style', `text-align:${align.toLowerCase()}`)
    else node.removeAttribute('style')
  }
  for (const attr of Array.from(node.attributes)) {
    if ((tag === 'td' || tag === 'th') && attr.name === 'style') continue
    if (! allowed.has(attr.name) || /^on/i.test(attr.name)) {
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
    // A block id island keeps only a well-formed id.
    if (attr.name === BLOCK_ID_ATTR && !isBlockId(attr.value)) {
      node.removeAttribute(attr.name)
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
    cleanNode(child, extra)
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
