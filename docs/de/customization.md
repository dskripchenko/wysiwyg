# Anpassung

## Themes

Der Editor berücksichtigt per CSS die gängigen Dark-Mode-Signale:

- `data-theme="dark"` auf `:root` oder einem beliebigen Vorfahren (z. B.
  gesetzt vom Theme-Umschalter Ihrer App)
- `:root.dark` (Tailwind-Stil)
- ein Vorfahre mit `[data-theme='dark']` (die meisten Umschalter auf
  App-Ebene)
- `@media (prefers-color-scheme: dark)` (Systemeinstellung)
- `[data-theme='light']` erzwingt das helle Theme auch bei dunklem System

Oder direkt anwenden:

```vue
<DskWysiwyg v-model="html" class="dsk-wysiwyg--dark-theme" />
```

## Tokens

Alle Farben sind CSS Custom Properties — überschreiben Sie sie an beliebiger
Stelle:

```css
.dsk-wysiwyg {
  --dsk-wysiwyg-bg: #fff;
  --dsk-wysiwyg-fg: #111;
  --dsk-wysiwyg-border: #e5e7eb;
  --dsk-wysiwyg-accent: #14b8a6;
  --dsk-wysiwyg-muted: #6b7280;

  /* Farben der Syntax-Tokens */
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

## Größe & Resize

```vue
<DskWysiwyg
  v-model="html"
  min-height="150px"
  max-height="600px"
  :resizable="true"
/>
```

Der Benutzer kann den Griff unten rechts vertikal ziehen. Zum Deaktivieren:

```vue
<DskWysiwyg :resizable="false" />
```

## Eigene Toolbar-Elemente

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', '|', 'h2', 'h3', '|', 'link', 'image', 'source']"
/>
```

`|` ist ein Trenner. Elemente: `bold`, `italic`, `underline`, `strike`,
`code`, `h1`-`h3`, `ul`, `ol`, `quote`, `link`, `image`, `hr`,
`codeblock`, `table`, `undo`, `redo`, `source`, `fullscreen`.

## Eigene Befehle

Verwenden Sie den Controller aus einem Button des Hosts:

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

## Sanitisierung

`getHTML()` schickt die Ausgabe durch eine DOMParser-basierte Whitelist:

- Erlaubte Tags: `p`, `br`, `strong`, `em`, `u`, `s`, `code`, `pre`,
  `h1`-`h6`, `ul`, `ol`, `li`, `blockquote`, `a` (`href`, `target`,
  `rel`), `img` (`src`, `alt`, `width`, `height`), `hr`, `table`,
  `thead`, `tbody`, `tr`, `th`, `td`, `span`/`code` mit `class` mit dem
  Präfix `language-`/`dsk-tok-`.
- Alles andere wird verworfen.

Zum Erweitern: forken oder vor dem Speichern mit einer eigenen
`sanitizeHtml` umschließen.

## Events / Lebenszyklus

- `@update:modelValue` — nach jeder übernommenen Bearbeitung (debounced).
- `controller.on('blur', fn)` — bereitgestellt für Speichern beim Blur auf
  Host-Seite.

## Siehe auch

- [Controller-API](controller-api.md)
- [Erweiterungen](extensions.md)

## Vollbild

Das Toolbar-Element `fullscreen` (im Standardsatz, nach `source`) breitet den
Editor über das ganze Fenster aus — für lange Texte und breite Blöcke wie
Diagramme oder API-Widgets. Escape oder derselbe Button beendet es; die Seite
darunter scrollt währenddessen nicht, und auf breiten Bildschirmen bleibt der
Text eine lesbare Spalte.

```ts
const editor = ref()
editor.value.toggleFullscreen()      // oder setFullscreen(true)
editor.value.fullscreen              // der aktuelle Zustand
```

```vue
<DskWysiwyg ref="editor" v-model="html" @fullscreen-change="(on) => …" />
```

Liegen eigene fixierte Ebenen des Hosts darüber, erhöhen Sie
`--dsk-wysiwyg-fullscreen-z` (Standard 1000).

## Sprache

Die Titel der Toolbar, das Slash-Menü und der Platzhalter gibt es auf
Englisch und Russisch. Woher die Sprache kommt — der erste Treffer gewinnt:

1. `labels` — einzelne Strings über denen der Sprache;
2. `locale` — `'en'` oder `'ru'`;
3. die Locale des UI-Kits @dskripchenko/ui, wenn das Kit installiert ist und
   über dem Editor ein `UidLocaleProvider` (oder `provideLocale()`) liegt: ein
   `code`, der mit `ru` beginnt, ergibt Russisch, alles andere Englisch;
4. Englisch.

```vue
<DskWysiwyg v-model="html" locale="ru" />

<DskWysiwyg
  v-model="html"
  :labels="{ placeholder: 'Schreiben…', toolbar: { bold: 'Fett (⌘B)' }, slash: { h1: 'Überschrift 1' } }"
/>
```

Die Prop `placeholder` hat weiterhin Vorrang vor dem Platzhalter der Sprache.
Die Gruppen sind `toolbar` (Titel, `label` der Toolbar für ihr aria-label,
`sourceBack`, `fullscreenExit`, `linkPrompt` für den Ersatz-Prompt) und
`slash` (die eingebauten Einträge und ihre Hinweise); die vollständigen Sätze
werden als `wysiwygEn` und `wysiwygRu` exportiert, die Typen als
`WysiwygLabels` und `WysiwygPartialLabels`. `DskWysiwygToolbar` und
`DskWysiwygSlashMenu` nehmen dieselben `locale` und `labels`, wenn sie
einzeln verwendet werden.

Das Kit ist ein optionaler Peer: Ohne es ist der Editor englisch, sofern
nichts anderes angegeben ist.
