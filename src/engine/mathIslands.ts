/**
 * Formulas in the editor: a TeX formula is one island — `<span data-math="TeX"
 * data-display="inline|block">` — drawn as MathML by @dskripchenko/math, not
 * editable inside (a double click edits its TeX). The content keeps only the
 * island and its TeX; the drawing is the editor's own, redrawn when the TeX
 * changes, dropped from what the editor gives out.
 */
import { renderMath, texOf } from '@dskripchenko/math'

export const MATH_ATTR = 'data-math'
export const MATH_DISPLAY_ATTR = 'data-display'

/** A formula island for a TeX; `block` for a formula on its own line. */
export function mathIsland(doc: Document, tex: string, block: boolean): HTMLElement {
  const span = doc.createElement('span')
  span.setAttribute(MATH_ATTR, tex)
  span.setAttribute(MATH_DISPLAY_ATTR, block ? 'block' : 'inline')
  return span
}

/**
 * Drawn formulas in pasted or loaded HTML (MathML with its TeX, a TeX error
 * span, a displayed formula's wrapper) as islands; an island's own drawing
 * dropped. Runs before sanitizing, on a detached tree.
 */
export function mathToIslands(root: Element): void {
  const doc = root.ownerDocument
  // A displayed formula of the Markdown renderer: a paragraph of its own.
  for (const wrap of Array.from(root.querySelectorAll('div.uid-markdown__math'))) {
    const drawn = wrap.querySelector('math, .dsk-math-error')
    const tex = drawn ? texOf(drawn) : null
    if (tex === null) continue
    const p = doc.createElement('p')
    p.append(mathIsland(doc, tex, true))
    wrap.replaceWith(p)
  }
  for (const el of Array.from(root.querySelectorAll(`span[${MATH_ATTR}]`))) el.replaceChildren()
  for (const drawn of Array.from(root.querySelectorAll('math, span.dsk-math-error'))) {
    if (drawn.closest(`[${MATH_ATTR}]`)) continue
    const tex = texOf(drawn)
    if (tex === null) continue
    drawn.replaceWith(mathIsland(doc, tex, drawn.getAttribute('display') === 'block'))
  }
}

const drawnAs = new WeakMap<HTMLElement, string>()

/** Draws the islands whose TeX changed since they were drawn (cheap when none did). */
export function syncMath(host: HTMLElement): void {
  for (const el of Array.from(host.querySelectorAll<HTMLElement>(`span[${MATH_ATTR}]`))) {
    const tex = el.getAttribute(MATH_ATTR) ?? ''
    const block = el.getAttribute(MATH_DISPLAY_ATTR) === 'block'
    const key = `${block ? 'b' : 'i'}:${tex}`
    if (drawnAs.get(el) === key && el.firstElementChild) continue
    el.innerHTML = renderMath(tex, { display: block })
    el.setAttribute('contenteditable', 'false')
    el.classList.add('dsk-math-island')
    drawnAs.set(el, key)
  }
}

/** A detached copy's islands without their drawing: what the editor gives out. */
export function stripMathDrawings(root: Element | DocumentFragment): void {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(`span[${MATH_ATTR}]`))) {
    el.replaceChildren()
    el.removeAttribute('contenteditable')
    el.removeAttribute('class')
  }
}

/** The formula island an event happened in, if any. */
export function mathIslandOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(`span[${MATH_ATTR}]`) : null
}
