/**
 * History stack: snapshot'ы innerHTML editor'а с throttle'ом.
 *
 * Browser-native undo для contenteditable нестабилен (особенно после
 * программных мутаций через DOM API), поэтому держим собственный stack.
 *
 * Контракт:
 *   const h = new HistoryStack(host)
 *   h.commit()             // save snapshot после команды/ввода (auto throttled)
 *   h.undo() / h.redo()    // восстанавливают innerHTML
 *   h.canUndo / h.canRedo  // boolean флаги
 *
 * Throttle: snapshot'ы реже чем каждые TYPING_THROTTLE мс при наборе текста
 * (чтобы не плодить snapshot на каждую keystroke). При commit вне throttle —
 * snapshot обязателен.
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

  /** Текущий snapshot (innerHTML). */
  snapshot(): void {
    const html = this.host.innerHTML
    if (this.cursor >= 0 && this.stack[this.cursor] === html) return
    // Drop forward-history после current cursor (любая правка после undo).
    this.stack = this.stack.slice(0, this.cursor + 1)
    this.stack.push(html)
    if (this.stack.length > this.maxSize) {
      this.stack.shift()
    } else {
      this.cursor++
    }
    this.lastCommitAt = Date.now()
  }

  /** Throttled commit — для onInput при typing'е. */
  commitThrottled(): void {
    if (Date.now() - this.lastCommitAt < this.throttleMs) return
    this.snapshot()
  }

  /** Force commit — для команд после toolbar'а. */
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
