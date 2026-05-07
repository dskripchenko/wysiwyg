/**
 * Editor engine — точка входа для команд и состояния editor'а.
 *
 * Вне Vue-компонента: класс `EditorController`, который держит ссылку
 * на host (contenteditable div), history-stack и удобные API'и для
 * toolbar'а: `chain().bold().run()`, `isActive('bold')`, и т.д.
 *
 * Стиль API намеренно похож на Tiptap (chain/run/isActive) — но без
 * peer-dep на Tiptap.
 */
import {
  insertHorizontalRule,
  insertImage,
  setBlockTag,
  setLink,
  toggleInlineMark,
  toggleList,
} from './commands'
import { HistoryStack } from './history'
import {
  currentBlockTag,
  findAncestorAnchor,
  isFormatActive,
  rangeWithinHost,
} from './selection'
import { sanitizeHtml } from './sanitize'
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

/**
 * Удаляет zero-width spaces (U+200B) из HTML — в DOM они нужны как
 * caret-target для пустых inline-mark'ов и exit-cursor'ов, но в
 * финальном HTML это мусор: невидимы пользователю, ломают сравнения,
 * раздувают БД. Применяется только при экспорте через getHTML().
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
  orderedList(): ChainAPI
  blockquote(): ChainAPI
  codeBlock(): ChainAPI
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
  /** Завершает chain — фиксирует history snapshot. */
  run(): void
}

export class EditorController {
  readonly host: HTMLElement
  readonly history: HistoryStack

  constructor(host: HTMLElement) {
    this.host = host
    this.history = new HistoryStack(host)
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

  getHTML(): string { return vacuumZwsp(this.host.innerHTML) }

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
      orderedList: () => { toggleList(this.host, 'ol'); dirty = true; return api },
      blockquote: () => { setBlockTag(this.host, 'blockquote'); dirty = true; return api },
      codeBlock: () => { setBlockTag(this.host, 'pre'); dirty = true; return api },
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

  /** Установить контент (sanitized) + reset history. */
  setContent(html: string): void {
    this.host.innerHTML = sanitizeHtml(html)
    // Если editor пустой — гарантируем хотя бы один блочный <p><br>,
    // чтобы пользовательский ввод сразу попадал в block-context.
    // Без этого markdown-shortcuts/handleEnter не могут найти blockAncestor.
    if (this.host.firstElementChild === null && (this.host.textContent ?? '') === '') {
      const p = document.createElement('p')
      p.appendChild(document.createElement('br'))
      this.host.appendChild(p)
    }
    this.history.reset(this.host.innerHTML)
  }

  /** Освободить ресурсы (history); host вызывает на unmount. */
  destroy(): void {
    /* ничего global'но не аттачили — просто заглушка для будущих
       async-cleanup'ов */
  }
}
