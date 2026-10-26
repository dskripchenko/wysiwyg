<script setup lang="ts">
/**
 * DskWysiwygSlashMenu — the popup with the list of commands shown when `/` is
 * typed.
 *
 * It takes the controller and the caret's absolute position. It is positioned
 * through position:fixed (top/left). The arrow/Enter/Esc navigation is handled
 * by the parent DskWysiwyg, which intercepts the keydown and emits navigate
 * events.
 *
 * The list of commands is filtered by the typed query (the text after the `/`).
 */
import { computed, ref, watch } from 'vue'
import type { EditorController } from './engine'
import { useWysiwygLabels, type WysiwygLocale, type WysiwygPartialLabels, type WysiwygSlashLabels } from './locale'

export interface SlashCommand {
  key: string
  label: string
  hint?: string
  /** The filter tags for the search (the synonyms). */
  aliases?: string[]
  /** The action — the host gets the controller, with the slash and the query already removed. */
  apply: (controller: EditorController) => void
}

export interface SlashMenuProps {
  open: boolean
  controller: EditorController | null
  /** The text after the `/`, used as the filter. */
  query: string
  /** The position (of the caret). */
  top: number
  left: number
  /** The host's own items, listed after the built-in ones. */
  extra?: SlashCommand[]
  /** The UI language; when unset, the kit's locale (if any) or English. */
  locale?: WysiwygLocale
  /** Single strings over the language's own. */
  labels?: WysiwygPartialLabels
}

const props = defineProps<SlashMenuProps>()

const emit = defineEmits<{
  /** A command was chosen — the host removes the `/` and the query from the document. */
  select: [command: SlashCommand]
  close: []
}>()

/** The built-in items; the labels come from the language in effect. */
function builtinCommands(l: WysiwygSlashLabels): SlashCommand[] {
  return [
    { key: 'h1', label: l.h1, hint: l.h1Hint, aliases: ['h1', 'heading1', 'title'],
      apply: (c) => c.chain().focus().heading(1).run() },
    { key: 'h2', label: l.h2, hint: l.h2Hint, aliases: ['h2', 'heading2'],
      apply: (c) => c.chain().focus().heading(2).run() },
    { key: 'h3', label: l.h3, hint: l.h3Hint, aliases: ['h3', 'heading3'],
      apply: (c) => c.chain().focus().heading(3).run() },
    { key: 'paragraph', label: l.paragraph, hint: l.paragraphHint, aliases: ['p', 'text', 'paragraph'],
      apply: (c) => c.chain().focus().paragraph().run() },
    { key: 'ul', label: l.bulletList, aliases: ['ul', 'bullet', 'list'],
      apply: (c) => c.chain().focus().bulletList().run() },
    { key: 'ol', label: l.orderedList, aliases: ['ol', 'numbered', 'ordered'],
      apply: (c) => c.chain().focus().orderedList().run() },
    { key: 'quote', label: l.blockquote, aliases: ['quote', 'blockquote'],
      apply: (c) => c.chain().focus().blockquote().run() },
    { key: 'code', label: l.codeBlock, aliases: ['code', 'codeblock', 'pre'],
      apply: (c) => c.chain().focus().codeBlock().run() },
    { key: 'hr', label: l.horizontalRule, aliases: ['hr', 'divider', 'rule'],
      apply: (c) => c.chain().focus().horizontalRule().run() },
    { key: 'table', label: l.table, aliases: ['table'],
      apply: (c) => c.chain().focus().insertTable(3, 3).run() },
  ]
}

const { labels: text, KitLocaleProbe, probeKit } = useWysiwygLabels(props)
const commands = computed<SlashCommand[]>(() => builtinCommands(text.value.slash))

const filtered = computed<SlashCommand[]>(() => {
  const all = props.extra?.length ? [...commands.value, ...props.extra] : commands.value
  const q = props.query.toLowerCase().trim()
  if (q === '') return all
  return all.filter((cmd) =>
    cmd.label.toLowerCase().includes(q) ||
    cmd.aliases?.some((a) => a.includes(q)),
  )
})

const activeIdx = ref<number>(0)
watch(() => props.query, () => { activeIdx.value = 0 })
watch(() => props.open, (open) => { if (open) activeIdx.value = 0 })

function moveDown(): void {
  if (filtered.value.length === 0) return
  activeIdx.value = (activeIdx.value + 1) % filtered.value.length
}
function moveUp(): void {
  if (filtered.value.length === 0) return
  activeIdx.value = (activeIdx.value - 1 + filtered.value.length) % filtered.value.length
}
function selectActive(): void {
  const cmd = filtered.value[activeIdx.value]
  if (cmd) emit('select', cmd)
}
function selectByMouse(idx: number): void {
  const cmd = filtered.value[idx]
  if (cmd) emit('select', cmd)
}

defineExpose({ moveDown, moveUp, selectActive, hasItems: () => filtered.value.length > 0 })
</script>

<template>
  <component :is="KitLocaleProbe" v-if="probeKit" />
  <Teleport to="body">
    <div
      v-if="open && filtered.length > 0"
      class="dsk-wysiwyg-slash"
      :style="{ top: `${top}px`, left: `${left}px` }"
      role="listbox"
    >
      <button
        v-for="(cmd, idx) in filtered"
        :key="cmd.key"
        type="button"
        :class="['dsk-wysiwyg-slash__item', { 'is-active': idx === activeIdx }]"
        role="option"
        :aria-selected="idx === activeIdx"
        @mousedown.prevent="selectByMouse(idx)"
        @mouseenter="activeIdx = idx"
      >
        <span class="dsk-wysiwyg-slash__label">{{ cmd.label }}</span>
        <span v-if="cmd.hint" class="dsk-wysiwyg-slash__hint">{{ cmd.hint }}</span>
      </button>
    </div>
  </Teleport>
</template>

<style>
.dsk-wysiwyg-slash {
  position: fixed;
  z-index: 1000;
  min-width: 220px;
  max-width: 320px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
  background: var(--dsk-wysiwyg-bg, #fff);
  border: 1px solid var(--dsk-wysiwyg-border, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.dsk-wysiwyg-slash__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 10px;
  border: 0;
  background: transparent;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  color: var(--dsk-wysiwyg-fg, #1f2937);
}
.dsk-wysiwyg-slash__item:hover,
.dsk-wysiwyg-slash__item.is-active {
  background: var(--dsk-wysiwyg-btn-hover-bg, rgba(0, 0, 0, 0.05));
}
.dsk-wysiwyg-slash__label { font-weight: 500; }
.dsk-wysiwyg-slash__hint { font-size: 11px; color: var(--dsk-wysiwyg-fg-muted, #6b7280); }
</style>
