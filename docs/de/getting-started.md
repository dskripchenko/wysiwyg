# Erste Schritte

## Installation

```bash
npm i @dskripchenko/wysiwyg
```

Optional für schönere Toolbar-Icons:

```bash
npm i @dskripchenko/ui lucide-vue-next
```

## Grundlegende Verwendung

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

Die Komponente ist **intern unkontrolliert** — `v-model` ist die Quelle der
Wahrheit. Die HTML-Ausgabe des Editors wird vor dem Emittieren durch eine
interne DOMParser-Whitelist sanitisiert.

## Props

| Prop | Typ | Standard | Hinweise |
|---|---|---|---|
| `modelValue` | `string` | `''` | HTML-String. Wird beim Emittieren sanitisiert. |
| `placeholder` | `string` | der der Sprache | Wird angezeigt, wenn der Editor leer ist. |
| `locale` | `'en' \| 'ru'` | Locale des Kits, sonst `'en'` | Sprache der Oberfläche, siehe [Anpassung](customization.md#sprache). |
| `labels` | `WysiwygPartialLabels` | — | Einzelne UI-Strings über denen der Sprache. |
| `toolbar` | `boolean` | `true` | Zeigt die Toolbar an. |
| `toolbarItems` | `ToolbarItem[]` | (Standardsatz) | Überschreibt die Reihenfolge der Toolbar. |
| `readonly` | `boolean` | `false` | |
| `minHeight` | `string` | `'200px'` | CSS-Länge am Root-Element. |
| `maxHeight` | `string` | `undefined` | CSS-Länge am Root-Element. |
| `resizable` | `boolean` | `true` | Vom Benutzer vertikal in der Größe änderbar. |
| `blockRenderers` | `BlockRenderers` | `{}` | Sprachen von Code-Blöcken, die als das angezeigt werden, was sie darstellen, z. B. `{ mermaid }`. Siehe [Erweiterungen](extensions.md#block-vorschauen-diagramme-charts). |
| `slashCommands` | `SlashCommand[]` | `[]` | Einträge, die dem Slash-Menü nach den eingebauten hinzugefügt werden. |
| `allowedAttributes` | `Record<string, string[]>` | `{}` | Attribute, die pro Tag über die eingebaute Whitelist hinaus erhalten bleiben — Ihre eigenen Marker, z. B. `{ img: ['data-signature'] }`. `on*`-Handler werden nie übernommen. |

## Events

`@update:modelValue` — dasselbe wie `v-model`.

## Standard-Toolbar

Bold / Italic / Underline / Strike / Code · H1 H2 H3 · Bullet List /
Ordered List / Blockquote · Link / Image / HR · Code Block · Table ·
Undo / Redo · Umschalter für den Source-Modus.

## Toolbar anpassen

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', 'h2', 'h3', '|', 'link', 'image', 'source']"
/>
```

`|` fügt einen Trenner ein. Verfügbare Elemente: `bold`, `italic`,
`underline`, `strike`, `code`, `h1`-`h3`, `ul`, `ol`, `quote`, `link`,
`image`, `hr`, `codeblock`, `table`, `undo`, `redo`, `source`,
`fullscreen`.

## Wie geht es weiter

- [Controller-API](controller-api.md) — programmatisches Bearbeiten
- [Erweiterungen](extensions.md) — Markdown-Shortcuts, Slash-Befehle,
  Tabellen, Syntax-Highlighting
- [Anpassung](customization.md) — Themes, Größe, eigene Befehle
