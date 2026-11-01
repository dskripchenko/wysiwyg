import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DskWysiwyg from '../DskWysiwyg.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('toolbarTarget', () => {
  it("shows the toolbar in the host's element, still the editor's toolbar", async () => {
    const bar = document.createElement('div')
    bar.id = 'host-bar'
    document.body.append(bar)
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hello</p>', toolbarTarget: '#host-bar' }, attachTo: document.body })
    await flushPromises()
    await nextTick()
    expect(w.find('.dsk-wysiwyg-toolbar').exists()).toBe(false)
    const toolbar = bar.querySelector('.dsk-wysiwyg-toolbar')
    expect(toolbar).not.toBeNull()
    expect(toolbar!.classList.contains('dsk-wysiwyg-toolbar--detached')).toBe(true)
    // Its buttons act on this editor: the full-screen one switches it.
    ;(toolbar!.querySelector('button[aria-pressed]') as HTMLButtonElement).click()
    await nextTick()
    expect(w.classes()).toContain('dsk-wysiwyg--fullscreen')
    expect(w.emitted('fullscreen-change')).toEqual([[true]])
    w.unmount()
    // Gone with the editor.
    expect(bar.querySelector('.dsk-wysiwyg-toolbar')).toBeNull()
  })

  it('stays above the content when the target is not in the document', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '<p>Hi</p>', toolbarTarget: '#nowhere' }, attachTo: document.body })
    await flushPromises()
    expect(w.find('.dsk-wysiwyg-toolbar').exists()).toBe(true)
    expect(w.find('.dsk-wysiwyg-toolbar--detached').exists()).toBe(false)
    w.unmount()
  })
})
