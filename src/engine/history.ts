/**
 * The history stack: throttled snapshots of the editor's innerHTML.
 *
 * The browser-native undo for a contenteditable is unstable (especially after
 * programmatic mutations through the DOM API), so we keep a stack of our own.
 *
 * The contract:
 *   const h = new HistoryStack(host)
 *   h.commit()             // save a snapshot after a command or input (auto throttled)
 *   h.undo() / h.redo()    // restore the innerHTML
 *   h.canUndo / h.canRedo  // boolean flags
 *
 * The throttle: while text is being typed the snapshots are taken no more often
 * than every TYPING_THROTTLE ms (so as not to breed a snapshot per keystroke).
 * On a commit outside the throttle a snapshot is mandatory.
 */
export class HistoryStack {
  private stack: string[] = []
  private cursor = -1
  private lastCommitAt = 0
  private host: HTMLElement
  private throttleMs: number
  private maxSize: number

  constructor(host: HTMLElement, opts: { throttleMs?: number; maxSize?: number } = {}) {
    this.host = host
    this.throttleMs = opts.throttleMs ?? 350
    this.maxSize = opts.maxSize ?? 100
    this.snapshot()
  }

  /** The current snapshot (the innerHTML). */
  snapshot(): void {
    const html = this.host.innerHTML
    if (this.cursor >= 0 && this.stack[this.cursor] === html) return
    // The forward history after the current cursor is dropped (any edit after an undo).
    this.stack = this.stack.slice(0, this.cursor + 1)
    this.stack.push(html)
    if (this.stack.length > this.maxSize) {
      this.stack.shift()
    } else {
      this.cursor++
    }
    this.lastCommitAt = Date.now()
  }

  /** A throttled commit — for onInput while typing. */
  commitThrottled(): void {
    if (Date.now() - this.lastCommitAt < this.throttleMs) return
    this.snapshot()
  }

  /** A forced commit — for the commands coming from the toolbar. */
  commit(): void {
    this.snapshot()
  }

  get canUndo(): boolean {
    return this.cursor > 0
  }

  get canRedo(): boolean {
    return this.cursor < this.stack.length - 1
  }

  undo(): void {
    if (! this.canUndo) return
    this.cursor--
    this.host.innerHTML = this.stack[this.cursor]
  }

  redo(): void {
    if (! this.canRedo) return
    this.cursor++
    this.host.innerHTML = this.stack[this.cursor]
  }

  reset(html: string): void {
    this.stack = [html]
    this.cursor = 0
    this.lastCommitAt = Date.now()
  }
}
