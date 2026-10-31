# Erweiterungen

Die eingebauten Erweiterungen sind standardmäßig aktiviert. Sie erfordern
keine Einrichtung.

## Markdown-Shortcuts

Werden am Anfang eines Blocks ausgelöst (eines von `<p>`, `<div>`,
`<h1>`-`<h3>`, `<blockquote>`, `<pre>`, `<li>`):

| Eingabe | Wird zu |
|---|---|
| `# ` | `<h1>` |
| `## ` | `<h2>` |
| `### ` | `<h3>` |
| `- ` oder `* ` | `<ul><li>` |
| `1. ` | `<ol><li>` |
| `> ` | `<blockquote>` |
| ` ``` ` | `<pre><code>` |

Die auslösende Zeichenfolge (z. B. `## `) wird dabei entfernt.

## Slash-Befehle

Geben Sie `/` am Anfang eines Blocks ein — es erscheint ein Popup mit:

- `/h1`, `/h2`, `/h3` — Überschrift
- `/list`, `/ul` — Aufzählungsliste
- `/ol` — nummerierte Liste
- `/quote` — Blockquote
- `/code` — Code-Block
- `/hr` — horizontale Linie
- `/table` — Tabelle einfügen

Ein Host fügt über die Prop `slashCommands` eigene Einträge hinzu; sie werden
nach den eingebauten aufgeführt.

Filtern Sie, indem Sie weitere Zeichen eingeben (`/h2`). ↑/↓ navigieren,
Enter wählt aus, Esc bricht ab.

## Block-Vorschauen (Diagramme, Charts)

Ein Code-Block kann als das angezeigt werden, was er darstellt. Übergeben Sie
einen Renderer pro Sprache:

```ts
import { render, DiagramError } from '@dskripchenko/diagrams'
import type { BlockRenderers, SlashCommand } from '@dskripchenko/wysiwyg'

const blockRenderers: BlockRenderers = {
  mermaid: (code) => {
    try {
      return { html: render(code).svg }
    } catch (e) {
      if (e instanceof DiagramError) return { error: e.message }
      throw e
    }
  },
}

const slashCommands: SlashCommand[] = [{
  key: 'diagram',
  label: 'Diagram',
  aliases: ['mermaid'],
  apply: (c) => c.chain().focus().insertCodeBlock('mermaid', 'flowchart LR\n  A --> B').run(),
}]
```

```vue
<DskWysiwyg v-model="html" :block-renderers="blockRenderers" :slash-commands="slashCommands" />
```

- Ein `<pre><code class="language-mermaid">` wird als sein Diagramm angezeigt;
  der Code ist verborgen.
- Ein Klick auf das Diagramm öffnet den Code, darunter eine Live-Vorschau.
  Nach einer kurzen Eingabepause wird neu gerendert. Escape oder das
  Verlassen des Blocks mit dem Cursor schließt ihn.
- Ein Renderer, der `{ error }` liefert, lässt den Code offen und zeigt die
  Meldung darunter an.
- Backspace über einem angezeigten Diagramm löscht es zusammen mit seinem
  Code; Undo stellt beides wieder her.
- Im Readonly-Modus werden Diagramme angezeigt, öffnen sich aber nicht.

Das gespeicherte HTML ändert sich nie: `getHTML()`, das v-model, der Verlauf
und `htmlToMarkdown` sehen nur den Code-Block (` ```mermaid `). Die Vorschau
ist eine nicht editierbare Insel, die der Editor hinzufügt und wieder
entfernt.

Ein Renderer hat denselben Vertrag wie `blockRenderers` von UidMarkdown aus
dem Kit: `(code, { language, index }) => { html?, error? }` oder ein Promise
davon, sodass eine Registry beide bedient. `html` wird unverändert eingefügt,
und der Renderer ist für seine Sicherheit verantwortlich. Der Editor selbst
hängt von keiner Diagramm-Bibliothek ab.

### Live-Blöcke (Widgets)

Statt `html` kann ein Renderer `mount` liefern. Die Insel enthält dann ein
lebendes Widget — ein Formular, einen Request-Builder —, das zugleich der
Editor des Blocks ist:

```ts
const blockRenderers: BlockRenderers = {
  api: () => ({
    mount: (el, { code, editable, setCode }) => {
      const widget = createWidget(el, { code, readonly: !editable, onChange: setCode })
      return { update: (next) => widget.setCode(next), destroy: () => widget.unmount() }
    },
  }),
}
```

- Der Code bleibt verborgen und öffnet sich nie: Das Widget ändert ihn über
  `setCode(code)`; der Editor verbucht das als einen Verlaufsschritt und
  emittiert es.
- Undo und Redo ändern den Code von außen: Das Widget erhält ihn über
  `update(code)`; ohne `update` wird es neu gemountet.
- Tasten, Eingaben, Einfügen und Klicks im Widget bleiben dort — der Editor
  behandelt sie nicht als seine eigenen.
- Im Readonly-Modus ist `editable` gleich `false` und `setCode` wird
  ignoriert; ein Moduswechsel mountet die Widgets neu.
- `destroy` läuft, wenn der Block gelöscht, durch ein Undo ersetzt oder der
  Editor ausgehängt wird.

Der Vertrag (`BlockMountContext`, `BlockMountHandle`) ist derselbe wie bei
UidMarkdown aus dem Kit, sodass ein einmal registrierter Renderer in beiden
funktioniert.

## Syntax-Highlighting für Code

`<pre><code class="language-{lang}">`-Blöcke werden beim Verlassen des Fokus
(Blur) hervorgehoben. Unterstützte Sprachen: `js`, `ts`, `tsx`, `jsx`,
`php`, `html`, `css`, `json`.

Der Highlighter ist eine tokenbasierte Regex-Implementierung (~5 KB). Bei
exotischen Sprachen lassen Sie die Klasse `language-` weg, dann bleibt der
Block einfacher Code.

## Tabellen

`controller.insertTable(3, 4)` fügt eine 3×4-Tabelle mit `<thead>` /
`<tbody>` / `<th>` / `<td>` ein. Sobald sich der Cursor in einer Tabelle
befindet, zeigt die Toolbar Buttons für addRow / addColumn / remove (oder
verwenden Sie den Controller).

## HTML→Markdown

```ts
import { htmlToMarkdown } from '@dskripchenko/wysiwyg'

const md = htmlToMarkdown('<h1>Hi</h1><p><strong>bold</strong> text, version 1.5</p>')
// '# Hi\n\n**bold** text, version 1.5'
```

Das HTML des Editors als CommonMark mit GFM-Tabellen und Durchstreichung, so
geschrieben, dass die Rückkonvertierung dasselbe Dokument ergibt — ein zweiter
Durchlauf ändert nichts:

- Überschriften h1–h6, Absätze, `**fett**`, `*kursiv*`, `~~durchgestrichen~~`;
  `u`, `mark`, `sup`, `sub` bleiben HTML (Markdown kennt sie nicht);
- Inline-Code mit so vielen Backticks wie nötig; Code-Blöcke mit einem Fence,
  der länger ist als alle Backticks darin, die Sprache bleibt erhalten
  (` ```mermaid `);
- Listen per Einrückung verschachtelt, mehrere Absätze in einem Eintrag;
- Zitate, auch verschachtelte; Tabellen mit der Spaltenausrichtung; Links und
  Bilder mit ihrem Titel; `<br>` als harter Umbruch (`\` am Zeilenende);
- Text wird nur dort escaped, wo ein Zeichen Markup bedeuten würde (`*`, `_`,
  `` ` ``, `[`, `<` sowie `#`, `-`, `1.` am Zeilenanfang): Punkte,
  Bindestriche und Klammern bleiben, wie sie geschrieben wurden.

Die Vorschau-Inseln des Editors werden ausgelassen.

## Source-Modus

Der Button `[</>]` der Toolbar schaltet zwischen WYSIWYG und einem
Raw-HTML-Editor um (`<textarea>` mit Overlay-Syntax-Highlighting). Beim
Wechsel hinein wird das HTML **beautified** (Zeilenumbrüche + 2 Leerzeichen
Einrückung zwischen Block-Tags). Beim Wechsel heraus wird es **minified**
(Whitespace zwischen Block-Tags zusammengefasst). Der persistierte
Formularzustand enthält die minifizierte Version.

## Öffentliche Erweiterungs-API

```ts
import { highlight } from '@dskripchenko/wysiwyg'

highlight('const x = 1', 'js')   // liefert einen HTML-String mit <span class="dsk-tok-*">
```

## Siehe auch

- [Controller-API](controller-api.md) — programmatischer Aufruf
- [Anpassung](customization.md) — Anpassung auf Host-Seite
