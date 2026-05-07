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
import DskWysiwygToolbar, { type ToolbarItem } from './DskWysiwygToolbar.vue'

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
// shallowRef — EditorController не должен быть deep-proxy'нут, иначе
// Vue теряет приватные fields (history). Класс остаётся raw.
const controller = shallowRef<EditorController | null>(null)
const selectionVersion = ref<number>(0)
const isEmpty = ref<boolean>(true)

let onSelectionChange: (() => void) | null = null

onMounted(() => {
  if (!hostRef.value) return
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
  if (!controller.value) return
  controller.value.history.commitThrottled()
  isEmpty.value = controller.value.isEmpty()
  emit('update:modelValue', controller.value.getHTML())
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

function onKeydown(e: KeyboardEvent): void {
  if (!controller.value) return
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
      @image-request="emit('image-request')"
      @link-request="(url) => emit('link-request', url)"
    />
    <div
      ref="hostRef"
      class="dsk-wysiwyg__content"
      :contenteditable="!readonly"
      :data-placeholder="placeholder"
      role="textbox"
      aria-multiline="true"
      :spellcheck="true"
      @input="onInput"
      @paste="onPaste"
      @keydown="onKeydown"
    />
  </div>
</template>

<style src="./style.css"></style>
