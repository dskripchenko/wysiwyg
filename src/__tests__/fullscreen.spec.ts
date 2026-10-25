import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DskWysiwyg from '../DskWysiwyg.vue'

describe('fullscreen', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('toggles from the toolbar, locks the page scroll and reports the change', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hi</p>' }, attachTo: document.body })
    const button = w.find('button[aria-pressed]')
    expect(button.exists()).toBe(true)

    await button.trigger('click')
    expect(w.classes()).toContain('dsk-wysiwyg--fullscreen')
    expect(document.documentElement.classList.contains('dsk-wysiwyg-fullscreen-open')).toBe(true)
    expect(w.emitted('fullscreen-change')).toEqual([[true]])

    await button.trigger('click')
    expect(w.classes()).not.toContain('dsk-wysiwyg--fullscreen')
    expect(document.documentElement.classList.contains('dsk-wysiwyg-fullscreen-open')).toBe(false)
    expect(w.emitted('fullscreen-change')).toEqual([[true], [false]])
    w.unmount()
  })

  it('leaves on Escape, unless something inside already used the key', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hi</p>' }, attachTo: document.body })
    ;(w.vm as unknown as { setFullscreen(v: boolean): void }).setFullscreen(true)
    await nextTick()

    const used = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    used.preventDefault()
    document.dispatchEvent(used)
    await nextTick()
    expect(w.classes()).toContain('dsk-wysiwyg--fullscreen')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await nextTick()
    expect(w.classes()).not.toContain('dsk-wysiwyg--fullscreen')
    w.unmount()
  })

  it('gives the page its scroll back when unmounted in fullscreen', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hi</p>' }, attachTo: document.body })
    ;(w.vm as unknown as { setFullscreen(v: boolean): void }).setFullscreen(true)
    await nextTick()
    w.unmount()
    expect(document.documentElement.classList.contains('dsk-wysiwyg-fullscreen-open')).toBe(false)
  })
})
