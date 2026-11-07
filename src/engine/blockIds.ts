/**
 * Block ids: ` ^id` at the end of a paragraph, heading, list item or table
 * cell names the block, so links can point at it (`[[note#^id]]`). In the
 * editor an id is one island — `<span data-block-id="id">` — drawn as a quiet
 * `^id` that cannot be typed into, and kept at the end of its block: text
 * typed after it goes before it. Deleting the island deletes the id, on
 * purpose only. The content keeps the island alone; the drawing is the
 * editor's own, dropped from what it gives out. `htmlToMarkdown` writes the
 * island back as ` ^id`.
 */

export const BLOCK_ID_ATTR = 'data-block-id'

/** An id: letters, digits and dashes, at least one letter, up to 32 characters. */
export const BLOCK_ID = /^(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9-]{0,31}$/

/** ` ^id` at the very end of a text. */
const TRAILING_ID = /[ \t]+\^((?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9][A-Za-z0-9-]{0,31})[ \t]*$/

/** The blocks an id can end. */
const HOLDERS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th'])

/** Blocks inside a holder that end its own text (a list item's nested list or paragraphs). */
const INNER_BLOCKS = new Set(['ul', 'ol', 'p', 'pre', 'blockquote', 'table', 'div'])

export function isBlockId(id: string): boolean {
  return BLOCK_ID.test(id)
}

/** An id island. */
export function blockIdIsland(doc: Document, id: string): HTMLElement {
  const span = doc.createElement('span')
  span.setAttribute(BLOCK_ID_ATTR, id)
  return span
}

function tagOf(node: Node | null): string {
  return node && node.nodeType === Node.ELEMENT_NODE ? (node as Element).tagName.toLowerCase() : ''
}

/** A direct child that matches (no `:scope`: an id like `^li-1` breaks it in some engines). */
function childOf(parent: Element, match: (child: Element) => boolean): Element | undefined {
  return Array.from(parent.children).find(match)
}

/** The holder's own inline nodes: up to its first inner block (a list item's nested list). */
function ownInline(holder: Element): Node[] {
  const nodes: Node[] = []
  for (const node of Array.from(holder.childNodes)) {
    if (INNER_BLOCKS.has(tagOf(node))) break
    nodes.push(node)
  }
  return nodes
}

/** Whether a node shows nothing: whitespace, a zero-width space, a placeholder `<br>`. */
function blank(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return (node as Text).data.replace(/​/g, '').trim() === ''
  return tagOf(node) === 'br'
}

/**
 * Ids in loaded or pasted HTML as islands: a trailing ` ^id` in a block's
 * own text, and the attributes the kit's Markdown renderer puts on a block
 * (`data-block-id`, `id="^id"`). Runs before sanitizing, on a detached tree.
 */
export function blockIdsToIslands(root: Element): void {
  const doc = root.ownerDocument
  // An island's drawing goes; its id stays.
  for (const island of Array.from(root.querySelectorAll(`span[${BLOCK_ID_ATTR}]`))) island.replaceChildren()

  for (const holder of Array.from(root.querySelectorAll(Array.from(HOLDERS).join(',')))) {
    // A loose list item's id is its paragraph's.
    if (tagOf(holder) === 'li' && childOf(holder, (c) => tagOf(c) === 'p')) continue
    const own = ownInline(holder)
    if (own.some((n) => tagOf(n) === 'span' && (n as Element).hasAttribute(BLOCK_ID_ATTR))) continue

    // The renderer's attributes (the text no longer has the id).
    const named = holder.getAttribute(BLOCK_ID_ATTR)
    if (named !== null) {
      holder.removeAttribute(BLOCK_ID_ATTR)
      if (holder.getAttribute('id') === `^${named}`) holder.removeAttribute('id')
      childOf(holder, (c) => tagOf(c) === 'a' && c.classList.contains('uid-markdown__block-anchor'))?.remove()
      if (isBlockId(named)) insertAtEnd(holder, blockIdIsland(doc, named))
      continue
    }

    // The id written as text: the last text of the block's own content.
    const last = [...own].reverse().find((n) => !blank(n))
    if (!last || last.nodeType !== Node.TEXT_NODE) continue
    const text = last as Text
    const m = TRAILING_ID.exec(text.data)
    if (!m) continue
    text.data = text.data.slice(0, m.index)
    text.after(blockIdIsland(doc, m[1] ?? ''))
  }
}

/** Puts a node after the holder's own inline content (before a nested list). */
function insertAtEnd(holder: Element, node: Node): void {
  const own = ownInline(holder)
  const after = [...own].reverse().find((n) => !blank(n) && n !== node)
  if (after) after.parentNode!.insertBefore(node, after.nextSibling)
  else if (own.length > 0) own[own.length - 1]!.parentNode!.insertBefore(node, own[own.length - 1]!.nextSibling)
  else holder.prepend(node)
}

/**
 * Draws the islands and keeps each at the end of its block: when text was
 * typed after one, the island moves behind it.
 */
export function syncBlockIds(host: HTMLElement): void {
  for (const island of Array.from(host.querySelectorAll<HTMLElement>(`span[${BLOCK_ID_ATTR}]`))) {
    const id = island.getAttribute(BLOCK_ID_ATTR) ?? ''
    if (!isBlockId(id)) {
      island.remove()
      continue
    }
    if (island.textContent !== `^${id}`) island.textContent = `^${id}`
    island.setAttribute('contenteditable', 'false')
    island.classList.add('dsk-block-id')
    keepLast(island)
  }
}

/** Moves an island behind text typed after it in its block. */
function keepLast(island: HTMLElement): void {
  const holder = island.parentElement
  if (!holder || !HOLDERS.has(tagOf(holder))) return
  const own = ownInline(holder)
  const after = own.slice(own.indexOf(island) + 1)
  if (after.some((n) => !blank(n))) insertAtEnd(holder, island)
}

/**
 * A detached copy's islands without their drawing, each last in its block:
 * what the editor gives out, even before the islands were synced after typing.
 */
export function stripBlockIdDrawings(root: Element | DocumentFragment): void {
  for (const island of Array.from(root.querySelectorAll<HTMLElement>(`span[${BLOCK_ID_ATTR}]`))) {
    keepLast(island)
    island.replaceChildren()
    island.removeAttribute('contenteditable')
    island.removeAttribute('class')
  }
}
