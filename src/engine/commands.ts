/**
 * Команды editor'а — собственная реализация поверх Selection/Range API.
 * Не используем `document.execCommand` (deprecated, нестабильное
 * поведение между браузерами).
 *
 * Каждая команда:
 *   1. Получает Range внутри host'а.
 *   2. Применяет DOM-мутацию (toggle-tag вокруг range / replace block-tag).
 *   3. Восстанавливает selection.
 *   4. Эмитит change через CustomEvent('input', {bubbles: true}) на host'е,
 *      чтобы Vue v-model подхватил.
 */
import {
  currentBlockTag,
  findAncestorAnchor,
  rangeWithinHost,
} from './selection'

function emitInput(host: HTMLElement): void {
  host.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }))
}

/* ------------------------------------------------------------------ */
/* Inline marks (bold / italic / underline / strike / code)            */
/* ------------------------------------------------------------------ */

/**
 * Toggle inline-mark вокруг текущего range. Если selection пустой —
 * создаём пустой mark (cursor внутрь, дальнейший ввод будет marked).
 */
export function toggleInlineMark(host: HTMLElement, tag: string): void {
  const range = rangeWithinHost(host)
  if (!range) return

  if (range.collapsed) {
    const inside = nearestAncestor(range.startContainer, host, tag)
    if (inside) {
      // Caret уже внутри active-mark — "выходим" из неё. Ставим caret сразу
      // после ancestor'а в zero-width text node, чтобы дальнейший ввод
      // лёг рядом с mark, а не вложенно.
      const exit = document.createTextNode('​')
      inside.after(exit)
      const sel = window.getSelection()
      if (sel) {
        const r = document.createRange()
        r.setStart(exit, 1)
        r.collapse(true)
        sel.removeAllRanges()
        sel.addRange(r)
      }
      emitInput(host)
      return
    }
    // Пустой mark на caret'е: вставляем <tag>&#8203;</tag> и ставим
    // курсор внутри, чтобы ввод применился к нему. ZWSP-character
    // даёт возможность браузеру ставить cursor внутри пустого инлайна.
    const el = document.createElement(tag)
    el.appendChild(document.createTextNode('​'))
    range.insertNode(el)
    const sel = window.getSelection()
    if (sel) {
      const r = document.createRange()
      r.setStart(el.firstChild!, 1)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
    }
    emitInput(host)
    return
  }

  // Если selection целиком внутри уже-окружающего <tag> — снимаем mark.
  const ancestor = nearestAncestor(range.startContainer, host, tag)
  if (ancestor && ancestor.contains(range.endContainer)) {
    unwrapElement(ancestor)
    emitInput(host)
    return
  }

  // Иначе — оборачиваем содержимое selection в <tag>.
  const wrapper = document.createElement(tag)
  try {
    wrapper.appendChild(range.extractContents())
    range.insertNode(wrapper)
    // Recreate selection inside wrapper.
    const sel = window.getSelection()
    if (sel) {
      const r = document.createRange()
      r.selectNodeContents(wrapper)
      sel.removeAllRanges()
      sel.addRange(r)
    }
  } catch {
    // Range спанит несколько block'ов — fallback: оборачиваем text-only.
    return
  }
  emitInput(host)
}

function nearestAncestor(start: Node, host: HTMLElement, tag: string): HTMLElement | null {
  let n: Node | null = start
  while (n && n !== host) {
    if (n instanceof HTMLElement && n.tagName.toLowerCase() === tag) return n
    n = n.parentNode
  }
  return null
}

function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

/* ------------------------------------------------------------------ */
/* Block-level format (paragraph / h1-h3 / blockquote / pre)           */
/* ------------------------------------------------------------------ */

/**
 * Устанавливает block-level тэг на ВСЕ блоки, пересекаемые selection.
 * Если selection collapsed — меняет только текущий блок.
 *
 * Если targetTag === currentBlockTag → toggle на 'p' (paragraph).
 */
export function setBlockTag(host: HTMLElement, targetTag: string): void {
  const range = rangeWithinHost(host)
  if (!range) return
  const currentTag = currentBlockTag(host)
  const final = currentTag === targetTag ? 'p' : targetTag

  // Собираем все block-ancestor'ы пересекаемые selection.
  const blocks = collectBlockAncestors(range, host)
  if (blocks.length === 0) {
    // Selection в текстовом узле прямо в host'е — оборачиваем в <p>
    // и применяем targetTag.
    return
  }
  for (const block of blocks) {
    if (block.tagName.toLowerCase() === final) continue
    const replacement = document.createElement(final)
    while (block.firstChild) replacement.appendChild(block.firstChild)
    block.replaceWith(replacement)
  }
  emitInput(host)
}

function collectBlockAncestors(range: Range, host: HTMLElement): HTMLElement[] {
  const result = new Set<HTMLElement>()
  const startBlock = blockAncestor(range.startContainer, host)
  const endBlock = blockAncestor(range.endContainer, host)
  if (startBlock) result.add(startBlock)
  if (endBlock) result.add(endBlock)
  // Для cross-block selection — добавляем все блоки между.
  if (startBlock && endBlock && startBlock !== endBlock) {
    const all = Array.from(host.querySelectorAll<HTMLElement>('p, h1, h2, h3, blockquote, pre, li'))
    let inside = false
    for (const el of all) {
      if (el === startBlock) inside = true
      if (inside) result.add(el)
      if (el === endBlock) break
    }
  }
  return Array.from(result)
}

function blockAncestor(start: Node, host: HTMLElement): HTMLElement | null {
  const blockTags = ['p', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'li']
  let n: Node | null = start
  while (n && n !== host) {
    if (n instanceof HTMLElement && blockTags.includes(n.tagName.toLowerCase())) {
      return n
    }
    n = n.parentNode
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Lists (ul / ol)                                                     */
/* ------------------------------------------------------------------ */

export function toggleList(host: HTMLElement, listTag: 'ul' | 'ol'): void {
  const range = rangeWithinHost(host)
  if (!range) return
  // Проверяем, не находимся ли мы уже в нужном типе списка.
  let n: Node | null = range.startContainer
  while (n && n !== host) {
    if (n instanceof HTMLElement) {
      const t = n.tagName.toLowerCase()
      if (t === 'ul' || t === 'ol') {
        if (t === listTag) {
          // Снять список — заменить ul/ol на серию <p>.
          unwrapList(n)
        } else {
          // Поменять тип списка.
          const replacement = document.createElement(listTag)
          while (n.firstChild) replacement.appendChild(n.firstChild)
          n.replaceWith(replacement)
        }
        emitInput(host)
        return
      }
    }
    n = n.parentNode
  }
  // Не в списке — оборачиваем block в <ul/ol><li>
  const block = blockAncestor(range.startContainer, host)
  if (!block) return
  const list = document.createElement(listTag)
  const li = document.createElement('li')
  while (block.firstChild) li.appendChild(block.firstChild)
  list.appendChild(li)
  block.replaceWith(list)
  emitInput(host)
}

function unwrapList(list: HTMLElement): void {
  const parent = list.parentNode
  if (!parent) return
  for (const li of Array.from(list.children)) {
    if (li.tagName.toLowerCase() !== 'li') continue
    const p = document.createElement('p')
    while (li.firstChild) p.appendChild(li.firstChild)
    parent.insertBefore(p, list)
  }
  parent.removeChild(list)
}

/* ------------------------------------------------------------------ */
/* Link                                                                */
/* ------------------------------------------------------------------ */

export function setLink(host: HTMLElement, url: string | null): void {
  const range = rangeWithinHost(host)
  if (!range) return
  const existing = findAncestorAnchor(host)
  if (existing) {
    if (url === null || url === '') {
      unwrapElement(existing)
      emitInput(host)
      return
    }
    existing.setAttribute('href', url)
    emitInput(host)
    return
  }
  if (url === null || url === '' || range.collapsed) return
  const a = document.createElement('a')
  a.setAttribute('href', url)
  a.setAttribute('rel', 'noopener noreferrer')
  a.setAttribute('target', '_blank')
  try {
    a.appendChild(range.extractContents())
    range.insertNode(a)
    emitInput(host)
  } catch {
    /* ignore cross-block range */
  }
}

/* ------------------------------------------------------------------ */
/* Image                                                               */
/* ------------------------------------------------------------------ */

export function insertImage(host: HTMLElement, src: string, alt = ''): void {
  const range = rangeWithinHost(host)
  if (!range) return
  const img = document.createElement('img')
  img.src = src
  if (alt) img.alt = alt
  range.deleteContents()
  range.insertNode(img)
  // Move cursor after image.
  range.setStartAfter(img)
  range.collapse(true)
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
  emitInput(host)
}

/* ------------------------------------------------------------------ */
/* Horizontal rule                                                     */
/* ------------------------------------------------------------------ */

export function insertHorizontalRule(host: HTMLElement): void {
  const range = rangeWithinHost(host)
  if (!range) return
  const hr = document.createElement('hr')
  range.deleteContents()
  range.insertNode(hr)
  // Insert empty <p> after hr to give caret a target.
  const p = document.createElement('p')
  p.appendChild(document.createElement('br'))
  hr.after(p)
  range.setStart(p, 0)
  range.collapse(true)
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
  emitInput(host)
}
