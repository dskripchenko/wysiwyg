---
title: Anpassung
locale: de
status: stub
translated_from: ../en/customization.md
---

# Anpassung

> ⚠️ **Diese Seite ist noch nicht vollständig übersetzt.** Bitte nutzen Sie vorerst die [englische Version](../en/customization.md).

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

Über eigenen fixierten Ebenen des Hosts `--dsk-wysiwyg-fullscreen-z` erhöhen
(Standard 1000).

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
Die Gruppen sind `toolbar` (Titel, `label` für das aria-label der Toolbar,
`sourceBack`, `fullscreenExit`, `linkPrompt` für den Ersatz-Prompt) und
`slash` (die eingebauten Einträge und ihre Hinweise); die vollständigen Sätze
werden als `wysiwygEn` und `wysiwygRu` exportiert, die Typen als
`WysiwygLabels` und `WysiwygPartialLabels`. `DskWysiwygToolbar` und
`DskWysiwygSlashMenu` nehmen dieselben `locale` und `labels`, wenn sie
einzeln verwendet werden.

Das Kit ist ein optionaler Peer: ohne es ist der Editor englisch, sofern
nichts anderes angegeben ist.
