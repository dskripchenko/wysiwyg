/**
 * Top-level blocks: the direct children of the editable host, as the stored
 * HTML has them.
 *
 * The host also holds the editor's own decorations next to some blocks — a
 * preview island after a code block, the header of an open live block before
 * it. They are not content: they are skipped when counting blocks and travel
 * with their block when it moves or goes.
 *
 * A position in the content is `{ block, offset }`: the index of a top-level
 * block and a character offset within that block's text. It survives a
 * re-render of the HTML (unlike a Range, whose nodes are recreated), so it is
 * what the caret is restored by and what other people's carets are drawn at.
 */
import { HEAD_ATTR, PREVIEW_ATTR } from './blockPreviews'

/** A caret: a top-level block's index and a character offset within its text. */
export interface CaretPosition {
  block: number
  offset: number
}

/** True for the editor's own decorations among the host's children. */
export function isDecoration(node: Node): boolean {
  return node instanceof Element && (node.hasAttribute(PREVIEW_ATTR) || node.hasAttribute(HEAD_ATTR))
}

/** The content's top-level nodes: elements and non-blank text, without the decorations. */
export function topNodes(host: HTMLElement): ChildNode[] {
  return Array.from(host.childNodes).filter((n) => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? '') !== ''
    return n.nodeType === Node.ELEMENT_NODE && ! isDecoration(n)
  })
}

/** The content's top-level blocks (elements only). */
export function topBlocks(host: HTMLElement): HTMLElement[] {
  return topNodes(host).filter((n): n is HTMLElement => n instanceof HTMLElement)
}

/**
 * The top-level block a node is in. A decoration answers for its block: an
 * island for the code block before it, a header for the one after it.
 */
export function topBlockOf(host: HTMLElement, node: Node | null): HTMLElement | null {
  let n: Node | null = node
  while (n && n.parentNode !== host) n = n.parentNode
  if (! (n instanceof HTMLElement)) return null
  if (n.hasAttribute(PREVIEW_ATTR)) return n.previousElementSibling instanceof HTMLElement ? n.previousElementSibling : null
  if (n.hasAttribute(HEAD_ATTR)) return n.nextElementSibling instanceof HTMLElement ? n.nextElementSibling : null
  return n
}

/** The index of the top-level block a node is in, or -1. */
export function blockIndexOf(host: HTMLElement, node: Node | null): number {
  const block = topBlockOf(host, node)
  return block ? topBlocks(host).indexOf(block) : -1
}

/** The characters of a block's text before (container, offset). */
export function offsetInBlock(block: Node, container: Node, offset: number): number {
  if (! block.contains(container)) return 0
  const r = document.createRange()
  r.selectNodeContents(block)
  try {
    r.setEnd(container, offset)
  } catch {
    return 0
  }
  return r.toString().length
}

/**
 * The DOM point `offset` characters into a block's text; past the end, the
 * block's end. A block without text answers with its start.
 */
export function pointInBlock(block: Node, offset: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let left = Math.max(0, offset)
  let last: Text | null = null
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n as Text
    if (left <= text.length) return { node: text, offset: left }
    left -= text.length
    last = text
  }
  if (last) return { node: last, offset: last.length }
  return { node: block, offset: 0 }
}

/** The position of a DOM point in the content, or null outside it. */
export function positionOf(host: HTMLElement, container: Node, offset: number): CaretPosition | null {
  if (! host.contains(container)) return null
  if (container === host) {
    // A point between the host's children: the start of the block at it, or the end of the last one.
    const blocks = topBlocks(host)
    const after = Array.from(host.childNodes).slice(offset).find((n) => n instanceof HTMLElement && blocks.includes(n as HTMLElement))
    if (after) return { block: blocks.indexOf(after as HTMLElement), offset: 0 }
    const last = blocks[blocks.length - 1]
    return last ? { block: blocks.length - 1, offset: (last.textContent ?? '').length } : null
  }
  const block = topBlockOf(host, container)
  if (! block || ! block.contains(container)) return null
  const index = topBlocks(host).indexOf(block)
  return index < 0 ? null : { block: index, offset: offsetInBlock(block, container, offset) }
}

/** A collapsed Range at a position, clamped to the content; null in an empty host. */
export function rangeAt(host: HTMLElement, pos: { block: number; offset?: number }): Range | null {
  const blocks = topBlocks(host)
  if (blocks.length === 0) return null
  const block = blocks[Math.min(Math.max(0, pos.block), blocks.length - 1)]!
  const point = pointInBlock(block, pos.block >= blocks.length ? Number.MAX_SAFE_INTEGER : (pos.offset ?? Number.MAX_SAFE_INTEGER))
  const range = document.createRange()
  range.setStart(point.node, point.offset)
  range.collapse(true)
  return range
}

/** A block with the decorations that belong to it, in document order. */
export function blockGroup(block: HTMLElement): ChildNode[] {
  const group: ChildNode[] = [block]
  const before = block.previousElementSibling
  if (before?.hasAttribute(HEAD_ATTR)) group.unshift(before)
  const after = block.nextElementSibling
  if (after?.hasAttribute(PREVIEW_ATTR)) group.push(after)
  return group
}

/**
 * Moves the block at `from` so that it ends up at index `to` among the
 * blocks, decorations included. Returns false when nothing moved.
 */
export function moveBlock(host: HTMLElement, from: number, to: number): boolean {
  const blocks = topBlocks(host)
  const block = blocks[from]
  if (! block) return false
  const target = Math.min(Math.max(0, to), blocks.length - 1)
  if (target === from) return false
  const group = blockGroup(block)
  const rest = blocks.filter((b) => b !== block)
  // The block lands before the one that is at `target` once it has left.
  const anchor = rest[target]
  const fragment = document.createDocumentFragment()
  for (const n of group) fragment.appendChild(n)
  if (anchor) host.insertBefore(fragment, blockGroup(anchor)[0]!)
  else host.appendChild(fragment)
  return true
}

/**
 * A copy of the block right after it. The editor's state on it (a preview's
 * state, a block id — ids are unique) is not copied. Returns the copy.
 */
export function duplicateBlock(host: HTMLElement, index: number): HTMLElement | null {
  const block = topBlocks(host)[index]
  if (! block) return null
  const copy = block.cloneNode(true) as HTMLElement
  for (const el of [copy, ...Array.from(copy.querySelectorAll('*'))]) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('data-dsk-preview')) el.removeAttribute(attr.name)
    }
  }
  for (const id of Array.from(copy.querySelectorAll('span[data-block-id]'))) id.remove()
  const group = blockGroup(block)
  group[group.length - 1]!.after(copy)
  return copy
}

/**
 * Removes the block with its decorations. The last block is emptied instead,
 * so the caret always has a line. Returns the index of the block to put the
 * caret in.
 */
export function removeBlock(host: HTMLElement, index: number): number {
  const blocks = topBlocks(host)
  const block = blocks[index]
  if (! block) return -1
  for (const n of blockGroup(block)) n.remove()
  if (blocks.length === 1) {
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    host.appendChild(p)
    return 0
  }
  return Math.min(index, blocks.length - 2)
}

/** An empty paragraph after the block (after its decorations). Returns it. */
export function insertParagraphAfter(host: HTMLElement, index: number, text = ''): HTMLElement | null {
  const blocks = topBlocks(host)
  const p = document.createElement('p')
  if (text !== '') p.textContent = text
  else p.appendChild(document.createElement('br'))
  const block = blocks[index]
  if (! block) {
    host.appendChild(p)
    return p
  }
  const group = blockGroup(block)
  group[group.length - 1]!.after(p)
  return p
}
