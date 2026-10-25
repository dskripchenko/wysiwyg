/**
 * Block previews: a `<pre><code class="language-X">` whose language has a
 * renderer is shown as what it draws — a diagram, a chart — instead of code.
 *
 * The stored form never changes: the code block stays in the HTML and the
 * preview is a non-editable island (`[data-dsk-preview]`) placed right after
 * it. `serializeHost` drops the islands and the state attribute, so the
 * v-model, the history and the markdown export only ever see the code.
 *
 * Each previewed `<pre>` carries `data-dsk-preview-state`:
 *   - `view`  — the code is hidden, only the preview shows;
 *   - `edit`  — the caret is in the code: both show, the preview follows typing;
 *   - `error` — the renderer could not read the code: the code shows, the
 *               island holds the message.
 *
 * The editor itself knows nothing about diagrams: the host passes renderers
 * with the same contract as the kit's UidMarkdown blockRenderers.
 */

export interface BlockRenderResult {
  /** Markup put into the island as is: the renderer answers for its safety. */
  html?: string
  /** Shown instead of a preview, next to the code. */
  error?: string
}

export type BlockRenderer = (
  code: string,
  ctx: { language: string; index: number },
) => BlockRenderResult | Promise<BlockRenderResult>

export type BlockRenderers = Readonly<Record<string, BlockRenderer>>

export const PREVIEW_ATTR = 'data-dsk-preview'
export const STATE_ATTR = 'data-dsk-preview-state'

type PreviewState = 'view' | 'edit' | 'error'

/** The HTML of the host without the islands and the preview state. */
export function serializeHost(host: HTMLElement): string {
  if (! host.querySelector(`[${PREVIEW_ATTR}], [${STATE_ATTR}]`)) return host.innerHTML
  const clone = host.cloneNode(true) as HTMLElement
  stripPreviews(clone)
  return clone.innerHTML
}

/** Removes the islands and the state attributes from a detached tree. */
export function stripPreviews(root: Element | DocumentFragment): void {
  for (const island of Array.from(root.querySelectorAll(`[${PREVIEW_ATTR}]`))) island.remove()
  for (const pre of Array.from(root.querySelectorAll(`[${STATE_ATTR}]`))) pre.removeAttribute(STATE_ATTR)
}

/** The language of a `<pre><code class="language-X">`, or null. */
export function codeBlockLanguage(pre: Element): string | null {
  const code = pre.firstElementChild
  if (! code || code.tagName.toLowerCase() !== 'code') return null
  const m = code.className.match(/(?:^|\s)language-([\w-]+)/)
  return m ? m[1]!.toLowerCase() : null
}

function codeOf(pre: Element): string {
  return (pre.textContent ?? '').replace(/​/g, '')
}

interface Entry {
  island: HTMLElement
  /** The code the island shows now (or is rendering). */
  source: string | null
  /** Bumped on every render, so a late async answer never overwrites a newer one. */
  ticket: number
  failed: boolean
}

export class BlockPreviews {
  private readonly host: HTMLElement
  private renderers: BlockRenderers
  private readonly entries = new WeakMap<HTMLElement, Entry>()
  private readonly onChange: () => void
  private index = 0

  /**
   * @param onChange called after an asynchronous render lands, for hosts that
   *   track the layout (the island's height changes).
   */
  constructor(host: HTMLElement, renderers: BlockRenderers = {}, onChange: () => void = () => {}) {
    this.host = host
    this.renderers = renderers
    this.onChange = onChange
  }

  setRenderers(renderers: BlockRenderers): void {
    this.renderers = renderers
    this.sync()
  }

  get enabled(): boolean {
    return Object.keys(this.renderers).length > 0
  }

  /**
   * Brings the islands in line with the content: adds the missing, drops the
   * orphaned, re-renders the code that changed. Cheap when nothing did.
   */
  sync(): void {
    const pres = this.previewable()
    const live = new Set<HTMLElement>()
    for (const pre of pres) {
      const entry = this.entryFor(pre)
      live.add(entry.island)
      const source = codeOf(pre)
      if (source !== entry.source) this.render(pre, entry, source)
    }
    for (const island of Array.from(this.host.querySelectorAll<HTMLElement>(`[${PREVIEW_ATTR}]`))) {
      if (! live.has(island)) island.remove()
    }
    for (const pre of Array.from(this.host.querySelectorAll<HTMLElement>(`[${STATE_ATTR}]`))) {
      if (! pres.includes(pre)) pre.removeAttribute(STATE_ATTR)
    }
  }

  /**
   * A shown diagram whose island the user deleted (Backspace over it, a cut)
   * takes its hidden code along. Called on input, before sync.
   */
  dropOrphanedCode(): boolean {
    let dropped = false
    for (const pre of Array.from(this.host.querySelectorAll<HTMLElement>(`pre[${STATE_ATTR}="view"]`))) {
      const entry = this.entries.get(pre)
      if (entry && ! entry.island.isConnected) {
        pre.remove()
        dropped = true
      }
    }
    return dropped
  }

  /** Follows the caret: the code it is in opens, every other one closes. */
  followSelection(range: Range | null): void {
    for (const pre of this.previewable()) {
      const inside = range !== null && pre.contains(range.startContainer)
      const entry = this.entries.get(pre)
      if (inside) this.setState(pre, 'edit')
      else this.setState(pre, entry?.failed ? 'error' : 'view')
    }
  }

  /** Closes every open code — on blur. */
  closeAll(): void {
    this.followSelection(null)
  }

  /** Opens the code of the island's block and puts the caret at its end. */
  edit(island: HTMLElement): void {
    const pre = island.previousElementSibling
    if (! (pre instanceof HTMLElement) || pre.tagName.toLowerCase() !== 'pre') return
    this.setState(pre, 'edit')
    const code = pre.querySelector('code') ?? pre
    const range = document.createRange()
    range.selectNodeContents(code)
    range.collapse(false)
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  /**
   * Leaves the open code: the caret goes to the block after the preview,
   * which is created when there is none.
   */
  leave(pre: HTMLElement): void {
    const entry = this.entries.get(pre)
    const after = entry?.island.isConnected ? entry.island : pre
    let next = after.nextElementSibling as HTMLElement | null
    if (! next || next.matches(`pre, [${PREVIEW_ATTR}]`)) {
      next = document.createElement('p')
      next.appendChild(document.createElement('br'))
      after.after(next)
    }
    const range = document.createRange()
    range.setStart(next, 0)
    range.collapse(true)
    const sel = window.getSelection()
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
    this.setState(pre, entry?.failed ? 'error' : 'view')
  }

  /** The open code the range is in, if any. */
  openCodeAt(range: Range | null): HTMLElement | null {
    if (! range) return null
    for (const pre of this.previewable()) {
      if (pre.getAttribute(STATE_ATTR) === 'edit' && pre.contains(range.startContainer)) return pre
    }
    return null
  }

  private previewable(): HTMLElement[] {
    if (! this.enabled) return []
    return Array.from(this.host.querySelectorAll<HTMLElement>('pre')).filter((pre) => {
      const lang = codeBlockLanguage(pre)
      return lang !== null && Object.prototype.hasOwnProperty.call(this.renderers, lang)
    })
  }

  private entryFor(pre: HTMLElement): Entry {
    let entry = this.entries.get(pre)
    if (! entry || ! entry.island.isConnected || entry.island.previousElementSibling !== pre) {
      const island = document.createElement('div')
      island.setAttribute(PREVIEW_ATTR, '')
      island.setAttribute('contenteditable', 'false')
      island.className = 'dsk-wysiwyg__preview'
      entry?.island.remove()
      entry = { island, source: null, ticket: 0, failed: false }
      this.entries.set(pre, entry)
      pre.after(island)
    }
    if (! pre.hasAttribute(STATE_ATTR)) pre.setAttribute(STATE_ATTR, 'view')
    return entry
  }

  private setState(pre: HTMLElement, state: PreviewState): void {
    if (pre.getAttribute(STATE_ATTR) !== state) pre.setAttribute(STATE_ATTR, state)
  }

  private render(pre: HTMLElement, entry: Entry, source: string): void {
    entry.source = source
    const ticket = ++entry.ticket
    const language = codeBlockLanguage(pre)!
    const renderer = this.renderers[language]!
    if (source.trim() === '') {
      // A block just inserted: nothing to draw yet, and no error to shout.
      entry.failed = false
      entry.island.removeAttribute('data-error')
      entry.island.replaceChildren()
      return
    }
    const apply = (result: BlockRenderResult): void => {
      if (ticket !== entry.ticket) return
      const island = entry.island
      if (result.error !== undefined || result.html === undefined) {
        entry.failed = true
        island.setAttribute('data-error', '')
        island.replaceChildren(errorNode(result.error ?? ''))
        if (pre.getAttribute(STATE_ATTR) !== 'edit') this.setState(pre, 'error')
      } else {
        entry.failed = false
        island.removeAttribute('data-error')
        island.innerHTML = result.html
        if (pre.getAttribute(STATE_ATTR) !== 'edit') this.setState(pre, 'view')
      }
    }
    let out: BlockRenderResult | Promise<BlockRenderResult>
    try {
      out = renderer(source, { language, index: this.index++ })
    } catch (error) {
      apply({ error: error instanceof Error ? error.message : String(error) })
      return
    }
    if (out instanceof Promise) {
      out.then(apply, (error: unknown) => apply({ error: error instanceof Error ? error.message : String(error) }))
        .then(() => this.onChange())
    } else {
      apply(out)
    }
  }
}

function errorNode(message: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'dsk-wysiwyg__preview-error'
  el.setAttribute('role', 'alert')
  el.textContent = message
  return el
}
