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
 *   - `view`    — the code is hidden, only the preview shows;
 *   - `edit`    — the caret is in the code: a framed block with a header
 *                 (the language, the code's first word, a two-way toggle),
 *                 the code beside its preview, which follows typing;
 *   - `preview` — the same frame, the preview alone (the toggle's other
 *                 side); a click on the preview opens the code again;
 *   - `error`   — the renderer could not read the code: the code shows, the
 *                 island holds the message.
 *
 * The header is a non-editable island of its own (`[data-dsk-preview-head]`)
 * right before the `<pre>`; like the preview island it never reaches the HTML.
 *
 * A renderer may also answer with `mount`: a live island. The host's widget —
 * a form, a request builder — is mounted into the island and edits the block
 * through `setCode`; the code stays hidden, since the widget is its editor.
 *
 * The editor itself knows nothing about diagrams: the host passes renderers
 * with the same contract as the kit's UidMarkdown blockRenderers.
 */
import { MATH_ATTR, stripMathDrawings, syncMath } from './mathIslands'
import { BLOCK_ID_ATTR, stripBlockIdDrawings, syncBlockIds } from './blockIds'

export interface BlockRenderResult {
  /** Markup put into the island as is: the renderer answers for its safety. */
  html?: string
  /** Shown instead of a preview, next to the code. */
  error?: string
  /**
   * A live island: called with the island element once the result lands.
   * Return a handle (or a cleanup function) — `update` takes later changes
   * of the code (undo, redo) without remounting, `destroy` runs when the
   * block goes away.
   */
  mount?: (el: HTMLElement, ctx: BlockMountContext) => BlockMountHandle | (() => void) | void
}

export interface BlockMountContext {
  /** The block's code at mount time. */
  code: string
  language: string
  /** False in a read-only editor: the widget only shows. */
  editable: boolean
  /**
   * Replaces the block's code. The island is not re-rendered for this change —
   * the widget already shows it; the editor records it in the history and
   * emits the new HTML. Ignored when not editable.
   */
  setCode(code: string): void
}

export interface BlockMountHandle {
  update?(code: string): void
  destroy?(): void
}

export type BlockRenderer = (
  code: string,
  ctx: { language: string; index: number },
) => BlockRenderResult | Promise<BlockRenderResult>

export type BlockRenderers = Readonly<Record<string, BlockRenderer>>

export const PREVIEW_ATTR = 'data-dsk-preview'
export const STATE_ATTR = 'data-dsk-preview-state'
/** Marks a live island: the editor leaves the events inside it to the widget. */
export const LIVE_ATTR = 'data-dsk-preview-live'
/** The header of an open block: its title and the source / preview toggle. */
export const HEAD_ATTR = 'data-dsk-preview-head'
/** Set on an open block's `<pre>` when the editor is too narrow for the code beside the preview. */
export const NARROW_ATTR = 'data-dsk-preview-narrow'
/** Below this width of the content the code and the preview stack. */
const SPLIT_MIN_WIDTH = 600

type PreviewState = 'view' | 'edit' | 'preview' | 'error'

/** The words of an open block's toggle. */
export interface PreviewLabels {
  /** Shows the code beside the preview. */
  split: string
  /** Shows the preview alone. */
  preview: string
}

/** The HTML of the host without the islands and the preview state. */
export function serializeHost(host: HTMLElement): string {
  if (! host.querySelector(`[${PREVIEW_ATTR}], [${HEAD_ATTR}], [${STATE_ATTR}], span[${MATH_ATTR}], span[${BLOCK_ID_ATTR}]`)) return host.innerHTML
  const clone = host.cloneNode(true) as HTMLElement
  stripPreviews(clone)
  stripMathDrawings(clone)
  stripBlockIdDrawings(clone)
  return clone.innerHTML
}

/** Removes the islands and the state attributes from a detached tree. */
export function stripPreviews(root: Element | DocumentFragment): void {
  for (const island of Array.from(root.querySelectorAll(`[${PREVIEW_ATTR}], [${HEAD_ATTR}]`))) island.remove()
  for (const pre of Array.from(root.querySelectorAll(`[${STATE_ATTR}]`))) {
    pre.removeAttribute(STATE_ATTR)
    pre.removeAttribute(NARROW_ATTR)
  }
}

/** An open block's title: its language and the first word of its code («mermaid · flowchart»). */
export function previewTitle(language: string, code: string): string {
  const word = code.replace(/​/g, '').trim().split(/\s+/)[0] ?? ''
  return word ? `${language} · ${word}` : language
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
  /** The mounted widget of a live island. */
  handle: BlockMountHandle | null
}

/** True when the node sits inside a live island of a host. */
export function inLiveIsland(node: EventTarget | Node | null): boolean {
  const el = node instanceof Element ? node : node instanceof Node ? node.parentElement : null
  return el?.closest(`[${LIVE_ATTR}]`) != null
}

export class BlockPreviews {
  private readonly host: HTMLElement
  private renderers: BlockRenderers
  private readonly entries = new WeakMap<HTMLElement, Entry>()
  private readonly onChange: () => void
  private index = 0
  private editable = true
  /** Live widgets by island, to destroy the ones whose island went away. */
  private readonly mounted = new Map<HTMLElement, BlockMountHandle>()
  /** Called after a live widget changed its block's code. */
  onCodeChange: () => void = () => {}
  private labels: PreviewLabels = { split: 'Source and preview', preview: 'Preview only' }

  /**
   * @param onChange called after an asynchronous render lands, for hosts that
   *   track the layout (the island's height changes).
   */
  constructor(host: HTMLElement, renderers: BlockRenderers = {}, onChange: () => void = () => {}) {
    this.host = host
    this.renderers = renderers
    this.onChange = onChange
  }

  /** The words of the open blocks' toggle (the editor's language). */
  setLabels(labels: PreviewLabels): void {
    this.labels = { ...labels }
    for (const head of Array.from(this.host.querySelectorAll<HTMLElement>(`[${HEAD_ATTR}]`))) {
      const split = head.querySelector('[data-mode="split"]')
      const preview = head.querySelector('[data-mode="preview"]')
      if (split) split.textContent = labels.split
      if (preview) preview.textContent = labels.preview
    }
  }

  setRenderers(renderers: BlockRenderers): void {
    this.renderers = renderers
    this.remountAll()
  }

  /** A read-only editor mounts its live widgets as read-only. */
  setEditable(editable: boolean): void {
    if (this.editable === editable) return
    this.editable = editable
    this.remountAll()
  }

  /** Destroys every live widget — the editor is going away. */
  destroy(): void {
    for (const handle of this.mounted.values()) handle.destroy?.()
    this.mounted.clear()
  }

  /** Renders every block anew: the renderers or the mode changed. */
  private remountAll(): void {
    for (const pre of this.previewable()) {
      const entry = this.entries.get(pre)
      if (! entry) continue
      // A new renderer or mode: the widget is mounted again, not updated.
      this.unmountLive(entry)
      entry.source = null
    }
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
    // Formulas are islands too: drawn where their TeX changed.
    syncMath(this.host)
    // Block ids too: drawn, and kept at the end of their blocks.
    syncBlockIds(this.host)
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
      if (! pres.includes(pre)) {
        pre.removeAttribute(STATE_ATTR)
        pre.removeAttribute(NARROW_ATTR)
      }
    }
    // A header belongs right before an open block; any other one is stale.
    for (const head of Array.from(this.host.querySelectorAll<HTMLElement>(`[${HEAD_ATTR}]`))) {
      const pre = head.nextElementSibling
      if (! (pre instanceof HTMLElement) || ! pres.includes(pre) || ! isOpen(pre)) head.remove()
    }
    for (const pre of pres) if (isOpen(pre)) this.decorate(pre)
    this.fit()
    // Islands dropped by an undo, a setContent or the code above.
    for (const [island, handle] of this.mounted) {
      if (! island.isConnected || ! live.has(island)) {
        handle.destroy?.()
        this.mounted.delete(island)
      }
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

  /**
   * Follows the caret: the code it is in opens, every other one closes. A
   * block showing its preview alone stays so until the editor loses the focus.
   */
  followSelection(range: Range | null): void {
    for (const pre of this.previewable()) {
      const inside = range !== null && pre.contains(range.startContainer)
      const entry = this.entries.get(pre)
      // A live block is edited through its widget; its code never opens.
      if (entry?.handle) continue
      if (inside) this.setState(pre, 'edit')
      else if (pre.getAttribute(STATE_ATTR) !== 'preview') this.setState(pre, entry?.failed ? 'error' : 'view')
    }
  }

  /** Closes every open block — on blur. */
  closeAll(): void {
    for (const pre of this.previewable()) {
      const entry = this.entries.get(pre)
      if (entry?.handle) continue
      this.setState(pre, entry?.failed ? 'error' : 'view')
    }
  }

  /**
   * The open block shows its preview alone; the caret leaves the code for the
   * block after it. A click on the preview brings the code back.
   */
  showPreviewOnly(pre: HTMLElement): void {
    const entry = this.entries.get(pre)
    if (! entry || entry.handle) return
    this.setState(pre, 'preview')
    this.caretAfter(pre)
  }

  /**
   * Sizes the open blocks: the preview beside the code is at least as tall as
   * the code, and a narrow editor stacks them. Cheap; called after typing and
   * on resize.
   */
  fit(): void {
    const width = this.host.clientWidth
    for (const pre of Array.from(this.host.querySelectorAll<HTMLElement>(`pre[${STATE_ATTR}]`))) {
      const island = this.entries.get(pre)?.island
      if (! island) continue
      const narrow = width > 0 && width < SPLIT_MIN_WIDTH
      if (narrow) pre.setAttribute(NARROW_ATTR, '')
      else pre.removeAttribute(NARROW_ATTR)
      const split = pre.getAttribute(STATE_ATTR) === 'edit' && ! narrow
      const height = split ? pre.offsetHeight : 0
      island.style.minHeight = height > 0 ? `${height}px` : ''
      if (island.getAttribute('style') === '') island.removeAttribute('style')
    }
  }

  /** Opens the code of the island's block and puts the caret at its end. */
  edit(island: HTMLElement): void {
    if (island.hasAttribute(LIVE_ATTR)) return
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
    this.caretAfter(pre)
    this.setState(pre, entry?.failed ? 'error' : 'view')
  }

  /** The caret goes to the block after the block's preview, created when there is none. */
  private caretAfter(pre: HTMLElement): void {
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
      entry = { island, source: null, ticket: 0, failed: false, handle: null }
      this.entries.set(pre, entry)
      pre.after(island)
    }
    if (! pre.hasAttribute(STATE_ATTR)) pre.setAttribute(STATE_ATTR, 'view')
    return entry
  }

  private setState(pre: HTMLElement, state: PreviewState): void {
    if (pre.getAttribute(STATE_ATTR) === state) return
    pre.setAttribute(STATE_ATTR, state)
    if (isOpen(pre)) this.decorate(pre)
    else {
      const head = pre.previousElementSibling
      if (head?.hasAttribute(HEAD_ATTR)) head.remove()
    }
    this.fit()
  }

  /** The header of an open block: created when missing, its title and toggle brought up to date. */
  private decorate(pre: HTMLElement): void {
    let head = pre.previousElementSibling as HTMLElement | null
    if (! head?.hasAttribute(HEAD_ATTR)) {
      head = this.createHead(pre)
      pre.before(head)
    }
    const title = previewTitle(codeBlockLanguage(pre) ?? '', codeOf(pre))
    const titleEl = head.querySelector('.dsk-wysiwyg__live-title')
    if (titleEl && titleEl.textContent !== title) titleEl.textContent = title
    const state = pre.getAttribute(STATE_ATTR)
    for (const btn of Array.from(head.querySelectorAll<HTMLElement>('[data-mode]'))) {
      const on = (btn.dataset.mode === 'split') === (state === 'edit')
      if (btn.getAttribute('aria-pressed') !== String(on)) btn.setAttribute('aria-pressed', String(on))
    }
  }

  private createHead(pre: HTMLElement): HTMLElement {
    const head = document.createElement('div')
    head.setAttribute(HEAD_ATTR, '')
    head.setAttribute('contenteditable', 'false')
    head.className = 'dsk-wysiwyg__live-head'
    const title = document.createElement('span')
    title.className = 'dsk-wysiwyg__live-title'
    const modes = document.createElement('span')
    modes.className = 'dsk-wysiwyg__live-modes'
    modes.setAttribute('role', 'group')
    for (const mode of ['split', 'preview'] as const) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'dsk-wysiwyg__live-mode'
      btn.dataset.mode = mode
      btn.textContent = this.labels[mode]
      modes.appendChild(btn)
    }
    head.append(title, modes)
    // A press keeps the caret where it is; the toggle acts on the click (a key, too).
    head.addEventListener('mousedown', (e) => e.preventDefault())
    head.addEventListener('click', (e) => {
      const btn = (e.target as Element | null)?.closest?.('[data-mode]') as HTMLElement | null
      if (! btn || ! pre.isConnected) return
      e.preventDefault()
      const entry = this.entries.get(pre)
      if (btn.dataset.mode === 'preview') this.showPreviewOnly(pre)
      else if (entry) this.edit(entry.island)
    })
    return head
  }

  private render(pre: HTMLElement, entry: Entry, source: string): void {
    entry.source = source
    const ticket = ++entry.ticket
    const language = codeBlockLanguage(pre)!
    const renderer = this.renderers[language]!
    if (source.trim() === '' && ! entry.handle) {
      // A block just inserted: nothing to draw yet, and no error to shout.
      entry.failed = false
      entry.island.removeAttribute('data-error')
      entry.island.replaceChildren()
      return
    }
    const apply = (result: BlockRenderResult): void => {
      if (ticket !== entry.ticket) return
      const island = entry.island
      if (result.mount) {
        this.mountLive(pre, entry, source, language, result.mount)
        return
      }
      this.unmountLive(entry)
      if (result.error !== undefined || result.html === undefined) {
        entry.failed = true
        island.setAttribute('data-error', '')
        island.replaceChildren(errorNode(result.error ?? ''))
        if (! isOpen(pre)) this.setState(pre, 'error')
      } else {
        entry.failed = false
        island.removeAttribute('data-error')
        island.innerHTML = result.html
        if (! isOpen(pre)) this.setState(pre, 'view')
      }
      this.fit()
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
  private mountLive(
    pre: HTMLElement,
    entry: Entry,
    source: string,
    language: string,
    mount: NonNullable<BlockRenderResult['mount']>,
  ): void {
    entry.failed = false
    const island = entry.island
    island.removeAttribute('data-error')
    this.setState(pre, 'view')
    // The widget already there takes the new code (an undo, a redo).
    if (entry.handle?.update) {
      entry.handle.update(source)
      return
    }
    this.unmountLive(entry)
    island.replaceChildren()
    island.setAttribute(LIVE_ATTR, '')
    const editable = this.editable
    const out = mount(island, {
      code: source,
      language,
      editable,
      setCode: (code) => {
        if (! editable || ! pre.isConnected) return
        const target = pre.querySelector('code') ?? pre
        target.textContent = code
        // Already shown by the widget: the next sync must not re-render it.
        entry.source = codeOf(pre)
        this.onCodeChange()
      },
    })
    const handle: BlockMountHandle = typeof out === 'function' ? { destroy: out } : (out ?? {})
    entry.handle = handle
    this.mounted.set(island, handle)
  }

  private unmountLive(entry: Entry): void {
    if (! entry.handle) return
    entry.handle.destroy?.()
    this.mounted.delete(entry.island)
    entry.handle = null
    entry.island.removeAttribute(LIVE_ATTR)
  }
}

/** An open block: its frame and header show (the code beside the preview, or the preview alone). */
function isOpen(pre: Element): boolean {
  const state = pre.getAttribute(STATE_ATTR)
  return state === 'edit' || state === 'preview'
}

function errorNode(message: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'dsk-wysiwyg__preview-error'
  el.setAttribute('role', 'alert')
  el.textContent = message
  return el
}
