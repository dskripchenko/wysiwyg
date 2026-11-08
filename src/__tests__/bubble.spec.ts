import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import DskWysiwyg from '../DskWysiwyg.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Selects `[start, end)` of the first text node of the content's first block and reports it. */
async function select(w: VueWrapper, start: number, end: number): Promise<void> {
  const host = w.find('.dsk-wysiwyg__content').element as HTMLElement
  host.focus()
  const text = host.firstElementChild!.firstChild as Text
  const range = document.createRange()
  range.setStart(text, start)
  range.setEnd(text, end)
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  document.dispatchEvent(new Event('selectionchange'))
  await nextTick()
  await nextTick()
}

describe('bubble', () => {
  it('shows over a non-collapsed selection and hides when it collapses', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hello world</p>', bubble: true }, attachTo: document.body })
    await flushPromises()
    expect(w.find('.dsk-wysiwyg-bubble').exists()).toBe(false)

    await select(w, 0, 5)
    const bubble = w.find('.dsk-wysiwyg-bubble')
    expect(bubble.exists()).toBe(true)
    // The default set: eight buttons.
    expect(bubble.findAll('button')).toHaveLength(8)
    expect(bubble.attributes('style')).toContain('top:')

    await select(w, 3, 3)
    expect(w.find('.dsk-wysiwyg-bubble').exists()).toBe(false)
    w.unmount()
  })

  it('hides on Escape and is off by default', async () => {
    const on = mount(DskWysiwyg, { props: { modelValue: '<p>Hello world</p>', bubble: ['bold'] }, attachTo: document.body })
    await flushPromises()
    await select(on, 0, 5)
    expect(on.findAll('.dsk-wysiwyg-bubble button')).toHaveLength(1)
    await on.find('.dsk-wysiwyg__content').trigger('keydown', { key: 'Escape' })
    expect(on.find('.dsk-wysiwyg-bubble').exists()).toBe(false)
    on.unmount()

    const off = mount(DskWysiwyg, { props: { modelValue: '<p>Hello world</p>' }, attachTo: document.body })
    await flushPromises()
    await select(off, 0, 5)
    expect(off.find('.dsk-wysiwyg-bubble').exists()).toBe(false)
    off.unmount()
  })

  it('is not shown in readonly', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hello world</p>', bubble: true, readonly: true }, attachTo: document.body })
    await flushPromises()
    await select(w, 0, 5)
    expect(w.find('.dsk-wysiwyg-bubble').exists()).toBe(false)
    w.unmount()
  })

  it('runs its command on the selection, keeping the focus on a press', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hello world</p>', bubble: true }, attachTo: document.body })
    await flushPromises()
    await select(w, 0, 5)
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    const bold = w.find('.dsk-wysiwyg-bubble button').element as HTMLButtonElement
    bold.dispatchEvent(press)
    expect(press.defaultPrevented).toBe(true)
    bold.click()
    await nextTick()
    const html = (w.vm as unknown as { controller: { getHTML(): string } }).controller.getHTML()
    expect(html).toContain('<strong>Hello</strong>')
    w.unmount()
  })
})

describe('frameless', () => {
  it('adds the modifier class', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hi</p>', frameless: true } })
    expect(w.classes()).toContain('dsk-wysiwyg--frameless')
    await w.setProps({ frameless: false })
    expect(w.classes()).not.toContain('dsk-wysiwyg--frameless')
  })
})
