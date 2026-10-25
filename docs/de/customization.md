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
