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
`codeblock`, `table`, `undo`, `redo`, `source`.

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
