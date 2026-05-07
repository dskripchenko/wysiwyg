<script setup lang="ts">
/**
 * DskWysiwygToolbar — кнопочная панель команд editor'а.
 *
 * Принимает `controller` (EditorController), эмитит команды через
 * `controller.chain().*().run()`. Список items настраивается через
 * prop `items`.
 *
 * Для иконок используем lucide-vue-next через @dskripchenko/ui (UidIcon).
 * Если ui-kit не установлен — fallback на текстовые символы.
 */
import { computed, ref, watch, defineAsyncComponent } from 'vue'
import type { EditorController } from './engine'

export type ToolbarItem =
  | 'bold' | 'italic' | 'underline' | 'strike' | 'code'
  | 'h1' | 'h2' | 'h3'
  | 'paragraph'
  | 'bullet-list' | 'ordered-list'
  | 'blockquote' | 'code-block'
  | 'link' | 'image'
  | 'horizontal-rule'
  | 'table'
  | 'undo' | 'redo'
  | '|'

interface Props {
  controller: EditorController | null
  items?: ToolbarItem[]
  disabled?: boolean
  /** Versioning trigger — внешний counter для force re-evaluation
   *  is-active state'а. Передаётся из DskWysiwyg при selectionchange. */
  selectionVersion?: number
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [
    'bold', 'italic', 'underline', 'strike', 'code', '|',
    'h1', 'h2', 'h3', 'paragraph', '|',
    'bullet-list', 'ordered-list', 'blockquote', 'code-block', '|',
    'link', 'image', '|',
    'horizontal-rule', 'table', '|',
    'undo', 'redo',
  ],
  disabled: false,
  selectionVersion: 0,
})

const emit = defineEmits<{
  'image-request': []
  'link-request': [currentUrl: string | null]
}>()

/**
 * UidIcon — async-load из @dskripchenko/ui. Если пакет не установлен,
 * fallback компонент рендерит null (тогда отображаем текстовые подписи).
 */
const UidIcon = defineAsyncComponent({
  loader: async () => {
    try {
      const mod = await import('@dskripchenko/ui')
      return (mod as unknown as { UidIcon: unknown }).UidIcon as never
    } catch {
      return { setup: () => () => null } as never
    }
  },
  errorComponent: { setup: () => () => null } as never,
})

// Lucide-иконки тоже async (peer-dep).
const icons = ref<Record<string, unknown>>({})
async function loadIcons(): Promise<void> {
  try {
    const mod = await import('lucide-vue-next')
    icons.value = {
      Bold: mod.Bold,
      Italic: mod.Italic,
      Underline: mod.Underline,
      Strikethrough: mod.Strikethrough,
      Code: mod.Code,
      Heading1: mod.Heading1,
      Heading2: mod.Heading2,
      Heading3: mod.Heading3,
      Pilcrow: mod.Pilcrow,
      List: mod.List,
      ListOrdered: mod.ListOrdered,
      Quote: mod.Quote,
      Code2: mod.Code2,
      Link2: mod.Link2,
      Image: mod.Image,
      Minus: mod.Minus,
      Table: mod.Table,
      Undo: mod.Undo,
      Redo: mod.Redo,
    }
  } catch {
    icons.value = {}
  }
}
void loadIcons()

const isReady = computed<boolean>(() => Boolean(props.controller))

// Track-флаг для force-recompute is-active при selection change.
void watch(
  () => props.selectionVersion,
  () => undefined,
)

function isActive(name: string, attrs?: Record<string, unknown>): boolean {
  void props.selectionVersion // dependency
  if (!props.controller) return false
  // EditorController.isActive имеет typed-overloads; в template нам нужен
  // generic wrapper — кастуем через unknown.
  return (props.controller.isActive as unknown as (n: string, a?: Record<string, unknown>) => boolean)(name, attrs)
}

function exec(action: () => void): void {
  if (props.disabled || !props.controller) return
  action()
}

function onLink(): void {
  if (!props.controller) return
  // Пытаемся узнать текущий URL.
  const range = window.getSelection()?.getRangeAt(0)
  let currentUrl: string | null = null
  if (range) {
    let n: Node | null = range.startContainer
    while (n) {
      if (n instanceof HTMLAnchorElement) { currentUrl = n.getAttribute('href'); break }
      n = n.parentNode
    }
  }
  emit('link-request', currentUrl)
  // Default fallback — prompt; host обычно перехватывает emit и открывает modal.
  const url = window.prompt('URL ссылки', currentUrl ?? 'https://')
  if (url === null) return
  props.controller.chain().focus().setLink(url === '' ? null : url).run()
}

function onImage(): void {
  emit('image-request')
}
</script>

<template>
  <div class="dsk-wysiwyg-toolbar" role="toolbar" aria-label="Редактор">
    <template v-for="(item, idx) in items" :key="`tb-${idx}`">
      <span v-if="item === '|'" class="dsk-wysiwyg-toolbar__divider" />

      <button
        v-else-if="item === 'bold'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('bold') }]"
        title="Жирный (⌘B)"
        @click="exec(() => controller?.chain().focus().bold().run())"
      >
        <component v-if="icons.Bold" :is="UidIcon" :icon="icons.Bold" :size="14" />
        <strong v-else>B</strong>
      </button>
      <button
        v-else-if="item === 'italic'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('italic') }]"
        title="Курсив (⌘I)"
        @click="exec(() => controller?.chain().focus().italic().run())"
      >
        <component v-if="icons.Italic" :is="UidIcon" :icon="icons.Italic" :size="14" />
        <em v-else>I</em>
      </button>
      <button
        v-else-if="item === 'underline'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('underline') }]"
        title="Подчёркнутый (⌘U)"
        @click="exec(() => controller?.chain().focus().underline().run())"
      >
        <component v-if="icons.Underline" :is="UidIcon" :icon="icons.Underline" :size="14" />
        <u v-else>U</u>
      </button>
      <button
        v-else-if="item === 'strike'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('strike') }]"
        title="Зачёркнутый"
        @click="exec(() => controller?.chain().focus().strike().run())"
      >
        <component v-if="icons.Strikethrough" :is="UidIcon" :icon="icons.Strikethrough" :size="14" />
        <s v-else>S</s>
      </button>
      <button
        v-else-if="item === 'code'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('code') }]"
        title="Inline code"
        @click="exec(() => controller?.chain().focus().code().run())"
      >
        <component v-if="icons.Code" :is="UidIcon" :icon="icons.Code" :size="14" />
        <code v-else>&lt;/&gt;</code>
      </button>

      <button
        v-else-if="item === 'h1'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('heading', { level: 1 }) }]"
        title="Заголовок 1"
        @click="exec(() => controller?.chain().focus().heading(1).run())"
      >
        <component v-if="icons.Heading1" :is="UidIcon" :icon="icons.Heading1" :size="14" />
        <span v-else>H1</span>
      </button>
      <button
        v-else-if="item === 'h2'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('heading', { level: 2 }) }]"
        title="Заголовок 2"
        @click="exec(() => controller?.chain().focus().heading(2).run())"
      >
        <component v-if="icons.Heading2" :is="UidIcon" :icon="icons.Heading2" :size="14" />
        <span v-else>H2</span>
      </button>
      <button
        v-else-if="item === 'h3'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('heading', { level: 3 }) }]"
        title="Заголовок 3"
        @click="exec(() => controller?.chain().focus().heading(3).run())"
      >
        <component v-if="icons.Heading3" :is="UidIcon" :icon="icons.Heading3" :size="14" />
        <span v-else>H3</span>
      </button>
      <button
        v-else-if="item === 'paragraph'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('paragraph') }]"
        title="Параграф"
        @click="exec(() => controller?.chain().focus().paragraph().run())"
      >
        <component v-if="icons.Pilcrow" :is="UidIcon" :icon="icons.Pilcrow" :size="14" />
        <span v-else>¶</span>
      </button>

      <button
        v-else-if="item === 'bullet-list'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('bulletList') }]"
        title="Маркированный список"
        @click="exec(() => controller?.chain().focus().bulletList().run())"
      >
        <component v-if="icons.List" :is="UidIcon" :icon="icons.List" :size="14" />
        <span v-else>•</span>
      </button>
      <button
        v-else-if="item === 'ordered-list'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('orderedList') }]"
        title="Нумерованный список"
        @click="exec(() => controller?.chain().focus().orderedList().run())"
      >
        <component v-if="icons.ListOrdered" :is="UidIcon" :icon="icons.ListOrdered" :size="14" />
        <span v-else>1.</span>
      </button>

      <button
        v-else-if="item === 'blockquote'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('blockquote') }]"
        title="Цитата"
        @click="exec(() => controller?.chain().focus().blockquote().run())"
      >
        <component v-if="icons.Quote" :is="UidIcon" :icon="icons.Quote" :size="14" />
        <span v-else>&ldquo;&rdquo;</span>
      </button>
      <button
        v-else-if="item === 'code-block'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('codeBlock') }]"
        title="Блок кода"
        @click="exec(() => controller?.chain().focus().codeBlock().run())"
      >
        <component v-if="icons.Code2" :is="UidIcon" :icon="icons.Code2" :size="14" />
        <span v-else>{ }</span>
      </button>

      <button
        v-else-if="item === 'link'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('link') }]"
        title="Ссылка"
        @click="onLink"
      >
        <component v-if="icons.Link2" :is="UidIcon" :icon="icons.Link2" :size="14" />
        <span v-else>🔗</span>
      </button>
      <button
        v-else-if="item === 'image'"
        type="button"
        :disabled="disabled || !isReady"
        class="dsk-wysiwyg-toolbar__btn"
        title="Изображение"
        @click="onImage"
      >
        <component v-if="icons.Image" :is="UidIcon" :icon="icons.Image" :size="14" />
        <span v-else>🖼</span>
      </button>

      <button
        v-else-if="item === 'horizontal-rule'"
        type="button"
        :disabled="disabled || !isReady"
        class="dsk-wysiwyg-toolbar__btn"
        title="Горизонтальная линия"
        @click="exec(() => controller?.chain().focus().horizontalRule().run())"
      >
        <component v-if="icons.Minus" :is="UidIcon" :icon="icons.Minus" :size="14" />
        <span v-else>—</span>
      </button>

      <button
        v-else-if="item === 'table'"
        type="button"
        :disabled="disabled || !isReady"
        :class="['dsk-wysiwyg-toolbar__btn', { 'is-active': isActive('table') }]"
        title="Вставить таблицу 3×3"
        @click="exec(() => isActive('table')
          ? controller?.chain().focus().addRowAfter().run()
          : controller?.chain().focus().insertTable(3, 3).run())"
      >
        <component v-if="icons.Table" :is="UidIcon" :icon="icons.Table" :size="14" />
        <span v-else>▦</span>
      </button>

      <button
        v-else-if="item === 'undo'"
        type="button"
        :disabled="disabled || !isReady || !controller?.canUndo()"
        class="dsk-wysiwyg-toolbar__btn"
        title="Отменить (⌘Z)"
        @click="exec(() => controller?.chain().undo().run())"
      >
        <component v-if="icons.Undo" :is="UidIcon" :icon="icons.Undo" :size="14" />
        <span v-else>↶</span>
      </button>
      <button
        v-else-if="item === 'redo'"
        type="button"
        :disabled="disabled || !isReady || !controller?.canRedo()"
        class="dsk-wysiwyg-toolbar__btn"
        title="Повторить (⌘⇧Z)"
        @click="exec(() => controller?.chain().redo().run())"
      >
        <component v-if="icons.Redo" :is="UidIcon" :icon="icons.Redo" :size="14" />
        <span v-else>↷</span>
      </button>
    </template>
  </div>
</template>
