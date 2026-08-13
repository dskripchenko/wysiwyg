<script setup lang="ts">
/**
 * DskWysiwyg — a Vue 3 WYSIWYG editor without any third-party editor engine.
 *
 * Inside there is a contenteditable div plus an EditorController (see ./engine).
 * The v-model is an HTML string (sanitized).
 *
 * The architecture:
 *   - the toolbar sends commands through `controller.chain()`;
 *   - the editable host emits native `input` events on manual typing;
 *     onInput → a throttled history snapshot → emit update:modelValue;
 *   - selectionchange (on the document) → selectionVersion is incremented →
 *     the toolbar recomputes is-active;
 *   - paste → sanitize the input → insertHTML;
 *   - images: emit('image-request'), the host wires up the upload and then
 *     calls `controller.chain().focus().setImage(url).run()`.
 */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { EditorController, sanitizeHtml } from './engine'
import { applyMarkdownShortcut } from './engine/markdownShortcuts'
import { highlight } from './engine/highlight'
import { beautifyHtml, minifyHtml } from './engine/format'
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
  /** Whether the user may change the widget's height (the resize handle below). */
  resizable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Введите текст…',
  toolbar: true,
  toolbarItems: undefined,
  readonly: false,
  minHeight: '200px',
  maxHeight: undefined,
  resizable: true,
})

const emit = defineEmits<{
  'update:modelValue': [html: string]
  'image-request': []
  'link-request': [currentUrl: string | null]
  ready: [controller: EditorController]
}>()

const hostRef = ref<HTMLElement | null>(null)
const slashMenuRef = ref<InstanceType<typeof DskWysiwygSlashMenu> | null>(null)
/** Source mode: the raw HTML is shown in a textarea and hostRef is hidden. */
const sourceMode = ref<boolean>(false)
const sourceValue = ref<string>('')
const sourceHighlightRef = ref<HTMLElement | null>(null)
/** The highlighted HTML for the overlay pre under the textarea. The trailing
 *  \n keeps the empty last line so that the pre and the textarea do not
 *  diverge in height. */
const highlightedSource = computed<string>(() => highlight(sourceValue.value + '\n', 'html'))

function onSourceScroll(e: Event): void {
  const ta = e.target as HTMLTextAreaElement
  if (sourceHighlightRef.value) {
    sourceHighlightRef.value.scrollTop = ta.scrollTop
    sourceHighlightRef.value.scrollLeft = ta.scrollLeft
  }
}
/** The state of the slash menu: typing `/` opens the popup. */
const slashOpen = ref<boolean>(false)
const slashQuery = ref<string>('')
const slashTop = ref<number>(0)
const slashLeft = ref<number>(0)
/** The range the `/` was typed on — needed to delete it on a selection. */
let slashRange: Range | null = null
// shallowRef — the EditorController must not be deep-proxied, otherwise Vue
// loses the private fields (the history). The class stays raw.
const controller = shallowRef<EditorController | null>(null)
const selectionVersion = ref<number>(0)
const isEmpty = ref<boolean>(true)

let onSelectionChange: (() => void) | null = null

onMounted(() => {
  if (!hostRef.value) return
  // A hint to Chrome: use <p> rather than <div> when splitting blocks.
  // execCommand is deprecated, but defaultParagraphSeparator is still the only
  // way to influence the default Enter behaviour. Our own handleEnter below
  // intercepts most cases anyway.
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
  // Markdown shortcuts: after an input we check whether the block's prefix
  // should be replaced by a heading/list/quote/code block.
  const shortcut = applyMarkdownShortcut(hostRef.value)
  if (shortcut.applied) {
    controller.value.history.commit()
  } else {
    controller.value.history.commitThrottled()
  }
  // Slash-menu detection: we look for `/...` in the current block from the start of the line.
  updateSlashMenu()
  isEmpty.value = controller.value.isEmpty()
  emit('update:modelValue', controller.value.getHTML())
}

/**
 * Updates the slash menu's state from the current caret.
 * It opens the popup when the text of the current block starts with `/` and the
 * caret stands right after the typed `/query`. Otherwise it closes it.
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
  // We take the current block (li/p/h1/...) and its text up to the caret.
  const blockEl = findBlockAncestor(range.startContainer)
  if (! blockEl) { closeSlashMenu(); return }

  const beforeText = textBeforeCaret(blockEl, range)
  const match = beforeText.match(/^\/([\w-]*)$/)
  if (! match) { closeSlashMenu(); return }

  slashQuery.value = match[1]
  // We remember the range at the end of `/query` — it is deleted on a selection.
  slashRange = document.createRange()
  slashRange.setStart(blockEl, 0)
  slashRange.setEnd(range.endContainer, range.endOffset)

  // The popup is positioned under the caret.
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

/** A block counts as empty when its textContent is spaces or ZWSP and there is no img or hr inside. */
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
  // A collapsed range with no rects — we insert a zero-width span.
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
  // The `/query` text is deleted before the command is applied.
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
 * Applies the syntax highlight to every <pre><code class="language-X">...</code></pre>
 * block after a blur — it cannot be done on input, since setting innerHTML
 * breaks the caret.
 */
function onBlur(): void {
  if (!hostRef.value || !controller.value) return
  // mousedown.prevent in the slash menu preserves the selection, so closing on
  // blur is safe for it — the choice has already been made.
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
 * Toggling between WYSIWYG and raw HTML.
 * - Into source: getHTML() → the textarea, hostRef is hidden.
 * - Back into WYSIWYG: setContent(textarea) with a sanitize and a history
 *   snapshot.
 */
function toggleSource(): void {
  if (! controller.value) return
  if (! sourceMode.value) {
    // In source mode we show beautified HTML, for comfortable reading and editing.
    sourceValue.value = beautifyHtml(controller.value.getHTML())
    sourceMode.value = true
    return
  }
  // Back into WYSIWYG: minify (the whitespace between block tags is collapsed)
  // → setContent (sanitize) → emit. Compact HTML is what reaches the database.
  const compact = minifyHtml(sourceValue.value)
  controller.value.setContent(compact)
  controller.value.history.commit()
  isEmpty.value = controller.value.isEmpty()
  emit('update:modelValue', controller.value.getHTML())
  sourceMode.value = false
}

function onSourceInput(e: Event): void {
  sourceValue.value = (e.target as HTMLTextAreaElement).value
  // In source mode we emit the minified variant — the host sees compact HTML in
  // the v-model even before toggling back. What is visible in the textarea stays
  // beautified (that is controlled by sourceValue).
  emit('update:modelValue', minifyHtml(sourceValue.value))
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
 * Our own block split for Enter. It divides the current block at the caret and
 * the tail moves into a new <p>. The active inline marks (<strong>/<em>/...) are
 * NOT cloned — the new block starts from a clean state.
 *
 * Returns true when a split happened (host.preventDefault has already been
 * called). False means "let Chrome handle it" (inside a <li>, a <pre>, or with
 * no selection).
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

  // A double Enter inside an empty <li> leaves the list: we create a <p> after
  // the <ul>/<ol> and delete the empty li.
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
    // For a non-empty li, let Chrome create the new <li> itself.
    return false
  }

  // Inside a pre/td/th, let Chrome do the splitting itself.
  if (tag === 'pre' || tag === 'td' || tag === 'th') return false

  e.preventDefault()
  if (! range.collapsed) range.deleteContents()

  // Everything after the caret in the block is cut out.
  const tail = document.createRange()
  tail.setStart(range.endContainer, range.endOffset)
  tail.setEnd(block, block.childNodes.length)
  const tailFragment = tail.extractContents()

  // We clean out the purely empty inline wrappers (a <strong></strong> from a
  // mark that has just been closed, say) — only the text content is taken.
  const newBlock = document.createElement('p')
  newBlock.appendChild(tailFragment)
  if (newBlock.childNodes.length === 0 || newBlock.textContent === '') {
    newBlock.replaceChildren(document.createElement('br'))
  }
  block.after(newBlock)

  // The caret goes to the start of newBlock.
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
  // The slash-menu navigation is intercepted before the hotkeys.
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
  // Our own Enter handler: it splits the block into a new <p> without cloning
  // the inline marks. Without this Chrome drags the active <strong>/<em>/... into
  // the next line and every new line comes out bold.
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
  <div :class="['dsk-wysiwyg', { 'dsk-wysiwyg--readonly': readonly, 'dsk-wysiwyg--empty': isEmpty, 'dsk-wysiwyg--resizable': resizable && !readonly }]" :style="wrapStyle">
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
    <div v-if="sourceMode" class="dsk-wysiwyg__source-wrap">
      <pre
        ref="sourceHighlightRef"
        class="dsk-wysiwyg__source-highlight"
        aria-hidden="true"
        v-html="highlightedSource"
      />
      <textarea
        class="dsk-wysiwyg__source"
        :value="sourceValue"
        :placeholder="placeholder"
        spellcheck="false"
        @input="onSourceInput"
        @scroll="onSourceScroll"
      />
    </div>
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
