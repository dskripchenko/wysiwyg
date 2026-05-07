/**
 * Helpers поверх Selection API + Range API, специфичные для нашего
 * contenteditable-host'а.
 *
 * Главные операции:
 *   - rangeWithinHost(host) — получает текущий Range, только если он
 *     находится внутри `host`. Иначе null (selection вне editor'а).
 *   - saveRange / restoreRange — сохранение/восстановление позиции
 *     каретки до и после команды (например, для модального диалога ссылки).
 *   - isFormatActive(tag) — проверяет, находится ли начало selection
 *     внутри тэга `tag` (для toolbar active-state).
 *   - splitParagraphAtCaret — на Enter создаёт <p> наследующий формат.
 *
 * Работаем без execCommand там, где можем — execCommand deprecated,
 * но для базовых форматов (bold/italic) браузер-нативная реализация
 * быстрее и корректнее. См. commands.ts.
 */

export function getActiveSelection(): Selection | null {
  const sel = typeof window === 'undefined' ? null : window.getSelection()
  return sel && sel.rangeCount > 0 ? sel : null
}

/**
 * Возвращает текущий Range, если selection целиком внутри `host` (или
 * collapsed, но anchor внутри host'а). null — если selection вне.
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
 * Сохраняем range через offset'ы относительно host'а — это переживает
 * перерендер innerHTML (что нативный Range не умеет, потому что узлы
 * пересоздаются).
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
 * Считает абсолютный текстовый offset от host'а до (node, offset).
 * Учитывает все text nodes по DFS-порядку.
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
  // Если target — element, считаем offset как количество text-chars до
  // ребёнка с индексом offset.
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
  // Конец host'а — last text node либо host сам.
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
 * Обходит ancestor'ов от текущей anchor-node до host'а и проверяет
 * наличие тега из набора `tags`. Используется toolbar'ом для
 * active-state кнопки Bold/Italic/etc.
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
 * Возвращает ближайший block-level элемент (p/h1-3/li/blockquote/pre)
 * вверх от current selection. Используется для toolbar:
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
 * Получить ближайший <a> до host'а (для извлечения текущего href).
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
