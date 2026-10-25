---
title: Erweiterungen
locale: de
status: stub
translated_from: ../en/extensions.md
---

# Erweiterungen

> ⚠️ **Diese Seite ist noch nicht vollständig übersetzt.** Bitte nutzen Sie vorerst die [englische Version](../en/extensions.md).

## Block-Vorschauen und Live-Blöcke

`blockRenderers` (Prop von `DskWysiwyg`, Option von `EditorController`) zeigt
einen `<pre><code class="language-X">` als das, was er darstellt: `{ mermaid }`
liefert `{ html }` mit einem Diagramm oder `{ error }`. Ein Klick öffnet den
Code mit Live-Vorschau; das gespeicherte HTML enthält nur den Code.

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
  emittiert das HTML.
- Undo und Redo ändern den Code von außen: Das Widget erhält ihn über
  `update(code)`; ohne `update` wird es neu gemountet.
- Tasten, Eingaben, Einfügen und Klicks im Widget bleiben dort — der Editor
  fängt sie nicht ab.
- Im Readonly-Modus ist `editable` gleich `false` und `setCode` wird
  ignoriert; ein Moduswechsel mountet die Widgets neu.
- `destroy` läuft, wenn der Block gelöscht, durch ein Undo ersetzt oder der
  Editor ausgehängt wird.

Der Vertrag (`BlockMountContext`, `BlockMountHandle`) ist derselbe wie bei
UidMarkdown aus dem Kit: Ein einmal registrierter Renderer funktioniert in
beiden.

