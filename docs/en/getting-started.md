---
title: Getting Started
locale: en
status: stable
---

# Getting Started

## Install

```bash
npm i @dskripchenko/wysiwyg
```

Optional for nicer toolbar icons:

```bash
npm i @dskripchenko/ui lucide-vue-next
```

## Basic usage

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'
import '@dskripchenko/wysiwyg/style.css'

const html = ref('<p>Hello <strong>world</strong>!</p>')
</script>

<template>
  <DskWysiwyg v-model="html" />
</template>
```

The component is **uncontrolled internally** — `v-model` is the source
of truth. The editor's HTML output is sanitized through an internal
DOMParser whitelist before emitting.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `modelValue` | `string` | `''` | HTML string. Sanitized on emit. |
| `placeholder` | `string` | `''` | Shown when empty. |
| `toolbar` | `boolean` | `true` | Show the toolbar. |
| `toolbarItems` | `ToolbarItem[]` | (default set) | Override toolbar order. |
| `readonly` | `boolean` | `false` | |
| `minHeight` | `string` | `'200px'` | CSS length on the root. |
| `maxHeight` | `string` | `undefined` | CSS length on the root. |
| `resizable` | `boolean` | `true` | User-resizable vertically. |

## Events

`@update:modelValue` — same as `v-model`.

## Default toolbar

Bold / Italic / Underline / Strike / Code · H1 H2 H3 · Bullet List /
Ordered List / Blockquote · Link / Image / HR · Code Block · Table ·
Undo / Redo · Source-mode toggle.

## Customizing the toolbar

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', 'h2', 'h3', '|', 'link', 'image', 'source']"
/>
```

`|` inserts a divider. Available items: `bold`, `italic`, `underline`,
`strike`, `code`, `h1`-`h3`, `ul`, `ol`, `quote`, `link`, `image`,
`hr`, `codeblock`, `table`, `undo`, `redo`, `source`.

## What's next

- [Controller API](controller-api.md) — programmatic editing
- [Extensions](extensions.md) — markdown shortcuts, slash commands,
  tables, syntax highlighting
- [Customization](customization.md) — themes, sizing, custom commands
