<script setup lang="ts">
/**
 * DskWysiwygSlashMenu — popup со списком команд при вводе `/`.
 *
 * Принимает controller и абсолютную позицию caret'а. Позиционируется
 * через position:fixed (top/left). Стрелки/Enter/Esc навигация —
 * родительский DskWysiwyg перехватывает keydown и эмитит navigate-events.
 *
 * Список команд фильтруется по введённому query (текст после `/`).
 */
import { computed, ref, watch } from 'vue'
import type { EditorController } from './engine'

export interface SlashCommand {
  key: string
  label: string
  hint?: string
  /** Filter-tags для поиска (синонимы). */
  aliases?: string[]
  /** Действие — host получает controller, очищенный slash + query. */
  apply: (controller: EditorController) => void
}

export interface SlashMenuProps {
  open: boolean
  controller: EditorController | null
  /** Текст после `/` для фильтра. */
  query: string
  /** Позиция (caret). */
  top: number
  left: number
}

const props = defineProps<SlashMenuProps>()

const emit = defineEmits<{
  /** Команда выбрана — host убирает `/` + query из document. */
  select: [command: SlashCommand]
  close: []
}>()

const COMMANDS: SlashCommand[] = [
  { key: 'h1', label: 'Заголовок 1', hint: 'Большой заголовок', aliases: ['h1', 'heading1', 'title'],
    apply: (c) => c.chain().focus().heading(1).run() },
  { key: 'h2', label: 'Заголовок 2', hint: 'Средний заголовок', aliases: ['h2', 'heading2'],
    apply: (c) => c.chain().focus().heading(2).run() },
  { key: 'h3', label: 'Заголовок 3', hint: 'Малый заголовок', aliases: ['h3', 'heading3'],
    apply: (c) => c.chain().focus().heading(3).run() },
  { key: 'paragraph', label: 'Параграф', hint: 'Обычный текст', aliases: ['p', 'text', 'paragraph'],
    apply: (c) => c.chain().focus().paragraph().run() },
  { key: 'ul', label: 'Маркированный список', aliases: ['ul', 'bullet', 'list'],
    apply: (c) => c.chain().focus().bulletList().run() },
  { key: 'ol', label: 'Нумерованный список', aliases: ['ol', 'numbered', 'ordered'],
    apply: (c) => c.chain().focus().orderedList().run() },
  { key: 'quote', label: 'Цитата', aliases: ['quote', 'blockquote'],
    apply: (c) => c.chain().focus().blockquote().run() },
  { key: 'code', label: 'Блок кода', aliases: ['code', 'codeblock', 'pre'],
    apply: (c) => c.chain().focus().codeBlock().run() },
  { key: 'hr', label: 'Горизонтальная линия', aliases: ['hr', 'divider', 'rule'],
    apply: (c) => c.chain().focus().horizontalRule().run() },
  { key: 'table', label: 'Таблица 3×3', aliases: ['table'],
    apply: (c) => c.chain().focus().insertTable(3, 3).run() },
]

const filtered = computed<SlashCommand[]>(() => {
  const q = props.query.toLowerCase().trim()
  if (q === '') return COMMANDS
  return COMMANDS.filter((cmd) =>
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
