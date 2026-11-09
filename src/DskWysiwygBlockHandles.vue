<script setup lang="ts">
/**
 * DskWysiwygBlockHandles — a «+» and a «⋮⋮» grip in the gutter left of the
 * top-level block under the pointer (or, without one, the block with the
 * caret).
 *
 *   - «+» asks the editor for a new block below (`add`);
 *   - the grip, dragged (mouse, pen or touch), moves the block: a line shows
 *     where it lands;
 *   - the grip, clicked (or Enter / Space on it), opens a small menu: move
 *     up, move down, duplicate, delete. The menu is operated by the arrows,
 *     Home / End, Enter and Escape.
 *
 * Every change goes through the controller (one history step each) and is
 * reported by `change`, for the editor to emit its new value.
 */
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { EditorController } from './engine'
import { blockGroup, topBlockOf, topBlocks } from './engine/blocks'
import type { WysiwygBlockLabels } from './locale'

interface Props {
  controller: EditorController | null
  host: HTMLElement | null
  root: HTMLElement | null
  labels: WysiwygBlockLabels
  /** Bumped by the editor on a selection change. */
  selectionVersion: number
  /** Bumped by the editor when the layout may have changed. */
  layoutVersion: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** «+» on the block at this index. */
  add: [index: number]
  /** A block moved, was duplicated or deleted. */
  change: []
}>()

/** The block under the pointer, and the one with the caret. */
const hovered = shallowRef<HTMLElement | null>(null)
const caretBlock = shallowRef<HTMLElement | null>(null)
/** The block the handles are held on while its menu is open or it is dragged. */
const held = shallowRef<HTMLElement | null>(null)
const target = computed<HTMLElement | null>(() => {
  const block = held.value ?? hovered.value ?? caretBlock.value
  return block && block.isConnected && block.parentNode === props.host ? block : null
})

const menuOpen = ref<boolean>(false)
const menuRef = ref<HTMLElement | null>(null)
const gripRef = ref<HTMLElement | null>(null)

interface Box { top: number; bottom: number; left: number; right: number; height: number }

/** A block's box on screen, its decorations included (a shown diagram, an open block's header). */
function visualRect(block: HTMLElement): Box {
  const rects = blockGroup(block)
    .filter((n): n is HTMLElement => n instanceof HTMLElement)
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 || r.height > 0)
  if (rects.length === 0) return block.getBoundingClientRect()
  const top = Math.min(...rects.map((r) => r.top))
  const bottom = Math.max(...rects.map((r) => r.bottom))
  const left = Math.min(...rects.map((r) => r.left))
  const right = Math.max(...rects.map((r) => r.right))
  return { top, bottom, left, right, height: bottom - top }
}

/** The height of a block's first line, px: the handles centre on it. */
function firstLine(block: HTMLElement): number {
  const style = getComputedStyle(block)
  const line = parseFloat(style.lineHeight)
  if (line > 0) return line
  return (parseFloat(style.fontSize) || 14) * 1.5
}

const position = computed<Record<string, string> | null>(() => {
  void props.layoutVersion
  const block = target.value
  const root = props.root
  if (! block || ! root) return null
  const rootRect = root.getBoundingClientRect()
  const rect = visualRect(block)
  const shown = block.offsetParent === null ? 0 : firstLine(block)
  const height = 24
  const top = rect.top - rootRect.top - root.clientTop + Math.max(0, (shown - height) / 2)
  return { top: `${top}px`, left: `${rect.left - rootRect.left - root.clientLeft}px` }
})

function indexOf(block: HTMLElement | null): number {
  return block && props.host ? topBlocks(props.host).indexOf(block) : -1
}

/* ------------------------- Following the pointer and the caret ------------------------- */

function blockAtY(y: number): HTMLElement | null {
  if (! props.host) return null
  for (const block of topBlocks(props.host)) {
    const r = visualRect(block)
    if (y >= r.top && y <= r.bottom) return block
  }
  return null
}

function onHostMove(e: MouseEvent): void {
  if (held.value || ! props.host) return
  const t = e.target as Node | null
  hovered.value = (t && t !== props.host ? topBlockOf(props.host, t) : null) ?? blockAtY(e.clientY)
}

function onRootLeave(): void {
  hovered.value = null
}

watch(() => props.selectionVersion, () => {
  const sel = window.getSelection()
  const node = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer : null
  caretBlock.value = props.host && node ? topBlockOf(props.host, node) : null
})

watch(() => [props.host, props.root] as const, ([host, root], _old, onCleanup) => {
  if (! host || ! root) return
  host.addEventListener('mousemove', onHostMove)
  root.addEventListener('mouseleave', onRootLeave)
  onCleanup(() => {
    host.removeEventListener('mousemove', onHostMove)
    root.removeEventListener('mouseleave', onRootLeave)
  })
}, { immediate: true })

/* ------------------------- «+» ------------------------- */

function onAdd(): void {
  const index = indexOf(target.value)
  if (index >= 0) emit('add', index)
}

/* ------------------------- Dragging ------------------------- */

/** The pixels a press has to travel to become a drag. */
const DRAG_THRESHOLD = 4
let press: { y: number; id: number | undefined; block: HTMLElement } | null = null
const dragging = ref<boolean>(false)
/** Where the dragged block would land: an index among the blocks (0…n). */
const dropIndex = ref<number>(-1)
/** A click right after a drag is the drag's own end, not a click. */
let swallowClick = false

const indicatorStyle = computed<Record<string, string> | null>(() => {
  void props.layoutVersion
  if (! dragging.value || dropIndex.value < 0 || ! props.host || ! props.root) return null
  const blocks = topBlocks(props.host)
  if (blocks.length === 0) return null
  const rootRect = props.root.getBoundingClientRect()
  const hostRect = props.host.getBoundingClientRect()
  const style = getComputedStyle(props.host)
  const padLeft = parseFloat(style.paddingLeft) || 0
  const padRight = parseFloat(style.paddingRight) || 0
  const at = dropIndex.value < blocks.length
    ? visualRect(blocks[dropIndex.value]!).top
    : visualRect(blocks[blocks.length - 1]!).bottom
  return {
    top: `${at - rootRect.top - props.root.clientTop - 1}px`,
    left: `${hostRect.left - rootRect.left - props.root.clientLeft + padLeft}px`,
    width: `${Math.max(0, hostRect.width - padLeft - padRight)}px`,
  }
})

function dropIndexAt(y: number): number {
  if (! props.host) return -1
  const blocks = topBlocks(props.host)
  for (let i = 0; i < blocks.length; i++) {
    const r = visualRect(blocks[i]!)
    if (y < r.top + r.height / 2) return i
  }
  return blocks.length
}

function onGripDown(e: PointerEvent): void {
  if (e.button !== undefined && e.button !== 0) return
  const block = target.value
  if (! block) return
  // Keeps the caret and the focus in the content.
  e.preventDefault()
  press = { y: e.clientY, id: e.pointerId, block }
  held.value = block
  try { if (e.pointerId !== undefined) gripRef.value?.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
}

function onPointerMove(e: PointerEvent): void {
  if (! press) return
  if (! dragging.value && Math.abs(e.clientY - press.y) < DRAG_THRESHOLD) return
  if (! dragging.value) {
    dragging.value = true
    menuOpen.value = false
  }
  e.preventDefault()
  dropIndex.value = dropIndexAt(e.clientY)
}

function onPointerUp(e: PointerEvent): void {
  const was = press
  const wasDragging = dragging.value
  endPress()
  if (! was || ! wasDragging) {
    // A press without a drag: the click that follows opens the menu.
    if (! menuOpen.value) held.value = null
    return
  }
  swallowClick = true
  setTimeout(() => { swallowClick = false }, 0)
  const from = indexOf(was.block)
  const at = dropIndexAt(e.clientY)
  held.value = null
  if (from < 0 || at < 0) return
  const to = at > from ? at - 1 : at
  if (to !== from && props.controller?.moveBlock(from, to)) {
    props.host?.focus()
    emit('change')
  }
}

function onPointerCancel(): void {
  endPress()
  held.value = null
}

function endPress(): void {
  press = null
  dragging.value = false
  dropIndex.value = -1
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
}

/* ------------------------- The menu ------------------------- */

const blockIndex = computed<number>(() => {
  void props.layoutVersion
  return indexOf(target.value)
})
const blockCount = computed<number>(() => {
  void props.layoutVersion
  return props.host ? topBlocks(props.host).length : 0
})

type MenuAction = 'moveUp' | 'moveDown' | 'duplicate' | 'remove'
const menuItems = computed<Array<{ action: MenuAction; label: string; disabled: boolean }>>(() => [
  { action: 'moveUp', label: props.labels.moveUp, disabled: blockIndex.value <= 0 },
  { action: 'moveDown', label: props.labels.moveDown, disabled: blockIndex.value < 0 || blockIndex.value >= blockCount.value - 1 },
  { action: 'duplicate', label: props.labels.duplicate, disabled: blockIndex.value < 0 },
  { action: 'remove', label: props.labels.remove, disabled: blockIndex.value < 0 },
])

function onGripClick(e: MouseEvent): void {
  if (swallowClick) {
    swallowClick = false
    return
  }
  if (menuOpen.value) {
    closeMenu(false)
    return
  }
  held.value = target.value
  if (! held.value) return
  menuOpen.value = true
  document.addEventListener('pointerdown', onOutside, true)
  // Opened from the keyboard (a click without a pointer): the focus goes into the menu.
  if (e.detail === 0) void nextTick(() => focusItem(0))
}

function closeMenu(refocusGrip: boolean): void {
  if (! menuOpen.value) return
  menuOpen.value = false
  held.value = null
  document.removeEventListener('pointerdown', onOutside, true)
  if (refocusGrip) gripRef.value?.focus()
}

function onOutside(e: Event): void {
  const t = e.target as Node | null
  if (t && (menuRef.value?.contains(t) || gripRef.value?.contains(t))) return
  closeMenu(false)
}

function enabledItems(): HTMLElement[] {
  return Array.from(menuRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
}

function focusItem(index: number): void {
  const items = enabledItems()
  if (items.length === 0) return
  items[(index + items.length) % items.length]!.focus()
}

function onMenuKeydown(e: KeyboardEvent): void {
  const items = enabledItems()
  const current = items.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(current + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(current < 0 ? -1 : current - 1) }
  else if (e.key === 'Home') { e.preventDefault(); focusItem(0) }
  else if (e.key === 'End') { e.preventDefault(); focusItem(-1) }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true) }
  else if (e.key === 'Tab') closeMenu(false)
}

function run(action: MenuAction): void {
  const c = props.controller
  const index = blockIndex.value
  closeMenu(false)
  if (! c || index < 0) return
  props.host?.focus()
  const done = action === 'moveUp' ? c.moveBlock(index, index - 1)
    : action === 'moveDown' ? c.moveBlock(index, index + 1)
      : action === 'duplicate' ? c.duplicateBlock(index)
        : c.removeBlock(index)
  if (done) emit('change')
}

onBeforeUnmount(() => {
  endPress()
  document.removeEventListener('pointerdown', onOutside, true)
})

defineExpose({ closeMenu: () => closeMenu(false) })
</script>

<template>
  <div
    v-if="position"
    :class="['dsk-wysiwyg-handles', { 'is-dragging': dragging }]"
    :style="position"
  >
    <!-- mousedown.prevent: a press on the handles keeps the caret in the content. -->
    <button
      type="button"
      class="dsk-wysiwyg-handles__btn"
      :aria-label="labels.add"
      :title="labels.add"
      @mousedown.prevent
      @click="onAdd"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" /></svg>
    </button>
    <button
      ref="gripRef"
      type="button"
      class="dsk-wysiwyg-handles__btn dsk-wysiwyg-handles__grip"
      :aria-label="labels.grip"
      :title="labels.grip"
      aria-haspopup="menu"
      :aria-expanded="menuOpen"
      @mousedown.prevent
      @pointerdown="onGripDown"
      @click="onGripClick"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><g fill="currentColor"><circle cx="5.5" cy="3.5" r="1.3" /><circle cx="10.5" cy="3.5" r="1.3" /><circle cx="5.5" cy="8" r="1.3" /><circle cx="10.5" cy="8" r="1.3" /><circle cx="5.5" cy="12.5" r="1.3" /><circle cx="10.5" cy="12.5" r="1.3" /></g></svg>
    </button>
    <div
      v-if="menuOpen"
      ref="menuRef"
      class="dsk-wysiwyg-handles__menu"
      role="menu"
      :aria-label="labels.menu"
      @mousedown.prevent
      @keydown="onMenuKeydown"
    >
      <button
        v-for="item in menuItems"
        :key="item.action"
        type="button"
        role="menuitem"
        tabindex="-1"
        :class="['dsk-wysiwyg-handles__item', `dsk-wysiwyg-handles__item--${item.action}`]"
        :disabled="item.disabled"
        @click="run(item.action)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
  <div v-if="indicatorStyle" class="dsk-wysiwyg-handles__drop" :style="indicatorStyle" aria-hidden="true" />
</template>
