/**
 * Markdown shortcuts: when a typical markdown prefix is typed at the start of a
 * block we convert it into the corresponding tag automatically.
 *
 *   `# ` (Space)        → h1
 *   `## ` (Space)       → h2
 *   `### ` (Space)      → h3
 *   `- ` or `* `         → ul + li
 *   `1. ` (any digit)     → ol + li
 *   `> ` (Space)        → blockquote
 *   ` ``` ` (3 backtick) → pre/code
 *
 * Called from DskWysiwyg.vue in the input event handler (after the browser has
 * inserted the character). It works only when the caret is at the start of a
 * text node and everything before the caret is the markdown prefix.
 */
import { rangeWithinHost } from './selection'

interface ShortcutResult {
  /** Whether the shortcut was applied. true means history.commit must be called. */
  applied: boolean
}

export function applyMarkdownShortcut(host: HTMLElement): ShortcutResult {
  const range = rangeWithinHost(host)
  if (!range || !range.collapsed) return { applied: false }

  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return { applied: false }

  const text = (node as Text).data
  const before = text.slice(0, range.startOffset)

  // We find the block ancestor — it is what gets replaced (not the text node inside it).
  const block = blockAncestor(node, host)
  if (!block) return { applied: false }

  // The shortcut must sit at the very start of a block (everything before the
  // caret is the whole text of the block's first text node, or
  // block.firstChild === node and before === text). Otherwise typing `# ` in the
  // middle of a paragraph must not fire.
  if (block.firstChild !== node) return { applied: false }
  if (before !== text) {
    // The caret is not at the end of the text content — when the after-text is
    // non-empty the shortcut applies only if after === '' || after === '​'.
    const after = text.slice(range.startOffset)
    if (after.replace(/[​\s]/g, '') !== '') return { applied: false }
  }

  // We look for a match.
  const headingMatch = before.match(/^(#{1,3}) $/)
  if (headingMatch) {
    const level = headingMatch[1].length
    replaceBlockTag(block, `h${level}`, host)
    return { applied: true }
  }

  if (before === '- ' || before === '* ') {
    replaceWithList(block, 'ul', host)
    return { applied: true }
  }

  if (/^\d+\.\s$/.test(before)) {
    replaceWithList(block, 'ol', host)
    return { applied: true }
  }

  if (before === '> ') {
    replaceBlockTag(block, 'blockquote', host)
    return { applied: true }
  }

  if (before === '```') {
    replaceWithCodeBlock(block, host)
    return { applied: true }
  }

  return { applied: false }
}

function blockAncestor(start: Node, host: HTMLElement): HTMLElement | null {
  // div is included because a Chrome contenteditable splits blocks with divs by
  // default (even though we store <p>). A markdown shortcut must not depend on
  // how the browser marked the current block.
  const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'li']
  let n: Node | null = start
  while (n && n !== host) {
    if (n instanceof HTMLElement && blockTags.includes(n.tagName.toLowerCase())) {
      return n
    }
    n = n.parentNode
  }
  return null
}

function replaceBlockTag(block: HTMLElement, newTag: string, host: HTMLElement): void {
  const replacement = document.createElement(newTag)
  // The prefix text is removed — it was the markdown marker. Then whatever
  // content is left (if any) is moved into the new tag. Here what is left is
  // usually empty, because we matched the whole of before.
  replacement.appendChild(document.createElement('br'))
  block.replaceWith(replacement)
  setCaretToStart(replacement)
  host.dispatchEvent(new InputEvent('input', { bubbles: true }))
}

function replaceWithList(block: HTMLElement, listTag: 'ul' | 'ol', host: HTMLElement): void {
  const list = document.createElement(listTag)
  const li = document.createElement('li')
  li.appendChild(document.createElement('br'))
  list.appendChild(li)
  block.replaceWith(list)
  setCaretToStart(li)
  host.dispatchEvent(new InputEvent('input', { bubbles: true }))
}

function replaceWithCodeBlock(block: HTMLElement, host: HTMLElement): void {
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  code.appendChild(document.createTextNode('​')) // ZWSP — даёт caret-target.
  pre.appendChild(code)
  block.replaceWith(pre)
  setCaretToStart(code)
  host.dispatchEvent(new InputEvent('input', { bubbles: true }))
}

function setCaretToStart(el: HTMLElement): void {
  const range = document.createRange()
  range.setStart(el, 0)
  range.collapse(true)
  const sel = window.getSelection()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(range)
}
