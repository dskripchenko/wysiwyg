/**
 * Helpers on top of the Selection and Range APIs, specific to our contenteditable
 * host.
 *
 * The main operations:
 *   - rangeWithinHost(host) — returns the current Range, but only when it lies
 *     inside `host`. Otherwise null (the selection is outside the editor).
 *   - saveRange / restoreRange — saving and restoring the caret's position
 *     before and after a command (for a modal link dialog, for instance).
 *   - isFormatActive(tag) — checks whether the start of the selection sits
 *     inside the `tag` (for the toolbar's active state).
 *   - splitParagraphAtCaret — on Enter it creates a <p> inheriting the format.
 *
 * We work without execCommand wherever we can — it is deprecated, though for the
 * basic formats (bold/italic) the browser-native implementation is faster and
 * more correct. See commands.ts.
 */

export function getActiveSelection(): Selection | null {
  const sel = typeof window === 'undefined' ? null : window.getSelection()
  return sel && sel.rangeCount > 0 ? sel : null
}

/**
 * Returns the current Range when the selection lies entirely inside `host` (or is
 * collapsed with its anchor inside the host). null when the selection is
 * outside.
 */
export function rangeWithinHost(host: HTMLElement): Range | null {
  const sel = getActiveSelection()
  if (!sel) return null
  const range = sel.getRangeAt(0)
  if (host.contains(range.startContainer) && host.contains(range.endContainer)) {
    return range
  }
  return null
}

/**
 * We save a range as offsets relative to the host — that survives a re-render of
 * the innerHTML (which a native Range does not, because the nodes are
 * recreated).
 */
export interface SavedRange {
  start: number
  end: number
}

export function saveRange(host: HTMLElement): SavedRange | null {
  const range = rangeWithinHost(host)
  if (!range) return null
  return {
    start: textOffsetTo(host, range.startContainer, range.startOffset),
    end: textOffsetTo(host, range.endContainer, range.endOffset),
  }
}

export function restoreRange(host: HTMLElement, saved: SavedRange | null): void {
  if (!saved) return
  const sel = getActiveSelection() ?? window.getSelection()
  if (!sel) return
  const startPos = positionAtTextOffset(host, saved.start)
  const endPos = positionAtTextOffset(host, saved.end)
  if (!startPos || !endPos) return
  const range = document.createRange()
  range.setStart(startPos.node, startPos.offset)
  range.setEnd(endPos.node, endPos.offset)
  sel.removeAllRanges()
  sel.addRange(range)
}

/**
 * Computes the absolute text offset from the host to (node, offset). It counts
 * every text node in DFS order.
 */
function textOffsetTo(host: HTMLElement, target: Node, offset: number): number {
  let counter = 0
  let found = false
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (node === target) {
      counter += offset
      found = true
      break
    }
    counter += (node as Text).length
    node = walker.nextNode()
  }
  if (!found && target === host) {
    return counter
  }
  // When the target is an element, the offset is counted as the number of text
  // characters before the child at index offset.
  if (!found && target instanceof Element) {
    const partial = countTextLength(target, offset)
    return partial
  }
  return counter
}

function countTextLength(parent: Element, untilChildIdx: number): number {
  let total = 0
  for (let i = 0; i < untilChildIdx && i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i]
    total += (child.textContent ?? '').length
  }
  return total
}

function positionAtTextOffset(host: HTMLElement, target: number): { node: Node; offset: number } | null {
  let counter = 0
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    const len = (node as Text).length
    if (counter + len >= target) {
      return { node, offset: target - counter }
    }
    counter += len
    node = walker.nextNode()
  }
  // The end of the host is the last text node, or the host itself.
  const lastText = lastTextNode(host)
  if (lastText) return { node: lastText, offset: (lastText as Text).length }
  return { node: host, offset: host.childNodes.length }
}

function lastTextNode(host: HTMLElement): Text | null {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
  let last: Text | null = null
  let node: Node | null = walker.nextNode()
  while (node) {
    last = node as Text
    node = walker.nextNode()
  }
  return last
}

/**
 * Walks the ancestors from the current anchor node up to the host and checks for
 * a tag from the `tags` set. Used by the toolbar for the active state of the
 * Bold/Italic/etc. buttons.
 */
export function isFormatActive(host: HTMLElement, tags: string[]): boolean {
  const range = rangeWithinHost(host)
  if (!range) return false
  let node: Node | null = range.startContainer
  while (node && node !== host) {
    if (node instanceof HTMLElement) {
      const tag = node.tagName.toLowerCase()
      if (tags.includes(tag)) return true
    }
    node = node.parentNode
  }
  return false
}

/**
 * Returns the nearest block-level element (p/h1-3/li/blockquote/pre) upwards from
 * the current selection. Used by the toolbar:
 * `currentBlockTag()` → 'h1' / 'p' / 'blockquote' / null.
 */
export function currentBlockTag(host: HTMLElement): string | null {
  const range = rangeWithinHost(host)
  if (!range) return null
  let node: Node | null = range.startContainer
  while (node && node !== host) {
    if (node instanceof HTMLElement) {
      const tag = node.tagName.toLowerCase()
      if (['p', 'h1', 'h2', 'h3', 'li', 'blockquote', 'pre'].includes(tag)) {
        return tag
      }
    }
    node = node.parentNode
  }
  return null
}

/**
 * Get the nearest <a> up to the host (to extract the current href).
 */
export function findAncestorAnchor(host: HTMLElement): HTMLAnchorElement | null {
  const range = rangeWithinHost(host)
  if (!range) return null
  let node: Node | null = range.startContainer
  while (node && node !== host) {
    if (node instanceof HTMLAnchorElement) return node
    node = node.parentNode
  }
  return null
}
