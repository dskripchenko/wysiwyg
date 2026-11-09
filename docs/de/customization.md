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

## Bearbeiten an Ort und Stelle: schwebende Toolbar und frameless

Um eine Seite dort zu bearbeiten, wo sie steht, entfällt der Rahmen, und die
Formatierung kommt aus einer kleinen dunklen Leiste über der Auswahl:

```vue
<DskWysiwyg v-model="html" frameless bubble :toolbar="false" :resizable="false" />
```

`bubble` zeigt die Leiste, solange die Auswahl im Inhalt nicht leer ist
(nicht im Quelltextmodus oder readonly); sie verschwindet, wenn die Auswahl
leer wird, den Editor verlässt, oder mit Escape. Ein Klick auf ihre Buttons
behält die Auswahl. Sie steht zentriert über der Auswahl, darunter, wenn oben
kein Platz ist, und bleibt im Editor. `true` ergibt Fett, Kursiv,
Unterstrichen, Durchgestrichen, Inline-Code, Link, Überschrift 2 und
Aufzählung; ein Array wählt die Elemente (`:bubble="['bold', 'italic', 'link']"`).

`frameless` entfernt Rahmen, Radius, Hintergrund und Innenabstand um den
Inhalt sowie den Hintergrund der Toolbar und übernimmt Textfarbe und -größe
der Seite. `--dsk-wysiwyg-frameless-padding` (standardmäßig 0) setzt den
Innenabstand zurück.

Die Tokens der Leiste (im dunklen Theme eine Stufe heller, mit Rand):

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

### Eigene Aktionen in der schwebenden Toolbar

`bubbleActions` fügt eigene Schaltflächen am Ende der schwebenden Toolbar
hinzu, nach einem Trenner — etwa eine Schaltfläche «Kommentieren»:

```vue
<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next'
import type { BubbleAction } from '@dskripchenko/wysiwyg'

const actions: BubbleAction[] = [
  { key: 'comment', label: 'Kommentieren', icon: MessageSquare, run: ({ text, block }) => openComment(text, block) },
]
</script>

<template>
  <DskWysiwyg v-model="html" bubble :bubble-actions="actions" />
</template>
```

Jede Schaltfläche zeigt ihr `icon` (jede Komponente mit einer `size`-Prop)
und ihr `label`. Ein Druck behält die Auswahl, wie bei den anderen
Schaltflächen; `run` erhält den markierten Text und `block`, den Index des
Blocks der obersten Ebene (eines direkten Kindes des Inhalts), in dem die
Auswahl beginnt. Ist `bubble` aus, zeigt die schwebende Toolbar nur die
Aktionen.

## Block-Griffe

`blockHandles` setzt ein «+» und einen Griff «⋮⋮» in den Rand links vom
Block unter dem Zeiger (oder, wenn der Zeiger woanders ist, vom Block mit
dem Cursor):

- «+» fügt darunter einen leeren Absatz ein und öffnet darin das
  Slash-Menü: Der Absatz beginnt mit `/`, als wäre es getippt worden — Tippen
  filtert also das Menü, und Escape lässt das `/` als Text stehen.
- Das Ziehen am Griff (Maus, Stift oder Touch) verschiebt den Block; eine
  Linie zeigt, wo er landet. Ein Diagramm wandert mit seinem Code.
- Ein Klick auf den Griff (oder Enter / Leertaste darauf) öffnet ein Menü:
  Nach oben, Nach unten, Duplizieren, Löschen. Pfeiltasten, Pos1 und Ende
  bewegen sich darin; Escape schließt es.

Jede Änderung ist ein Rückgängig-Schritt und sendet `update:modelValue`.
Ein duplizierter Block behält seine Block-ID (`^id`) nicht: IDs sind
eindeutig. Im Nur-Lese- und im Quelltextmodus sowie auf Bildschirmen unter
600px werden die Griffe nicht gezeigt. Ein Editor mit Rahmen schafft ihnen
Platz in seinem Innenabstand; ein `frameless`-Editor stellt sie in den
Seitenrand, außerhalb seiner Box — lassen Sie links etwa
`--dsk-wysiwyg-handles-gutter` (52px) frei. Die Einfügelinie nimmt
`--dsk-wysiwyg-drop-color`; die Texte stehen in der Gruppe `blocks` (siehe
[Sprache](#sprache)).

Dieselben Operationen hat der Controller: `moveBlock(from, to)`,
`duplicateBlock(index)`, `removeBlock(index)`.

## Gemeinsames Bearbeiten: fremde Cursor und Änderungen von außen

Für gemeinsames Bearbeiten in Echtzeit meldet der Editor, wo sein Cursor
steht, übernimmt einen neuen Wert von außen, ohne den Cursor zu verlieren,
und zeichnet die Cursor der anderen.

- Ein neuer `modelValue` von außen (die Änderung einer anderen Person) wird
  eingepatcht, nicht ersetzt: Die Blöcke der obersten Ebene, die alter und
  neuer Wert am Anfang und am Ende teilen, bleiben dieselben DOM-Knoten, nur
  die abweichende Mitte wird ersetzt. Ein Cursor in einem unberührten Block
  bleibt genau, wo er war; ein Cursor in einem ersetzten Block wird über den
  Index seines Blocks und den Versatz im Text des Blocks zurückgesetzt.
  `controller.patchContent(html)` tut dasselbe aus Code.
- `@caret` meldet `{ block, offset }` — den Index des Blocks der obersten
  Ebene und den Zeichenversatz in seinem Text — höchstens alle 100 ms, und
  `null`, wenn der Editor den Fokus verliert. Senden Sie es an die anderen.
- `remoteCarets` zeichnet deren Cursor: eine dünne Linie in der Farbe der
  Person, mit dem Namen in einem kleinen Fähnchen darüber.

```vue
<DskWysiwyg
  v-model="html"
  :remote-carets="[{ id: 'u2', name: 'Anna', color: '#e11d48', block: 3, offset: 12 }]"
  @caret="(pos) => channel.send({ caret: pos })"
/>
```

Ein Cursor ohne `color` erhält eine Farbe aus einer kleinen Palette nach
seiner `id`; ohne `offset` oder hinter dem Text des Blocks steht er am Ende
des Blocks; fehlt der Block, wird er nicht gezeichnet. Die Cursor sind eine
Ebene über dem Inhalt: Sie nehmen keinen Zeiger an, berühren weder Inhalt
noch Wert und folgen Tippen, Größenänderung und Scrollen, im hellen wie im
dunklen Theme.

**Der Verlauf nach einer Änderung von außen.** Das lokale Rückgängig darf
die Änderung eines anderen nicht wie eine eigene zurücknehmen, deshalb baut
ein Patch den Verlauf neu auf: Die Rückgängig- und Wiederholen-Stapel werden
geleert und beginnen beim gepatchten Inhalt neu. Schritte vor einer Änderung
von außen lassen sich nicht mehr rückgängig machen.

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

Die Texte der Block-Griffe stehen in der Gruppe `blocks` (`add`, `grip`,
`menu`, `moveUp`, `moveDown`, `duplicate`, `remove`), der Umschalter eines
geöffneten Blocks mit Vorschau in `preview` (`split`, `preview`).
