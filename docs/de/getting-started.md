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
| `toolbarTarget` | `string \| HTMLElement` | — | Zeigt die Toolbar in diesem Element (oder dem, das der Selektor findet) statt über dem Inhalt — in der eigenen Leiste oder einem schwebenden Panel der Anwendung. Es bleibt die Toolbar des Editors; fehlt das Ziel im Dokument, bleibt sie über dem Inhalt. |
| `bubble` | `ToolbarItem[] \| boolean` | `false` | Eine kompakte Toolbar, die über einer Auswahl im Inhalt schwebt: `true` für Fett, Kursiv, Unterstrichen, Durchgestrichen, Inline-Code, Link, Überschrift 2 und Aufzählung, oder die gewünschten Elemente. Siehe [Anpassung](customization.md#bearbeiten-an-ort-und-stelle-schwebende-toolbar-und-frameless). |
| `frameless` | `boolean` | `false` | Kein Rahmen, Radius, Hintergrund oder Innenabstand um den Inhalt; die Toolbar ohne Hintergrund. Der Inhalt wirkt wie ein Teil der Seite. |
| `bubbleActions` | `BubbleAction[]` | `[]` | Eigene Schaltflächen am Ende der schwebenden Toolbar, nach einem Trenner — je ein Symbol und eine Beschriftung; `run({ text, block })` erhält den markierten Text und den Index des Blocks der obersten Ebene, in dem die Auswahl beginnt. Siehe [Anpassung](customization.md#eigene-aktionen-in-der-schwebenden-toolbar). |
| `blockHandles` | `boolean` | `false` | Ein «+» und ein Griff «⋮⋮» links vom Block unter dem Zeiger: einen Block darunter einfügen, einen Block verschieben oder sein Menü öffnen. Siehe [Anpassung](customization.md#block-griffe). |
| `remoteCarets` | `RemoteCaret[]` | `[]` | Die Cursor anderer Personen über dem Inhalt. Siehe [Anpassung](customization.md#gemeinsames-bearbeiten-fremde-cursor-und-änderungen-von-außen). |
| `readonly` | `boolean` | `false` | |
| `minHeight` | `string` | `'200px'` | CSS-Länge am Root-Element. |
| `maxHeight` | `string` | `undefined` | CSS-Länge am Root-Element. |
| `resizable` | `boolean` | `true` | Vom Benutzer vertikal in der Größe änderbar. |
| `blockRenderers` | `BlockRenderers` | `{}` | Sprachen von Code-Blöcken, die als das angezeigt werden, was sie darstellen, z. B. `{ mermaid }`. Siehe [Erweiterungen](extensions.md#block-vorschauen-diagramme-charts). |
| `slashCommands` | `SlashCommand[]` | `[]` | Einträge, die dem Slash-Menü nach den eingebauten hinzugefügt werden. |
| `allowedAttributes` | `Record<string, string[]>` | `{}` | Attribute, die pro Tag über die eingebaute Whitelist hinaus erhalten bleiben — Ihre eigenen Marker, z. B. `{ img: ['data-signature'] }`. `on*`-Handler werden nie übernommen. |

## Events

`@update:modelValue` — dasselbe wie `v-model`.

`@caret` — `{ block, offset } | null`: wo der Cursor steht — der Index des Blocks der obersten Ebene und der Zeichenversatz in seinem Text —, höchstens alle 100 ms; `null`, wenn der Editor keinen Fokus hat.

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
