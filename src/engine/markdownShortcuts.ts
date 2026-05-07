/**
 * Markdown-shortcuts: при наборе типичных markdown-префиксов в начале
 * блока автоматически конвертируем в соответствующий tag.
 *
 *   `# ` (Space)        → h1
 *   `## ` (Space)       → h2
 *   `### ` (Space)      → h3
 *   `- ` или `* `       → ul + li
 *   `1. ` (любая цифра) → ol + li
 *   `> ` (Space)        → blockquote
 *   ` ``` ` (3 backtick) → pre/code
 *
 * Вызывается из DskWysiwyg.vue в обработчике input-события (после того
 * как браузер вставил character). Работает только когда caret в начале
 * текстового узла, и всё содержимое до caret — markdown-prefix.
 */
import { rangeWithinHost } from './selection'

interface ShortcutResult {
  /** Применился ли shortcut. true → нужно вызвать history.commit. */
  applied: boolean
}

export function applyMarkdownShortcut(host: HTMLElement): ShortcutResult {
  const range = rangeWithinHost(host)
  if (!range || !range.collapsed) return { applied: false }

  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return { applied: false }

  const text = (node as Text).data
  const before = text.slice(0, range.startOffset)

  // Находим block-ancestor — заменяем именно его (а не текст узел в нём).
  const block = blockAncestor(node, host)
  if (!block) return { applied: false }

  // Shortcut должен быть в самом начале блока (только до caret = весь текст
  // первого text-node'а у block'а; либо block.firstChild === node и
  // before === text). Иначе ввод `# ` в середине абзаца не должен срабатывать.
  if (block.firstChild !== node) return { applied: false }
  if (before !== text) {
    // Caret не в конце text-content'а — если after-text непустой,
    // shortcut применять только если after === '' || after === '​'.
    const after = text.slice(range.startOffset)
    if (after.replace(/[​\s]/g, '') !== '') return { applied: false }
  }

  // Ищем match.
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

function replaceBlockTag(block: HTMLElement, newTag: string, host: HTMLElement): void {
  const replacement = document.createElement(newTag)
  // Убираем prefix-text — он же был markdown-маркером.
  // Затем переносим оставшееся содержимое (если есть) в новый tag.
  // Здесь оставшееся — пусто (обычно), потому что мы matched весь before.
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
