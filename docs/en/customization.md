---
title: Customization
locale: en
status: stable
---

# Customization

## Themes

The editor honours common dark-mode signals via CSS:

- `data-theme="dark"` on `:root` or any ancestor (e.g. set by your
  app's theme switcher)
- `:root.dark` (Tailwind-style)
- `[data-theme='dark']` ancestor (most app-level switchers)
- `@media (prefers-color-scheme: dark)` (system preference)
- `[data-theme='light']` forces light even at system-dark

Or apply directly:

```vue
<DskWysiwyg v-model="html" class="dsk-wysiwyg--dark-theme" />
```

## Tokens

All colors are CSS custom properties — override anywhere:

```css
.dsk-wysiwyg {
  --dsk-wysiwyg-bg: #fff;
  --dsk-wysiwyg-fg: #111;
  --dsk-wysiwyg-border: #e5e7eb;
  --dsk-wysiwyg-accent: #14b8a6;
  --dsk-wysiwyg-muted: #6b7280;

  /* syntax token colors */
  --dsk-wysiwyg-tok-keyword: #2563eb;
  --dsk-wysiwyg-tok-string: #16a34a;
  --dsk-wysiwyg-tok-comment: #9ca3af;
  --dsk-wysiwyg-tok-number: #b45309;
  --dsk-wysiwyg-tok-tag: #2563eb;
  --dsk-wysiwyg-tok-attr: #b45309;
  --dsk-wysiwyg-tok-function: #7c3aed;
  --dsk-wysiwyg-tok-punct: #4b5563;
}
```

## Sizing & resize

```vue
<DskWysiwyg
  v-model="html"
  min-height="150px"
  max-height="600px"
  :resizable="true"
/>
```

The user can drag the bottom-right grip vertically. To disable:

```vue
<DskWysiwyg :resizable="false" />
```

## Custom toolbar items

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', '|', 'h2', 'h3', '|', 'link', 'image', 'source']"
/>
```

`|` is a divider. Items: `bold`, `italic`, `underline`, `strike`,
`code`, `h1`-`h3`, `ul`, `ol`, `quote`, `link`, `image`, `hr`,
`codeblock`, `table`, `undo`, `redo`, `source`, `fullscreen`.

## Custom commands

Use the controller from a host button:

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'

const editorRef = ref(null)
const html = ref('')

function insertSignature() {
  editorRef.value.controller.chain()
    .focus()
    .paragraph()
    .insertText('— Sent from MyApp')
    .run()
}
</script>

<template>
  <DskWysiwyg ref="editorRef" v-model="html" />
  <button @click="insertSignature">Insert signature</button>
</template>
```

## Sanitization

`getHTML()` runs the output through a DOMParser-based whitelist:

- Allowed tags: `p`, `br`, `strong`, `em`, `u`, `s`, `code`, `pre`,
  `h1`-`h6`, `ul`, `ol`, `li`, `blockquote`, `a` (`href`, `target`,
  `rel`), `img` (`src`, `alt`, `width`, `height`), `hr`, `table`,
  `thead`, `tbody`, `tr`, `th`, `td`, `span`/`code`-`class`-with-
  prefix `language-`/`dsk-tok-`.
- Everything else is dropped.

To extend: fork or wrap with your own `sanitizeHtml` before saving.

## Events / lifecycle

- `@update:modelValue` — after every committed edit (debounced).
- `controller.on('blur', fn)` — exposed for host save-on-blur.

## See also

- [Controller API](controller-api.md)
- [Extensions](extensions.md)

## Edit in place: bubble toolbar and frameless

For editing a page where it stands, drop the frame and let formatting come
from a small dark bar that floats above the selection:

```vue
<DskWysiwyg v-model="html" frameless bubble :toolbar="false" :resizable="false" />
```

`bubble` shows the bar while the selection in the content is not collapsed
(not in source mode or readonly); it hides when the selection collapses,
leaves the editor, or on Escape. A press on its buttons keeps the
selection. It is centred above the selection, goes below it when there is no
room above, and stays inside the editor. `true` gives bold, italic,
underline, strike, inline code, link, heading 2 and bullet list; an array
picks the items (`:bubble="['bold', 'italic', 'link']"`).

`frameless` removes the border, radius, background and padding around the
content and the toolbar's background, and takes the page's text colour and
size. `--dsk-wysiwyg-frameless-padding` (0 by default) sets the padding back.

The bar's tokens (a darker shade with an edge in the dark theme):

```css
.dsk-wysiwyg {
  --dsk-wysiwyg-bubble-bg: #18181b;
  --dsk-wysiwyg-bubble-fg: #f4f4f5;
  --dsk-wysiwyg-bubble-border: transparent;
  --dsk-wysiwyg-bubble-radius: 8px;
  --dsk-wysiwyg-bubble-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.16);
  --dsk-wysiwyg-bubble-hover-bg: rgba(255, 255, 255, 0.1);
  --dsk-wysiwyg-bubble-active-bg: rgba(255, 255, 255, 0.16);
  --dsk-wysiwyg-bubble-active-fg: #5eead4;
  --dsk-wysiwyg-bubble-divider: rgba(255, 255, 255, 0.16);
  --dsk-wysiwyg-bubble-z: 20;
}
```

### Host actions in the bubble

`bubbleActions` adds your own buttons at the end of the bubble, after a
divider — a «Comment» button, say:

```vue
<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next'
import type { BubbleAction } from '@dskripchenko/wysiwyg'

const actions: BubbleAction[] = [
  { key: 'comment', label: 'Comment', icon: MessageSquare, run: ({ text, block }) => openComment(text, block) },
]
</script>

<template>
  <DskWysiwyg v-model="html" bubble :bubble-actions="actions" />
</template>
```

Each button shows its `icon` (any component that takes a `size` prop) and
its `label`. A press keeps the selection, as on the other buttons; `run`
gets the selected text and `block`, the index of the top-level block (a
direct child of the content) the selection starts in. With `bubble` off the
bubble shows the actions alone.

## Block handles

`blockHandles` puts a «+» and a «⋮⋮» grip in the gutter left of the block
under the pointer (or, when the pointer is elsewhere, of the block with the
caret):

- «+» adds an empty paragraph below and opens the slash menu in it: the
  paragraph starts with `/`, as if it had been typed, so typing filters the
  menu and Escape leaves the `/` as text.
- Dragging the grip (mouse, pen or touch) moves the block; a line shows where
  it lands. A diagram moves together with its code.
- A click on the grip (or Enter / Space on it) opens a menu: Move up, Move
  down, Duplicate, Delete. The arrows, Home and End move in it; Escape
  closes it.

Each change is one undo step and emits `update:modelValue`. A duplicated
block does not keep its block id (`^id`): ids are unique. The handles are
not shown in readonly or source mode, nor on screens narrower than 600px. A
framed editor makes room for them inside its padding; a `frameless` one puts
them in the page's margin, outside its own box — leave about
`--dsk-wysiwyg-handles-gutter` (52px) free to its left. The drop line takes
`--dsk-wysiwyg-drop-color`; the strings are in the `blocks` group of the
labels (see [Language](#language)).

The same operations are on the controller: `moveBlock(from, to)`,
`duplicateBlock(index)`, `removeBlock(index)`.

## Co-editing: other people's carets and outside changes

For real-time co-editing the editor reports where its caret is, takes a new
value from outside without losing the caret, and draws the carets of others.

- A new `modelValue` from outside (another person's edit) is patched in,
  not set: the top-level blocks the old and the new value share at the start
  and at the end stay the same DOM nodes, and only the differing middle is
  replaced. A caret in an untouched block stays exactly where it was; a caret
  in a replaced block is put back by its block's index and its offset in the
  block's text. `controller.patchContent(html)` does the same from code.
- `@caret` reports `{ block, offset }` — the index of the top-level block and
  the character offset in its text — at most every 100ms, and `null` when the
  editor loses the focus. Send it to the others.
- `remoteCarets` draws theirs: a thin line in each person's colour with the
  name in a small flag above it.

```vue
<DskWysiwyg
  v-model="html"
  :remote-carets="[{ id: 'u2', name: 'Anna', color: '#e11d48', block: 3, offset: 12 }]"
  @caret="(pos) => channel.send({ caret: pos })"
/>
```

A caret without `color` takes one from a small palette by its `id`; without
`offset`, or past the block's text, it stands at the block's end; a block
that is not there hides it. The carets are an overlay: they take no pointer,
never touch the content or the value, and follow typing, resizing and
scrolling, in the light and the dark theme alike.

**The history after an outside change.** The local undo must not take back
someone else's edit as if it were one's own, so a patch rebases the history:
the undo and redo stacks are cleared and start again from the patched
content. Steps made before an outside change can no longer be undone.

## Fullscreen

The `fullscreen` toolbar item (in the default set, after `source`) spreads
the editor over the window — for long texts and wide blocks such as diagrams
or API widgets. Escape or the same button leaves it; the page under it does
not scroll meanwhile, and on a wide screen the text keeps a readable column.

```ts
const editor = ref()
editor.value.toggleFullscreen()      // or setFullscreen(true)
editor.value.fullscreen              // the current state
```

```vue
<DskWysiwyg ref="editor" v-model="html" @fullscreen-change="(on) => …" />
```

Over a host's own fixed layers, raise `--dsk-wysiwyg-fullscreen-z`
(1000 by default).

## Language

The toolbar's titles, the slash menu and the placeholder come in English and
Russian. Where the language comes from, first match wins:

1. `labels` — single strings over the language's own;
2. `locale` — `'en'` or `'ru'`;
3. the @dskripchenko/ui kit's locale, when the kit is installed and a
   `UidLocaleProvider` (or `provideLocale()`) is above the editor: a `code`
   starting with `ru` gives Russian, anything else English;
4. English.

```vue
<DskWysiwyg v-model="html" locale="ru" />

<DskWysiwyg
  v-model="html"
  :labels="{ placeholder: 'Schreiben…', toolbar: { bold: 'Fett (⌘B)' }, slash: { h1: 'Überschrift 1' } }"
/>
```

The `placeholder` prop still wins over the language's placeholder. The
groups are `toolbar` (titles, the toolbar's `label` for its aria-label,
`sourceBack`, `fullscreenExit`, `linkPrompt` for the fallback prompt) and
`slash` (the built-in items and their hints); the full sets are exported as
`wysiwygEn` and `wysiwygRu`, the types as `WysiwygLabels` and
`WysiwygPartialLabels`. `DskWysiwygToolbar` and `DskWysiwygSlashMenu` take
the same `locale` and `labels` when used on their own.

The kit is an optional peer: without it the editor is English unless told
otherwise.

The block handles' strings are in the `blocks` group (`add`, `grip`, `menu`,
`moveUp`, `moveDown`, `duplicate`, `remove`), and the toggle of an open block
with a preview in `preview` (`split`, `preview`).
