/**
 * The public shapes of the editor's props and events that are not toolbar or
 * slash-menu items.
 */
import type { Component } from 'vue'

export type { CaretPosition } from './engine/blocks'

/**
 * A host's own button at the end of the bubble toolbar — «Comment», say.
 * A press keeps the selection; `run` gets the selected text and the index of
 * the top-level block the selection starts in.
 */
export interface BubbleAction {
  key: string
  label: string
  /** Drawn before the label; any component taking a `size` prop (a lucide icon, say). */
  icon?: Component
  run: (ctx: { text: string; block: number }) => void
}

/**
 * Another person's caret, drawn over the content: a thin line in `color` with
 * the name above it, at a top-level block and a character offset within its
 * text (the block's end when the offset is left out or past it).
 */
export interface RemoteCaret {
  id: string | number
  name: string
  /** Any CSS colour; a colour from a small palette by `id` when left out. */
  color?: string
  block: number
  offset?: number
}
