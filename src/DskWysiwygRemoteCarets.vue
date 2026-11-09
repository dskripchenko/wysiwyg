<script setup lang="ts">
/**
 * DskWysiwygRemoteCarets — other people's carets over the content: a thin
 * line in each person's colour with their name in a small flag above it.
 *
 * An overlay laid over the editor's root (pointer-events: none): it never
 * touches the editable content or the model. Each caret stands at a top-level
 * block and a character offset within its text; the position is measured
 * with a Range on that text and taken again whenever `layoutVersion` changes
 * (the content changed, the editor resized or scrolled).
 */
import { computed } from 'vue'
import type { RemoteCaret } from './types'
import { pointInBlock, topBlocks } from './engine/blocks'
import { PREVIEW_ATTR } from './engine/blockPreviews'

interface Props {
  carets: RemoteCaret[]
  host: HTMLElement | null
  root: HTMLElement | null
  /** Bumped by the editor when the layout may have changed. */
  layoutVersion: number
}

const props = defineProps<Props>()

/** Readable as a thin line on a light and a dark page, and under white text. */
const PALETTE = ['#e11d48', '#2563eb', '#059669', '#c2410c', '#7c3aed', '#0e7490', '#db2777', '#4d7c0f']

/** A colour from the palette, the same for the same id. */
function colorFor(id: string | number): string {
  const key = String(id)
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]!
}

interface Box { left: number; top: number; height: number }

/** The caret's box in the viewport, or null when its block is not there. */
function caretBox(host: HTMLElement, caret: RemoteCaret): Box | null {
  const block = topBlocks(host)[caret.block]
  if (! block) return null
  const point = pointInBlock(block, caret.offset ?? Number.MAX_SAFE_INTEGER)
  if (point.node.nodeType === Node.TEXT_NODE) {
    const range = document.createRange()
    range.setStart(point.node, point.offset)
    range.collapse(true)
    const rect = typeof range.getClientRects === 'function' ? range.getClientRects()[0] : undefined
    if (rect && rect.height > 0) return { left: rect.left, top: rect.top, height: rect.height }
    // Some engines give no box for a collapsed range at a text's end: the character before it.
    if (point.offset > 0 && typeof range.getClientRects === 'function') {
      range.setStart(point.node, point.offset - 1)
      range.setEnd(point.node, point.offset)
      const rects = range.getClientRects()
      const last = rects[rects.length - 1]
      if (last && last.height > 0) return { left: last.right, top: last.top, height: last.height }
    }
  }
  // No text to measure (an empty line, an image): the start of the block's first line.
  const shown = block.offsetParent === null && block.nextElementSibling?.hasAttribute(PREVIEW_ATTR)
    ? block.nextElementSibling as HTMLElement
    : block
  const rect = shown.getBoundingClientRect()
  const style = getComputedStyle(shown)
  const line = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) || 14) * 1.5
  return { left: rect.left + (parseFloat(style.paddingLeft) || 0), top: rect.top + (parseFloat(style.paddingTop) || 0), height: line }
}

/** The flag's height, px: a caret this close to the top gets its flag below the line. */
const FLAG_ROOM = 18

const drawn = computed(() => {
  void props.layoutVersion
  const host = props.host
  const root = props.root
  if (! host || ! root || props.carets.length === 0) return []
  const rootRect = root.getBoundingClientRect()
  const view = host.getBoundingClientRect()
  const out: Array<{ key: string; name: string; style: Record<string, string>; below: boolean }> = []
  for (const caret of props.carets) {
    const box = caretBox(host, caret)
    if (! box) continue
    // Scrolled out of the content's box: not drawn over the toolbar or past the end.
    if (view.height > 0 && (box.top + box.height < view.top || box.top > view.bottom)) continue
    const top = box.top - rootRect.top - root.clientTop
    const left = box.left - rootRect.left - root.clientLeft
    out.push({
      key: String(caret.id),
      name: caret.name,
      below: top < FLAG_ROOM,
      style: {
        '--dsk-wysiwyg-caret-color': caret.color ?? colorFor(caret.id),
        top: `${top}px`,
        left: `${left}px`,
        height: `${box.height}px`,
      },
    })
  }
  return out
})
</script>

<template>
  <div v-if="drawn.length > 0" class="dsk-wysiwyg__carets" aria-hidden="true">
    <div
      v-for="c in drawn"
      :key="c.key"
      :class="['dsk-wysiwyg__caret', { 'dsk-wysiwyg__caret--flag-below': c.below }]"
      :style="c.style"
    >
      <span class="dsk-wysiwyg__caret-flag">{{ c.name }}</span>
    </div>
  </div>
</template>
