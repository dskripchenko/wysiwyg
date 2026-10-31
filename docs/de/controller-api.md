# Controller-API

`<DskWysiwyg>` stellt über eine Template-Ref einen Controller bereit. Der
Controller bietet eine Chain-API ähnlich wie `editor.chain()` in Tiptap.

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'

const editorRef = ref(null)
const html = ref('')

function insertGreeting() {
  editorRef.value?.controller.chain()
    .focus()
    .heading(2)
    .insertText('Hello!')
    .paragraph()
    .insertText('Welcome.')
    .run()
}
</script>

<template>
  <DskWysiwyg ref="editorRef" v-model="html" />
  <button @click="insertGreeting">Insert greeting</button>
</template>
```

## Chain-Methoden

| Methode | Wirkung |
|---|---|
| `focus()` | Fokussiert den Editor. |
| `bold()` / `italic()` / `underline()` / `strike()` / `code()` | Schaltet ein Inline-Mark um. |
| `heading(level: 1..6)` | Setzt den aktuellen Block auf `<h{level}>`. |
| `paragraph()` | Setzt den aktuellen Block auf `<p>`. |
| `bulletList()` / `orderedList()` | Umschließt den aktuellen Block mit `<ul>`/`<ol>`. |
| `blockquote()` | Setzt den aktuellen Block auf `<blockquote>`. |
| `codeBlock()` | Setzt den aktuellen Block auf `<pre>`. |
| `insertCodeBlock(language: string, code?: string)` | Fügt `<pre><code class="language-X">code</code></pre>` ein (ein leerer aktueller Absatz wird ersetzt), der Cursor steht am Ende des Codes. |
| `link(href: string, target?: '_blank')` | Umschließt die Auswahl mit `<a href>`. |
| `unlink()` | Entfernt das `<a>` um die Auswahl. |
| `image(src: string, alt?: string)` | Fügt ein `<img>` ein. |
| `hr()` | Fügt eine horizontale Linie ein. |
| `insertText(text: string)` | Fügt reinen Text ein. |
| `insertHTML(html: string)` | Fügt sanitisiertes HTML ein. |
| `undo()` / `redo()` | Navigation im Verlauf. |
| `clear()` | Setzt auf ein leeres `<p><br></p>` zurück. |
| `setContent(html: string)` | Ersetzt den Inhalt. |
| `getHTML()` | Liefert das aktuelle sanitisierte HTML (zusätzlich von ZWSP-Markern bereinigt). |

### Tabellen

| Methode | |
|---|---|
| `insertTable(rows: number, cols: number)` | |
| `addRow()` / `addRowAfter()` / `addRowBefore()` | |
| `addColumn()` / `addColumnAfter()` / `addColumnBefore()` | |
| `removeRow()` / `removeColumn()` / `removeTable()` | |

### Source-Modus

| Methode | |
|---|---|
| `toggleSource()` | Schaltet zwischen WYSIWYG und Raw-HTML-Editor um. |
| `isSource()` | Boolean. |

## Imperative Verwendung ohne Chain

```js
const c = editorRef.value.controller
c.focus()
c.bold()
c.insertText('Bold')
```

Jede Methode legt einen Verlaufs-Snapshot an (gedrosselt). Wenn Sie viele
Operationen ohne Zwischen-Snapshots bündeln möchten, umschließen Sie sie mit
`controller.batch(() => { ... })`.

## Events

Die Komponente emittiert `@update:modelValue` nach jedem Commit. Hören Sie
in der Elternkomponente darauf, etwa für Speichern beim Blur.

## Siehe auch

- [Erweiterungen](extensions.md) — was bereits eingebunden ist
- [Anpassung](customization.md) — eigene Befehle registrieren
