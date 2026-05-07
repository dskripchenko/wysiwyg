<script setup lang="ts">
/**
 * DskWysiwyg — Vue 3 WYSIWYG-редактор без сторонних editor-движков.
 *
 * Внутри — contenteditable div + EditorController (см. ./engine).
 * v-model — HTML-string (sanitized).
 *
 * Архитектура:
 *   - Toolbar шлёт команды через `controller.chain()`.
 *   - Editable host эмитит native `input`-события при ручном вводе;
 *     onInput → throttled history snapshot → emit update:modelValue.
 *   - selectionchange (document) → инкремент selectionVersion → toolbar
 *     пересчитывает is-active.
 *   - paste → sanitize input → insertHTML.
 *   - Image: emit('image-request') host подключает upload, затем
 *     зовёт `controller.chain().focus().setImage(url).run()`.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { EditorController, sanitizeHtml } from './engine'
import { applyMarkdownShortcut } from './engine/markdownShortcuts'
import { highlight } from './engine/highlight'
import DskWysiwygToolbar, { type ToolbarItem } from './DskWysiwygToolbar.vue'
import DskWysiwygSlashMenu from './DskWysiwygSlashMenu.vue'

interface Props {
  modelValue?: string
  placeholder?: string
  toolbar?: boolean
  toolbarItems?: ToolbarItem[]
  readonly?: boolean
  minHeight?: string
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Введите текст…',
  toolbar: true,
  toolbarItems: undefined,
  readonly: false,
  minHeight: '200px',
  maxHeight: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [html: string]
  'image-request': []
  'link-request': [currentUrl: string | null]
  ready: [controller: EditorController]
}>()

const hostRef = ref<HTMLElement | null>(null)
const slashMenuRef = ref<InstanceType<typeof DskWysiwygSlashMenu> | null>(null)
/** Source-mode: показываем raw-HTML в textarea, hostRef скрыт. */
const sourceMode = ref<boolean>(false)
const sourceValue = ref<string>('')
/** State slash-меню: при вводе `/` открываем popup. */
const slashOpen = ref<boolean>(false)
const slashQuery = ref<string>('')
const slashTop = ref<number>(0)
const slashLeft = ref<number>(0)
/** Range, на котором был набран `/` — нужен для удаления при выборе. */
let slashRange: Range | null = null
// shallowRef — EditorController не должен быть deep-proxy'нут, иначе
// Vue теряет приватные fields (history). Класс остаётся raw.
const controller = shallowRef<EditorController | null>(null)
const selectionVersion = ref<number>(0)
const isEmpty = ref<boolean>(true)

let onSelectionChange: (() => void) | null = null

onMounted(() => {
  if (!hostRef.value) return
  // Подсказка Chrome'у — при splitе block'ов использовать <p>, а не <div>.
  // execCommand deprecated, но defaultParagraphSeparator до сих пор
  // единственный способ повлиять на default-Enter-поведение. Свой
  // handleEnter ниже всё равно перехватывает большинство случаев.
  try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* no-op */ }
  const c = new EditorController(hostRef.value)
  c.setContent(props.modelValue)
  controller.value = c
  isEmpty.value = c.isEmpty()
  emit('ready', c)

  onSelectionChange = (): void => {
    if (! hostRef.value) return
    if (document.activeElement === hostRef.value || hostRef.value.contains(document.activeElement)) {
      selectionVersion.value++
    }
  }
  document.addEventListener('selectionchange', onSelectionChange)
})

onBeforeUnmount(() => {
  if (onSelectionChange) {
    document.removeEventListener('selectionchange', onSelectionChange)
  }
  controller.value?.destroy()
})

watch(
  () => props.modelValue,
  (next) => {
    if (!controller.value) return
    if (next === controller.value.getHTML()) return
    controller.value.setContent(next)
    isEmpty.value = controller.value.isEmpty()
  },
)

function onInput(): void {
  if (!controller.value || !hostRef.value) return
  // Markdown shortcuts: после input проверяем не нужно ли заменить
  // префикс блока на heading/list/quote/codeblock.
  const shortcut = applyMarkdownShortcut(hostRef.value)
  if (shortcut.applied) {
    controller.value.history.commit()
  } else {
    controller.value.history.commitThrottled()
  }
  // Slash-menu detection: ищем `/...` в текущем блоке от начала строки.
  updateSlashMenu()
  isEmpty.value = controller.value.isEmpty()
  emit('update:modelValue', controller.value.getHTML())
}

/**
 * Обновляет state slash-меню на основе текущего caret.
 * Открывает popup, если в текущем блоке текст начинается с `/` и каретка
 * стоит сразу после введённого `/query`. Закрывает иначе.
 */
function updateSlashMenu(): void {
  const sel = window.getSelection()
  if (! sel || sel.rangeCount === 0 || ! hostRef.value) {
    closeSlashMenu()
    return
  }
  const range = sel.getRangeAt(0)
  if (! range.collapsed) { closeSlashMenu(); return }
  if (! hostRef.value.contains(range.startContainer)) { closeSlashMenu(); return }
  // Берём текущий блок (li/p/h1/…) и его текст до caret'а.
  const blockEl = findBlockAncestor(range.startContainer)
  if (! blockEl) { closeSlashMenu(); return }

  const beforeText = textBeforeCaret(blockEl, range)
  const match = beforeText.match(/^\/([\w-]*)$/)
  if (! match) { closeSlashMenu(); return }

  slashQuery.value = match[1]
  // Запоминаем range, который стоит на конце `/query` — его удаляем при выборе.
  slashRange = document.createRange()
  slashRange.setStart(blockEl, 0)
  slashRange.setEnd(range.endContainer, range.endOffset)

  // Позиционируем popup под caret'ом.
  const rect = caretRect(range)
  if (rect) {
    slashTop.value = rect.bottom + 4
    slashLeft.value = rect.left
  }
  slashOpen.value = true
}

function closeSlashMenu(): void {
  if (! slashOpen.value) return
  slashOpen.value = false
  slashQuery.value = ''
  slashRange = null
}

/** Блок считается пустым, если textContent состоит из пробелов/ZWSP, и нет img/hr внутри. */
function isEmptyBlock(el: HTMLElement): boolean {
  if (el.querySelector('img, hr')) return false
  const text = (el.textContent ?? '').replace(/[​\s]/g, '')
  return text === ''
}

function findBlockAncestor(node: Node): HTMLElement | null {
  let n: Node | null = node
  while (n && n !== hostRef.value) {
    if (n instanceof HTMLElement) {
      const tag = n.tagName.toLowerCase()
      if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'td', 'th'].includes(tag)) {
        return n
      }
    }
    n = n.parentNode
  }
  return null
}

function textBeforeCaret(blockEl: HTMLElement, range: Range): string {
  const r = document.createRange()
  r.selectNodeContents(blockEl)
  r.setEnd(range.endContainer, range.endOffset)
  return r.toString()
}

function caretRect(range: Range): DOMRect | null {
  const rects = range.getClientRects()
  if (rects.length > 0) return rects[0]
  // Collapsed range без rects — вставляем zero-width span.
  const span = document.createElement('span')
  span.appendChild(document.createTextNode('​'))
  range.insertNode(span)
  const rect = span.getBoundingClientRect()
  span.remove()
  return rect
}

function onSlashSelect(cmd: { apply: (c: EditorController) => void }): void {
  if (! controller.value || ! hostRef.value || ! slashRange) {
    closeSlashMenu()
    return
  }
  // Удаляем `/query` текст перед применением команды.
  slashRange.deleteContents()
  const sel = window.getSelection()
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(slashRange)
  }
  closeSlashMenu()
  cmd.apply(controller.value)
  controller.value.history.commit()
  emit('update:modelValue', controller.value.getHTML())
}

/**
 * Apply syntax-highlight ко всем <pre><code class="language-X">…</code></pre>
 * блокам после blur'а — на input делать нельзя, sets innerHTML ломает caret.
 */
function onBlur(): void {
  if (!hostRef.value || !controller.value) return
  // mousedown.prevent в slash-меню сохраняет селекцию, поэтому
  // закрытие на blur для слэш-меню безопасно — выбор уже произошёл.
  closeSlashMenu()
  const codes = hostRef.value.querySelectorAll<HTMLElement>('pre > code[class*="language-"]')
  let dirty = false
  for (const code of Array.from(codes)) {
    const cls = code.className.match(/language-([\w-]+)/)
    if (! cls) continue
    const lang = cls[1]
    const text = code.textContent ?? ''
    const newHtml = highlight(text, lang)
    if (code.innerHTML !== newHtml) {
      code.innerHTML = newHtml
      dirty = true
    }
  }
  if (dirty) {
    emit('update:modelValue', controller.value.getHTML())
  }
}

/**
 * Toggle между WYSIWYG и raw-HTML.
 * - В source: getHTML() → textarea, hostRef скрывается.
 * - Назад в WYSIWYG: setContent(textarea) с sanitize, history-snapshot.
 */
function toggleSource(): void {
  if (! controller.value) return
  if (! sourceMode.value) {
    sourceValue.value = controller.value.getHTML()
    sourceMode.value = true
    return
  }
  const next = sourceValue.value
  controller.value.setContent(next)
  // setContent делает history.reset, но мы хотим сохранить undo через chain.
  controller.value.history.commit()
  isEmpty.value = controller.value.isEmpty()
  emit('update:modelValue', controller.value.getHTML())
  sourceMode.value = false
}

function onSourceInput(e: Event): void {
  sourceValue.value = (e.target as HTMLTextAreaElement).value
  // В source-режиме v-model обновляется по live-вводу — content уже HTML,
  // но без sanitize. Делаем lightweight sanitize при getHTML→emit?
  // Проще: emit live с сырым значением, sanitize сработает только при
  // toggle обратно. Это как в Tiptap source-view'ах.
  emit('update:modelValue', sourceValue.value)
}

function onPaste(e: ClipboardEvent): void {
  if (!controller.value || !e.clipboardData) return
  const html = e.clipboardData.getData('text/html')
  const text = e.clipboardData.getData('text/plain')
  e.preventDefault()
  const cleaned = html ? sanitizeHtml(html) : escapePlainText(text)
  insertAtCaret(cleaned)
  controller.value.history.commit()
  isEmpty.value = controller.value.isEmpty()
  emit('update:modelValue', controller.value.getHTML())
}

function escapePlainText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => `<p>${l.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] ?? c))}</p>`)
    .join('')
}

function insertAtCaret(html: string): void {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const fragment = document.createDocumentFragment()
  while (tmp.firstChild) fragment.appendChild(tmp.firstChild)
  const lastNode = fragment.lastChild
  range.insertNode(fragment)
  if (lastNode) {
    range.setStartAfter(lastNode)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

/**
 * Собственный split-block для Enter. Делит текущий блок на caret'е,
 * хвост уезжает в новый <p>. Активные inline-marks (<strong>/<em>/…)
 * НЕ клонируются — новый блок начинается с чистого state'а.
 *
 * Возвращает true, если split произошёл (host.preventDefault уже вызван).
 * False — пусть Chrome обработает (внутри <li>, <pre>, или нет селекции).
 */
function handleEnter(e: KeyboardEvent): boolean {
  if (! hostRef.value || ! controller.value) return false
  const sel = window.getSelection()
  if (! sel || sel.rangeCount === 0) return false
  const range = sel.getRangeAt(0)
  if (! hostRef.value.contains(range.startContainer)) return false

  const block = findBlockAncestor(range.startContainer)
  if (! block) return false
  const tag = block.tagName.toLowerCase()

  // Внутри пустого <li> на двойной Enter — выходим из списка:
  // создаём <p> после <ul>/<ol>, удаляем пустой li.
  if (tag === 'li') {
    if (isEmptyBlock(block)) {
      const list = block.parentElement
      if (list && (list.tagName.toLowerCase() === 'ul' || list.tagName.toLowerCase() === 'ol')) {
        e.preventDefault()
        block.remove()
        const p = document.createElement('p')
        p.appendChild(document.createElement('br'))
        list.after(p)
        if (list.children.length === 0) list.remove()
        const r = document.createRange()
        r.setStart(p, 0)
        r.collapse(true)
        sel.removeAllRanges()
        sel.addRange(r)
        hostRef.value.dispatchEvent(new InputEvent('input', { bubbles: true }))
        return true
      }
    }
    // Непустой li — пусть Chrome создаст новый <li> сам.
    return false
  }

  // Внутри pre/td/th — пусть Chrome делит сам.
  if (tag === 'pre' || tag === 'td' || tag === 'th') return false

  e.preventDefault()
  if (! range.collapsed) range.deleteContents()

  // Вырезаем всё после caret в block'е.
  const tail = document.createRange()
  tail.setStart(range.endContainer, range.endOffset)
  tail.setEnd(block, block.childNodes.length)
  const tailFragment = tail.extractContents()

  // Чистим pure-empty inline wrappers (например <strong></strong> от
  // только что закрытой mark'и) — берём только текстовое содержимое.
  const newBlock = document.createElement('p')
  newBlock.appendChild(tailFragment)
  if (newBlock.childNodes.length === 0 || newBlock.textContent === '') {
    newBlock.replaceChildren(document.createElement('br'))
  }
  block.after(newBlock)

  // Caret в начало newBlock.
  const r = document.createRange()
  r.setStart(newBlock, 0)
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)

  hostRef.value.dispatchEvent(new InputEvent('input', { bubbles: true }))
  return true
}

function onKeydown(e: KeyboardEvent): void {
  if (!controller.value) return
  // Slash-menu navigation перехватываем до hotkeys.
  if (slashOpen.value && slashMenuRef.value) {
    if (e.key === 'ArrowDown') { e.preventDefault(); slashMenuRef.value.moveDown(); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); slashMenuRef.value.moveUp(); return }
    if (e.key === 'Enter')     {
      if (slashMenuRef.value.hasItems()) {
        e.preventDefault()
        slashMenuRef.value.selectActive()
        return
      }
    }
    if (e.key === 'Escape')    { e.preventDefault(); closeSlashMenu(); return }
  }
  // Свой Enter handler: split block в новый <p> без клонирования
  // inline-marks. Без этого Chrome тянет активный <strong>/<em>/… в
  // следующую строку и каждая новая строка получается в bold.
  if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (handleEnter(e)) return
  }
  const meta = e.metaKey || e.ctrlKey
  if (!meta) return
  const k = e.key.toLowerCase()
  if (k === 'b') { e.preventDefault(); controller.value.chain().focus().bold().run() }
  else if (k === 'i') { e.preventDefault(); controller.value.chain().focus().italic().run() }
  else if (k === 'u') { e.preventDefault(); controller.value.chain().focus().underline().run() }
  else if (k === 'z' && !e.shiftKey) { e.preventDefault(); controller.value.chain().undo().run(); emit('update:modelValue', controller.value.getHTML()) }
  else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); controller.value.chain().redo().run(); emit('update:modelValue', controller.value.getHTML()) }
}

const wrapStyle = computed(() => ({
  '--dsk-wysiwyg-min-height': props.minHeight,
  '--dsk-wysiwyg-max-height': props.maxHeight ?? 'none',
}))

defineExpose({
  get controller() { return controller.value },
})
</script>

<template>
  <div :class="['dsk-wysiwyg', { 'dsk-wysiwyg--readonly': readonly, 'dsk-wysiwyg--empty': isEmpty }]" :style="wrapStyle">
    <DskWysiwygToolbar
      v-if="toolbar && !readonly"
      :controller="controller"
      :items="toolbarItems"
      :selection-version="selectionVersion"
      :source-active="sourceMode"
      @image-request="emit('image-request')"
      @link-request="(url) => emit('link-request', url)"
      @toggle-source="toggleSource"
    />
    <textarea
      v-if="sourceMode"
      class="dsk-wysiwyg__source"
      :value="sourceValue"
      :placeholder="placeholder"
      spellcheck="false"
      @input="onSourceInput"
    />
    <div
      v-show="!sourceMode"
      ref="hostRef"
      class="dsk-wysiwyg__content"
      :contenteditable="!readonly"
      :data-placeholder="placeholder"
      role="textbox"
      aria-multiline="true"
      :spellcheck="true"
      @input="onInput"
      @blur="onBlur"
      @paste="onPaste"
      @keydown="onKeydown"
    />
    <DskWysiwygSlashMenu
      ref="slashMenuRef"
      :open="slashOpen"
      :controller="controller"
      :query="slashQuery"
      :top="slashTop"
      :left="slashLeft"
      @select="onSlashSelect"
      @close="closeSlashMenu"
    />
  </div>
</template>

<style src="./style.css"></style>
