import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { EditorController } from '../engine'
import DskWysiwyg from '../DskWysiwyg.vue'

function caretIn(node: Node, offset: number): void {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
}

function caret(): Range {
  return window.getSelection()!.getRangeAt(0)
}

describe('DskWysiwyg co-editing', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('patches an outside value in, keeping the caret\'s node', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>one</p><p>two</p>' }, attachTo: document.body })
    await flushPromises()
    const host = w.find('.dsk-wysiwyg__content').element as HTMLElement
    host.focus()
    const text = host.children[1]!.firstChild!
    caretIn(text, 2)
    await w.setProps({ modelValue: '<p>one, from someone else</p><p>two</p>' })
    expect(host.children[0]!.textContent).toBe('one, from someone else')
    expect(caret().startContainer).toBe(text)
    expect(caret().startOffset).toBe(2)
    w.unmount()
  })

  it('emits the caret as a block and an offset, and null on blur', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>one</p><p>two words</p>' }, attachTo: document.body })
    await flushPromises()
    const host = w.find('.dsk-wysiwyg__content').element as HTMLElement
    host.focus()
    const wait = (): Promise<void> => new Promise((r) => setTimeout(r, 120))
    await wait()
    caretIn(host.children[1]!.firstChild!, 4)
    document.dispatchEvent(new Event('selectionchange'))
    await wait()
    expect(w.emitted('caret')!.at(-1)).toEqual([{ block: 1, offset: 4 }])

    // Throttled: three quick moves are reported as at most two events, the last one last.
    const before = w.emitted('caret')!.length
    for (const offset of [1, 2, 3]) {
      caretIn(host.children[0]!.firstChild!, offset)
      document.dispatchEvent(new Event('selectionchange'))
    }
    await wait()
    expect(w.emitted('caret')!.length - before).toBeLessThanOrEqual(2)
    expect(w.emitted('caret')!.at(-1)).toEqual([{ block: 0, offset: 3 }])

    await new Promise((r) => setTimeout(r, 120))
    host.blur()
    await w.find('.dsk-wysiwyg__content').trigger('blur')
    expect(w.emitted('caret')!.at(-1)).toEqual([null])
    w.unmount()
  })

  it('draws other people\'s carets in an overlay that never reaches the content', async () => {
    const w = mount(DskWysiwyg, {
      props: {
        modelValue: '<p>hello</p><p>world</p>',
        remoteCarets: [
          { id: 'u1', name: 'Anna', color: 'rgb(255, 0, 0)', block: 1, offset: 2 },
          { id: 7, name: 'Boris', block: 0 },
          { id: 'gone', name: 'Nobody', block: 9 },
        ],
      },
      attachTo: document.body,
    })
    await flushPromises()
    const overlay = w.find('.dsk-wysiwyg__carets')
    expect(overlay.exists()).toBe(true)
    expect(overlay.attributes('aria-hidden')).toBe('true')
    const carets = overlay.findAll('.dsk-wysiwyg__caret')
    // A caret past the last block is not drawn.
    expect(carets).toHaveLength(2)
    expect(carets[0]!.text()).toBe('Anna')
    expect(carets[0]!.attributes('style')).toContain('--dsk-wysiwyg-caret-color: rgb(255, 0, 0)')
    // No colour given: one from the palette.
    expect(carets[1]!.attributes('style')).toMatch(/--dsk-wysiwyg-caret-color: #[0-9a-f]{6}/)
    const host = w.find('.dsk-wysiwyg__content').element
    expect(host.contains(overlay.element)).toBe(false)
    const vm = w.vm as unknown as { controller: EditorController }
    expect(vm.controller.getHTML()).toBe('<p>hello</p><p>world</p>')
    expect(w.emitted('update:modelValue')).toBeUndefined()

    await w.setProps({ remoteCarets: [] })
    expect(w.find('.dsk-wysiwyg__carets').exists()).toBe(false)
    w.unmount()
  })

  it('gives the same id the same colour', async () => {
    const carets = [{ id: 'same', name: 'A', block: 0 }, { id: 'same', name: 'B', block: 0 }]
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>x</p>', remoteCarets: carets }, attachTo: document.body })
    await nextTick()
    const styles = w.findAll('.dsk-wysiwyg__caret').map((c) => c.attributes('style')!.match(/#[0-9a-f]{6}/)![0])
    expect(styles[0]).toBe(styles[1])
    w.unmount()
  })
})
