/**
 * The editor engine — the entry point for the editor's commands and state.
 *
 * Outside the Vue component: the `EditorController` class, which holds a
 * reference to the host (the contenteditable div), the history stack and
 * convenient APIs for the toolbar: `chain().bold().run()`, `isActive('bold')`
 * and so on.
 *
 * The API style deliberately resembles Tiptap's (chain/run/isActive) — but
 * without a peer dependency on Tiptap.
 */
import { BlockPreviews, serializeHost, type BlockRenderers } from './blockPreviews'
import {
  insertCodeBlock,
  insertMath,
  insertHorizontalRule,
  insertImage,
  setBlockTag,
  setLink,
  toggleInlineMark,
  toggleList,
  toggleTaskList,
} from './commands'
import { HistoryStack } from './history'
import {
  blockGroup,
  duplicateBlock,
  moveBlock,
  positionOf,
  rangeAt,
  removeBlock,
  topBlocks,
  topNodes,
  type CaretPosition,
} from './blocks'
import {
  currentBlockTag,
  findAncestorAnchor,
  isFormatActive,
  rangeWithinHost,
} from './selection'
import { sanitizeHtml, type SanitizeOptions } from './sanitize'
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  insertTable,
  isInTable,
  removeColumn,
  removeRow,
  removeTable,
} from './table'

export { sanitizeHtml } from './sanitize'
export type { AllowedAttributes, SanitizeOptions } from './sanitize'
export type { BlockRenderer, BlockRenderers, BlockRenderResult, BlockMountContext, BlockMountHandle } from './blockPreviews'
export type { CaretPosition } from './blocks'

export interface EditorOptions extends SanitizeOptions {
  /**
   * Code-block languages shown as what they draw, e.g. `{ mermaid }`. Same
   * contract as the kit's UidMarkdown blockRenderers.
   */
  blockRenderers?: BlockRenderers
  /** Called when an asynchronous preview has landed. */
  onPreviewRendered?: () => void
}

/**
 * Removes the zero-width spaces (U+200B) from the HTML — in the DOM they are
 * needed as a caret target for empty inline marks and exit cursors, but in the
 * final HTML they are rubbish: invisible to the user, they break comparisons and
 * inflate the database. Applied only on export through getHTML().
 */
function vacuumZwsp(html: string): string {
  return html.replace(/​/g, '')
}

export interface ChainAPI {
  bold(): ChainAPI
  italic(): ChainAPI
  underline(): ChainAPI
  strike(): ChainAPI
  code(): ChainAPI
  heading(level: 1 | 2 | 3): ChainAPI
  paragraph(): ChainAPI
  bulletList(): ChainAPI
  /** A task list (`- [ ] …`): the list's items become tasks, or plain items again. */
  taskList(): ChainAPI
  orderedList(): ChainAPI
  blockquote(): ChainAPI
  codeBlock(): ChainAPI
  /** A `<pre><code class="language-X">` with the code, the caret at its end. */
  insertCodeBlock(language: string, code?: string): ChainAPI
  /** A TeX formula at the caret: on a line of its own (`block`), or in the text. */
  insertMath(tex: string, block?: boolean): ChainAPI
  setLink(url: string | null): ChainAPI
  setImage(src: string, alt?: string): ChainAPI
  horizontalRule(): ChainAPI
  insertTable(rows: number, cols: number): ChainAPI
  addRowAfter(): ChainAPI
  addRowBefore(): ChainAPI
  addColumnAfter(): ChainAPI
  addColumnBefore(): ChainAPI
  removeRow(): ChainAPI
  removeColumn(): ChainAPI
  removeTable(): ChainAPI
  undo(): ChainAPI
  redo(): ChainAPI
  focus(): ChainAPI
  /** Finishes the chain — it records a history snapshot. */
  run(): void
}

export class EditorController {
  readonly host: HTMLElement
  readonly history: HistoryStack
  /** The previews of the code blocks that have a renderer. */
  readonly previews: BlockPreviews

  /** What setContent keeps beyond the built-in whitelist (see sanitizeHtml). */
  sanitizeOptions: SanitizeOptions

  constructor(host: HTMLElement, options: EditorOptions = {}) {
    const { blockRenderers, onPreviewRendered, ...sanitizeOptions } = options
    this.host = host
    this.previews = new BlockPreviews(host, blockRenderers, onPreviewRendered)
    this.history = new HistoryStack(host, {
      serialize: serializeHost,
      onRestore: () => this.previews.sync(),
    })
    this.sanitizeOptions = sanitizeOptions
  }

  /* ------------------------- Queries ------------------------- */

  isActive(name: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link'): boolean
  isActive(name: 'heading', attrs: { level: 1 | 2 | 3 }): boolean
  isActive(name: 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock' | 'paragraph' | 'table'): boolean
  isActive(name: string, attrs?: Record<string, unknown>): boolean {
    if (name === 'bold') return isFormatActive(this.host, ['strong', 'b'])
    if (name === 'italic') return isFormatActive(this.host, ['em', 'i'])
    if (name === 'underline') return isFormatActive(this.host, ['u'])
    if (name === 'strike') return isFormatActive(this.host, ['s', 'strike', 'del'])
    if (name === 'code') return isFormatActive(this.host, ['code'])
    if (name === 'link') return findAncestorAnchor(this.host) !== null
    if (name === 'heading') {
      const level = (attrs?.level as number | undefined) ?? 0
      return currentBlockTag(this.host) === `h${level}`
    }
    if (name === 'paragraph') return currentBlockTag(this.host) === 'p'
    if (name === 'table') return isInTable(this.host)
    if (name === 'blockquote') return currentBlockTag(this.host) === 'blockquote'
    if (name === 'codeBlock') return currentBlockTag(this.host) === 'pre'
    if (name === 'bulletList' || name === 'orderedList') {
      const target = name === 'bulletList' ? 'ul' : 'ol'
      let n: Node | null = rangeWithinHost(this.host)?.startContainer ?? null
      while (n && n !== this.host) {
        if (n instanceof HTMLElement && n.tagName.toLowerCase() === target) return true
        n = n.parentNode
      }
      return false
    }
    return false
  }

  canUndo(): boolean { return this.history.canUndo }
  canRedo(): boolean { return this.history.canRedo }

  getHTML(): string { return vacuumZwsp(serializeHost(this.host)) }

  isEmpty(): boolean {
    const text = this.host.textContent?.trim() ?? ''
    return text === ''
  }

  /* ------------------------- Commands API ------------------------- */

  chain(): ChainAPI {
    let dirty = false
    const api: ChainAPI = {
      bold: () => { toggleInlineMark(this.host, 'strong'); dirty = true; return api },
      italic: () => { toggleInlineMark(this.host, 'em'); dirty = true; return api },
      underline: () => { toggleInlineMark(this.host, 'u'); dirty = true; return api },
      strike: () => { toggleInlineMark(this.host, 's'); dirty = true; return api },
      code: () => { toggleInlineMark(this.host, 'code'); dirty = true; return api },
      heading: (level) => { setBlockTag(this.host, `h${level}`); dirty = true; return api },
      paragraph: () => { setBlockTag(this.host, 'p'); dirty = true; return api },
      bulletList: () => { toggleList(this.host, 'ul'); dirty = true; return api },
      taskList: () => { toggleTaskList(this.host); dirty = true; return api },
      orderedList: () => { toggleList(this.host, 'ol'); dirty = true; return api },
      blockquote: () => { setBlockTag(this.host, 'blockquote'); dirty = true; return api },
      codeBlock: () => { setBlockTag(this.host, 'pre'); dirty = true; return api },
      insertCodeBlock: (language, code) => { insertCodeBlock(this.host, language, code); this.previews.sync(); dirty = true; return api },
      insertMath: (tex, block = false) => { insertMath(this.host, tex, block); this.previews.sync(); dirty = true; return api },
      setLink: (url) => { setLink(this.host, url); dirty = true; return api },
      setImage: (src, alt) => { insertImage(this.host, src, alt); dirty = true; return api },
      horizontalRule: () => { insertHorizontalRule(this.host); dirty = true; return api },
      insertTable: (rows, cols) => { insertTable(this.host, rows, cols); dirty = true; return api },
      addRowAfter: () => { addRowAfter(this.host); dirty = true; return api },
      addRowBefore: () => { addRowBefore(this.host); dirty = true; return api },
      addColumnAfter: () => { addColumnAfter(this.host); dirty = true; return api },
      addColumnBefore: () => { addColumnBefore(this.host); dirty = true; return api },
      removeRow: () => { removeRow(this.host); dirty = true; return api },
      removeColumn: () => { removeColumn(this.host); dirty = true; return api },
      removeTable: () => { removeTable(this.host); dirty = true; return api },
      undo: () => { this.history.undo(); return api },
      redo: () => { this.history.redo(); return api },
      focus: () => { this.host.focus(); return api },
      run: () => {
        if (dirty) this.history.commit()
      },
    }
    return api
  }

  /** Set the content (sanitized) and reset the history. */
  setContent(html: string): void {
    this.host.innerHTML = sanitizeHtml(html, this.sanitizeOptions)
    dropBlockGaps(this.host)
    // When the editor is empty we guarantee at least one block <p><br>, so that
    // the user's typing lands in a block context right away. Without it the
    // markdown shortcuts and handleEnter cannot find a blockAncestor.
    ensureBlock(this.host)
    this.previews.sync()
    this.history.reset(serializeHost(this.host))
  }

  /**
   * Brings the content to `html` (sanitized, as setContent does) by replacing
   * only the top-level nodes that differ: the common leading and trailing
   * nodes stay the same DOM nodes, so a selection in them stays exactly where
   * it is. A selection in a replaced node is put back by its block's index
   * and its character offset within the block.
   *
   * Meant for a value that changed elsewhere (another person's edit). The
   * history is rebased on the result: the undo and redo stacks are cleared,
   * so the local undo never takes back a change that came from outside.
   * Returns false when the content already was `html`.
   */
  patchContent(html: string): boolean {
    const fresh = document.createElement('div')
    fresh.innerHTML = sanitizeHtml(html, this.sanitizeOptions)
    dropBlockGaps(fresh)
    ensureBlock(fresh)
    const oldNodes = topNodes(this.host)
    const newNodes = topNodes(fresh)
    const oldKeys = oldNodes.map(nodeKey)
    const newKeys = newNodes.map(nodeKey)
    const shortest = Math.min(oldNodes.length, newNodes.length)
    let head = 0
    while (head < shortest && oldKeys[head] === newKeys[head]) head++
    let tail = 0
    while (tail < shortest - head && oldKeys[oldKeys.length - 1 - tail] === newKeys[newKeys.length - 1 - tail]) tail++
    if (head === oldNodes.length && head === newNodes.length) return false

    const replaced = oldNodes.slice(head, oldNodes.length - tail)
    // The selection is saved as positions only when a replaced node holds it.
    const sel = window.getSelection()
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
    let saved: { start: CaretPosition | null; end: CaretPosition | null } | null = null
    if (range && this.host.contains(range.startContainer)) {
      const touched = (n: Node): boolean => n === this.host || replaced.some((r) => r.contains(n))
      if (touched(range.startContainer) || touched(range.endContainer)) {
        saved = {
          start: positionOf(this.host, range.startContainer, range.startOffset),
          end: positionOf(this.host, range.endContainer, range.endOffset),
        }
      }
    }

    const next = oldNodes[oldNodes.length - tail]
    const anchor = tail > 0 && next ? (next instanceof HTMLElement ? blockGroup(next)[0]! : next) : null
    for (const node of replaced) {
      for (const n of node instanceof HTMLElement ? blockGroup(node) : [node]) n.remove()
    }
    const fragment = document.createDocumentFragment()
    for (const node of newNodes.slice(head, newNodes.length - tail)) fragment.appendChild(node)
    if (anchor) this.host.insertBefore(fragment, anchor)
    else this.host.appendChild(fragment)
    this.previews.sync()

    if (saved?.start && sel) {
      const start = rangeAt(this.host, saved.start)
      const end = saved.end ? rangeAt(this.host, saved.end) : null
      if (start) {
        if (end && ! (saved.end!.block === saved.start.block && saved.end!.offset === saved.start.offset)) {
          start.setEnd(end.startContainer, end.startOffset)
        }
        sel.removeAllRanges()
        sel.addRange(start)
      }
    }
    this.history.reset(serializeHost(this.host))
    return true
  }

  /** Where the selection starts in the content, as a block index and an offset; null outside. */
  caretPosition(): CaretPosition | null {
    const range = rangeWithinHost(this.host)
    return range ? positionOf(this.host, range.startContainer, range.startOffset) : null
  }

  /**
   * Moves the top-level block at `from` to index `to`, with its preview.
   * One history step; the caret goes to the start of the moved block.
   */
  moveBlock(from: number, to: number): boolean {
    if (! moveBlock(this.host, from, to)) return false
    this.afterBlockChange(Math.min(Math.max(0, to), topBlocks(this.host).length - 1))
    return true
  }

  /** A copy of the top-level block right after it. One history step; the caret goes into the copy. */
  duplicateBlock(index: number): boolean {
    if (! duplicateBlock(this.host, index)) return false
    this.afterBlockChange(index + 1)
    return true
  }

  /** Removes the top-level block (the last one is emptied instead). One history step. */
  removeBlock(index: number): boolean {
    const next = removeBlock(this.host, index)
    if (next < 0) return false
    this.afterBlockChange(next)
    return true
  }

  private afterBlockChange(caretBlock: number): void {
    this.previews.sync()
    const range = rangeAt(this.host, { block: caretBlock, offset: 0 })
    const sel = window.getSelection()
    if (range && sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
    this.history.commit()
  }

  /** Release the resources (the live block widgets); a host calls this on unmount. */
  destroy(): void {
    this.previews.destroy()
  }
}

/** An empty host gets one `<p><br></p>`: typing then lands in a block. */
function ensureBlock(root: HTMLElement): void {
  if (root.firstElementChild === null && (root.textContent ?? '') === '') {
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    root.appendChild(p)
  }
}

/** A top-level node as the stored HTML has it: without the editor's drawings and zero-width spaces. */
function nodeKey(node: ChildNode): string {
  if (! (node instanceof Element)) return `#text:${vacuumZwsp(node.textContent ?? '')}`
  const wrap = document.createElement('div')
  wrap.appendChild(node.cloneNode(true))
  return vacuumZwsp(serializeHost(wrap))
}

const GAP_PARENTS = new Set(['UL', 'OL', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'BLOCKQUOTE', 'DETAILS'])

/**
 * Line breaks between blocks in the given HTML ("</p>\n<h2>") are only
 * formatting, but the content keeps whitespace (pre-wrap) and would show
 * each of them as an empty line. They are dropped from the content's top
 * level and from containers that hold only blocks.
 */
function dropBlockGaps(root: HTMLElement): void {
  const walk = (parent: Element): void => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() === '') {
        node.remove()
      } else if (node instanceof Element && GAP_PARENTS.has(node.tagName)) {
        walk(node)
      }
    }
  }
  walk(root)
}
