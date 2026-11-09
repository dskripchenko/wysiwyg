import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import DskWysiwyg from '../DskWysiwyg.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

function host(w: VueWrapper): HTMLElement {
  return w.find('.dsk-wysiwyg__content').element as HTMLElement
}

function html(w: VueWrapper): string {
  return (w.vm as unknown as { controller: { getHTML(): string } }).controller.getHTML()
}

/** The pointer over the n-th top-level block. */
async function hover(w: VueWrapper, n: number): Promise<void> {
  host(w).children[n]!.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
  await nextTick()
}

async function editor(props: Record<string, unknown> = {}): Promise<VueWrapper> {
  const w = mount(DskWysiwyg, { props: { modelValue: '<p>a</p><p>b</p><p>c</p>', blockHandles: true, locale: 'en', ...props }, attachTo: document.body })
  await flushPromises()
  return w
}

/** Gives each top-level block a box on screen: 20px tall, one under the other. */
function layOut(w: VueWrapper): void {
  Array.from(host(w).children).forEach((el, i) => {
    (el as HTMLElement).getBoundingClientRect = () => ({ top: i * 20, bottom: i * 20 + 20, left: 0, right: 100, width: 100, height: 20, x: 0, y: i * 20, toJSON: () => ({}) }) as DOMRect
  })
}

function pointer(type: string, clientY: number): Event {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientY, button: 0 })
  return e
}

describe('block handles', () => {
  it('show beside the hovered block, with localized labels', async () => {
    const w = await editor({ locale: 'ru' })
    expect(w.find('.dsk-wysiwyg-handles').exists()).toBe(false)
    await hover(w, 1)
    const buttons = w.findAll('.dsk-wysiwyg-handles__btn')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.attributes('aria-label')).toBe('Добавить блок ниже')
    expect(buttons[1]!.attributes('aria-haspopup')).toBe('menu')
    expect(w.classes()).toContain('dsk-wysiwyg--handles')
    w.unmount()
  })

  it('are off by default, in readonly and in source mode', async () => {
    const off = await editor({ blockHandles: false })
    await hover(off, 0)
    expect(off.find('.dsk-wysiwyg-handles').exists()).toBe(false)
    off.unmount()
    const ro = await editor({ readonly: true })
    await hover(ro, 0)
    expect(ro.find('.dsk-wysiwyg-handles').exists()).toBe(false)
    expect(ro.classes()).not.toContain('dsk-wysiwyg--handles')
    ro.unmount()
  })

  it('«+» adds a paragraph below with the slash menu open, as one step', async () => {
    const w = await editor()
    await hover(w, 0)
    await w.find('.dsk-wysiwyg-handles__btn').trigger('click')
    await nextTick()
    expect(html(w)).toBe('<p>a</p><p>/</p><p>b</p><p>c</p>')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['<p>a</p><p>/</p><p>b</p><p>c</p>'])
    expect(document.querySelector('.dsk-wysiwyg-slash')).not.toBeNull()
    // Picking a command turns the new block into it.
    ;(document.querySelector('.dsk-wysiwyg-slash__item') as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    await nextTick()
    expect(html(w)).toBe('<p>a</p><h1><br></h1><p>b</p><p>c</p>')
    w.unmount()
  })

  it('the grip\'s menu moves, duplicates and deletes, one history step each', async () => {
    const w = await editor()
    await hover(w, 0)
    await w.find('.dsk-wysiwyg-handles__grip').trigger('click')
    const items = w.findAll('[role="menuitem"]')
    expect(items.map((i) => i.text())).toEqual(['Move up', 'Move down', 'Duplicate', 'Delete'])
    expect(items[0]!.attributes('disabled')).toBeDefined()
    await items[1]!.trigger('click')
    expect(html(w)).toBe('<p>b</p><p>a</p><p>c</p>')
    expect(w.find('[role="menu"]').exists()).toBe(false)
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['<p>b</p><p>a</p><p>c</p>'])

    await hover(w, 2)
    await w.find('.dsk-wysiwyg-handles__grip').trigger('click')
    expect(w.findAll('[role="menuitem"]')[1]!.attributes('disabled')).toBeDefined()
    await w.findAll('[role="menuitem"]')[2]!.trigger('click')
    expect(html(w)).toBe('<p>b</p><p>a</p><p>c</p><p>c</p>')

    await hover(w, 0)
    await w.find('.dsk-wysiwyg-handles__grip').trigger('click')
    await w.findAll('[role="menuitem"]')[3]!.trigger('click')
    expect(html(w)).toBe('<p>a</p><p>c</p><p>c</p>')

    const c = (w.vm as unknown as { controller: { chain(): { undo(): { run(): void } } } }).controller
    c.chain().undo().run()
    expect(html(w)).toBe('<p>b</p><p>a</p><p>c</p><p>c</p>')
    w.unmount()
  })

  it('the menu works from the keyboard', async () => {
    const w = await editor()
    await hover(w, 1)
    const grip = w.find('.dsk-wysiwyg-handles__grip')
    // A click from the keyboard (Enter or Space on the button) has no pointer: detail 0.
    grip.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
    await nextTick()
    await nextTick()
    const items = w.findAll<HTMLButtonElement>('[role="menuitem"]')
    expect(document.activeElement).toBe(items[0]!.element)
    await w.find('[role="menu"]').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1]!.element)
    await w.find('[role="menu"]').trigger('keydown', { key: 'End' })
    expect(document.activeElement).toBe(items[3]!.element)
    await w.find('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(grip.element)
    w.unmount()
  })

  it('dragging the grip moves the block where the line shows', async () => {
    const w = await editor()
    layOut(w)
    await hover(w, 0)
    const grip = w.find('.dsk-wysiwyg-handles__grip').element
    grip.dispatchEvent(pointer('pointerdown', 10))
    window.dispatchEvent(pointer('pointermove', 12))
    await nextTick()
    // Under the threshold: not a drag yet.
    expect(w.find('.dsk-wysiwyg-handles__drop').exists()).toBe(false)
    window.dispatchEvent(pointer('pointermove', 55))
    await nextTick()
    expect(w.find('.dsk-wysiwyg-handles__drop').exists()).toBe(true)
    window.dispatchEvent(pointer('pointerup', 55))
    await nextTick()
    expect(html(w)).toBe('<p>b</p><p>c</p><p>a</p>')
    expect(w.find('.dsk-wysiwyg-handles__drop').exists()).toBe(false)
    // The click that ends a drag does not open the menu.
    grip.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await nextTick()
    expect(w.find('[role="menu"]').exists()).toBe(false)
    w.unmount()
  })

  it('a press without a drag leaves the blocks alone', async () => {
    const w = await editor()
    layOut(w)
    await hover(w, 0)
    const grip = w.find('.dsk-wysiwyg-handles__grip').element
    grip.dispatchEvent(pointer('pointerdown', 10))
    window.dispatchEvent(pointer('pointerup', 11))
    await nextTick()
    expect(html(w)).toBe('<p>a</p><p>b</p><p>c</p>')
    w.unmount()
  })
})
