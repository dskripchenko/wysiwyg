/**
 * The editor's commands — our own implementation on top of the Selection and
 * Range APIs. We do not use `document.execCommand` (deprecated, with unstable
 * behaviour across browsers).
 *
 * Every command:
 *   1. gets a Range inside the host;
 *   2. applies a DOM mutation (toggling a tag around the range, replacing a
 *      block tag);
 *   3. restores the selection;
 *   4. emits a change through CustomEvent('input', {bubbles: true}) on the host,
 *      so that Vue's v-model picks it up.
 */
import {
  currentBlockTag,
  findAncestorAnchor,
  rangeWithinHost,
} from './selection'

function emitInput(host: HTMLElement): void {
  host.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }))
}

/* ------------------------------------------------------------------ */
/* Inline marks (bold / italic / underline / strike / code)            */
/* ------------------------------------------------------------------ */

/**
 * Toggles an inline mark around the current range. When the selection is empty
 * we create an empty mark (the cursor goes inside and further typing is marked).
 */
export function toggleInlineMark(host: HTMLElement, tag: string): void {
  const range = rangeWithinHost(host)
  if (!range) return

  if (range.collapsed) {
    const inside = nearestAncestor(range.startContainer, host, tag)
    if (inside) {
      // The caret is already inside an active mark — we "leave" it. The caret
      // goes right after the ancestor into a zero-width text node, so that
      // further typing lands next to the mark rather than inside it.
      const exit = document.createTextNode('​')
      inside.after(exit)
      const sel = window.getSelection()
      if (sel) {
        const r = document.createRange()
        r.setStart(exit, 1)
        r.collapse(true)
        sel.removeAllRanges()
        sel.addRange(r)
      }
      emitInput(host)
      return
    }
    // An empty mark at the caret: we insert <tag>&#8203;</tag> and put the
    // cursor inside so that typing applies to it. The ZWSP character is what
    // lets a browser place the cursor inside an empty inline.
    const el = document.createElement(tag)
    el.appendChild(document.createTextNode('​'))
    range.insertNode(el)
    const sel = window.getSelection()
    if (sel) {
      const r = document.createRange()
      r.setStart(el.firstChild!, 1)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
    }
    emitInput(host)
    return
  }

  // When the selection lies entirely inside a surrounding <tag>, the mark is removed.
  const ancestor = nearestAncestor(range.startContainer, host, tag)
  if (ancestor && ancestor.contains(range.endContainer)) {
    unwrapElement(ancestor)
    emitInput(host)
    return
  }

  // Otherwise the selection's content is wrapped into a <tag>.
  const wrapper = document.createElement(tag)
  try {
    wrapper.appendChild(range.extractContents())
    range.insertNode(wrapper)
    // Recreate selection inside wrapper.
    const sel = window.getSelection()
    if (sel) {
      const r = document.createRange()
      r.selectNodeContents(wrapper)
      sel.removeAllRanges()
      sel.addRange(r)
    }
  } catch {
    // The range spans several blocks — the fallback wraps the text only.
    return
  }
  emitInput(host)
}

function nearestAncestor(start: Node, host: HTMLElement, tag: string): HTMLElement | null {
  let n: Node | null = start
  while (n && n !== host) {
    if (n instanceof HTMLElement && n.tagName.toLowerCase() === tag) return n
    n = n.parentNode
  }
  return null
}

function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

/* ------------------------------------------------------------------ */
/* Block-level format (paragraph / h1-h3 / blockquote / pre)           */
/* ------------------------------------------------------------------ */

/**
 * Sets a block-level tag on EVERY block the selection crosses. When the
 * selection is collapsed it changes only the current block.
 *
 * When targetTag === currentBlockTag it toggles to 'p' (a paragraph).
 */
export function setBlockTag(host: HTMLElement, targetTag: string): void {
  const range = rangeWithinHost(host)
  if (!range) return
  const currentTag = currentBlockTag(host)
  const final = currentTag === targetTag ? 'p' : targetTag

  // We gather every block ancestor the selection crosses.
  const blocks = collectBlockAncestors(range, host)
  if (blocks.length === 0) {
    // The selection is in a text node directly inside the host — we wrap it
    // into a <p> and apply targetTag.
    return
  }
  for (const block of blocks) {
    const blockTag = block.tagName.toLowerCase()
    if (blockTag === final) continue
    // When the block is an <li>, the tag cannot simply be replaced (that would
    // give <ul><h2>...</h2></ul>, invalid HTML). We extract the li out of the
    // ul/ol: a <final> with the li's content is created and placed right AFTER
    // the parent ul/ol. When the li is the last one the list is cut in two;
    // when it is the first one the list is left above.
    if (blockTag === 'li') {
      const list = block.parentElement
      if (list && (list.tagName.toLowerCase() === 'ul' || list.tagName.toLowerCase() === 'ol')) {
        const replacement = document.createElement(final)
        while (block.firstChild) replacement.appendChild(block.firstChild)
        // The list is cut: everything after the block moves into a new ul/ol.
        const tailItems: Element[] = []
        let next: Element | null = block.nextElementSibling
        while (next) {
          tailItems.push(next)
          next = next.nextElementSibling
        }
        block.remove()
        list.after(replacement)
        if (tailItems.length > 0) {
          const tailList = document.createElement(list.tagName.toLowerCase())
          for (const item of tailItems) tailList.appendChild(item)
          replacement.after(tailList)
        }
        if (list.children.length === 0) list.remove()
        // The caret goes to the start of the replacement.
        const r = document.createRange()
        r.selectNodeContents(replacement)
        r.collapse(true)
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(r)
        }
        continue
      }
    }
    const replacement = document.createElement(final)
    while (block.firstChild) replacement.appendChild(block.firstChild)
    block.replaceWith(replacement)
  }
  emitInput(host)
}

function collectBlockAncestors(range: Range, host: HTMLElement): HTMLElement[] {
  const result = new Set<HTMLElement>()
  const startBlock = blockAncestor(range.startContainer, host)
  const endBlock = blockAncestor(range.endContainer, host)
  if (startBlock) result.add(startBlock)
  if (endBlock) result.add(endBlock)
  // For a cross-block selection we add every block in between.
  if (startBlock && endBlock && startBlock !== endBlock) {
    const all = Array.from(host.querySelectorAll<HTMLElement>('p, h1, h2, h3, blockquote, pre, li'))
    let inside = false
    for (const el of all) {
      if (el === startBlock) inside = true
      if (inside) result.add(el)
      if (el === endBlock) break
    }
  }
  return Array.from(result)
}

function blockAncestor(start: Node, host: HTMLElement): HTMLElement | null {
  const blockTags = ['p', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'li']
  let n: Node | null = start
  while (n && n !== host) {
    if (n instanceof HTMLElement && blockTags.includes(n.tagName.toLowerCase())) {
      return n
    }
    n = n.parentNode
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Lists (ul / ol)                                                     */
/* ------------------------------------------------------------------ */

export function toggleList(host: HTMLElement, listTag: 'ul' | 'ol'): void {
  const range = rangeWithinHost(host)
  if (!range) return
  // We check whether we are already in a list of the required type.
  let n: Node | null = range.startContainer
  while (n && n !== host) {
    if (n instanceof HTMLElement) {
      const t = n.tagName.toLowerCase()
      if (t === 'ul' || t === 'ol') {
        if (t === listTag) {
          // Removing the list means replacing the ul/ol with a series of <p>.
          unwrapList(n)
        } else {
          // Changing the list's type.
          const replacement = document.createElement(listTag)
          while (n.firstChild) replacement.appendChild(n.firstChild)
          n.replaceWith(replacement)
        }
        emitInput(host)
        return
      }
    }
    n = n.parentNode
  }
  // Not in a list — the block is wrapped into a <ul/ol><li>
  const block = blockAncestor(range.startContainer, host)
  if (!block) return
  const list = document.createElement(listTag)
  const li = document.createElement('li')
  while (block.firstChild) li.appendChild(block.firstChild)
  list.appendChild(li)
  block.replaceWith(list)
  emitInput(host)
}

function unwrapList(list: HTMLElement): void {
  const parent = list.parentNode
  if (!parent) return
  for (const li of Array.from(list.children)) {
    if (li.tagName.toLowerCase() !== 'li') continue
    const p = document.createElement('p')
    while (li.firstChild) p.appendChild(li.firstChild)
    parent.insertBefore(p, list)
  }
  parent.removeChild(list)
}

/* ------------------------------------------------------------------ */
/* Link                                                                */
/* ------------------------------------------------------------------ */

export function setLink(host: HTMLElement, url: string | null): void {
  const range = rangeWithinHost(host)
  if (!range) return
  const existing = findAncestorAnchor(host)
  if (existing) {
    if (url === null || url === '') {
      unwrapElement(existing)
      emitInput(host)
      return
    }
    existing.setAttribute('href', url)
    emitInput(host)
    return
  }
  if (url === null || url === '' || range.collapsed) return
  const a = document.createElement('a')
  a.setAttribute('href', url)
  a.setAttribute('rel', 'noopener noreferrer')
  a.setAttribute('target', '_blank')
  try {
    a.appendChild(range.extractContents())
    range.insertNode(a)
    emitInput(host)
  } catch {
    /* ignore cross-block range */
  }
}

/* ------------------------------------------------------------------ */
/* Image                                                               */
/* ------------------------------------------------------------------ */

export function insertImage(host: HTMLElement, src: string, alt = ''): void {
  const range = rangeWithinHost(host)
  if (!range) return
  const img = document.createElement('img')
  img.src = src
  if (alt) img.alt = alt
  range.deleteContents()
  range.insertNode(img)
  // Move cursor after image.
  range.setStartAfter(img)
  range.collapse(true)
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
  emitInput(host)
}

/* ------------------------------------------------------------------ */
/* Horizontal rule                                                     */
/* ------------------------------------------------------------------ */

export function insertHorizontalRule(host: HTMLElement): void {
  const range = rangeWithinHost(host)
  if (!range) return
  const hr = document.createElement('hr')
  range.deleteContents()
  range.insertNode(hr)
  // Insert empty <p> after hr to give caret a target.
  const p = document.createElement('p')
  p.appendChild(document.createElement('br'))
  hr.after(p)
  range.setStart(p, 0)
  range.collapse(true)
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
  emitInput(host)
}
