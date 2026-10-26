import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { UidLocaleProvider, provideLocale, en as uidEn, ru as uidRu } from '@dskripchenko/ui'
import DskWysiwyg from '../DskWysiwyg.vue'
import DskWysiwygToolbar from '../DskWysiwygToolbar.vue'
import DskWysiwygSlashMenu from '../DskWysiwygSlashMenu.vue'
import { localeFromCode, resolveLabels, en, ru } from '../locale'

/** Lets the lazily imported kit arrive and the probe report back. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await flushPromises()
    await nextTick()
  }
}

function boldTitle(root: { find(sel: string): { attributes(name: string): string | undefined } }): string | undefined {
  return root.find('.dsk-wysiwyg-toolbar__btn').attributes('title')
}

function placeholderOf(w: ReturnType<typeof mount>): string | undefined {
  return w.find('.dsk-wysiwyg__content').attributes('data-placeholder')
}

describe('labels', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('maps a kit code to a language', () => {
    expect(localeFromCode('ru')).toBe('ru')
    expect(localeFromCode('ru-RU')).toBe('ru')
    expect(localeFromCode('RU_ru')).toBe('ru')
    expect(localeFromCode('en-US')).toBe('en')
    expect(localeFromCode('de')).toBe('en')
    expect(localeFromCode('rue')).toBe('en')
    expect(localeFromCode(undefined)).toBe('en')
  })

  it('merges a partial override over a language', () => {
    const l = resolveLabels('ru', { placeholder: 'Пишите', toolbar: { bold: 'Ж', italic: undefined } })
    expect(l.placeholder).toBe('Пишите')
    expect(l.toolbar.bold).toBe('Ж')
    expect(l.toolbar.italic).toBe(ru.toolbar.italic)
    expect(l.slash).toEqual(ru.slash)
  })

  it('both languages carry the same keys', () => {
    expect(Object.keys(ru.toolbar).sort()).toEqual(Object.keys(en.toolbar).sort())
    expect(Object.keys(ru.slash).sort()).toEqual(Object.keys(en.slash).sort())
  })

  it('defaults to English without a provider', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '' }, attachTo: document.body })
    await settle()
    expect(boldTitle(w)).toBe(en.toolbar.bold)
    expect(w.find('[role="toolbar"]').attributes('aria-label')).toBe(en.toolbar.label)
    expect(placeholderOf(w)).toBe(en.placeholder)
    expect(w.find('button[aria-pressed]').attributes('title')).toBe(en.toolbar.fullscreen)
    w.unmount()
  })

  it('follows the locale prop', async () => {
    const w = mount(DskWysiwyg, { props: { modelValue: '', locale: 'ru' }, attachTo: document.body })
    await settle()
    expect(boldTitle(w)).toBe(ru.toolbar.bold)
    expect(placeholderOf(w)).toBe(ru.placeholder)
    await w.setProps({ locale: 'en' })
    expect(boldTitle(w)).toBe(en.toolbar.bold)
    w.unmount()
  })

  it('takes single strings from the labels prop, and the placeholder prop over both', async () => {
    const w = mount(DskWysiwyg, {
      props: { modelValue: '', locale: 'ru', labels: { toolbar: { bold: 'Fett' }, placeholder: 'Schreiben' } },
      attachTo: document.body,
    })
    await settle()
    expect(boldTitle(w)).toBe('Fett')
    expect(w.findAll('.dsk-wysiwyg-toolbar__btn')[1].attributes('title')).toBe(ru.toolbar.italic)
    expect(placeholderOf(w)).toBe('Schreiben')
    await w.setProps({ placeholder: 'Own' })
    expect(placeholderOf(w)).toBe('Own')
    w.unmount()
  })

  it('follows the kit provider, and its changes', async () => {
    const code = ref<'ru' | 'en'>('ru')
    const Host = defineComponent({
      setup() {
        provideLocale(computed(() => (code.value === 'ru' ? { ...uidRu, code: 'ru-RU' } : uidEn)))
        return () => h(DskWysiwyg, { modelValue: '' })
      },
    })
    const w = mount(Host, { attachTo: document.body })
    await settle()
    expect(boldTitle(w)).toBe(ru.toolbar.bold)
    expect(w.find('.dsk-wysiwyg__content').attributes('data-placeholder')).toBe(ru.placeholder)

    code.value = 'en'
    await settle()
    expect(boldTitle(w)).toBe(en.toolbar.bold)
    w.unmount()
  })

  it('lets the locale prop win over the kit provider', async () => {
    const w = mount(UidLocaleProvider, {
      props: { locale: uidRu },
      slots: { default: () => h(DskWysiwyg, { modelValue: '', locale: 'en' }) },
      attachTo: document.body,
    })
    await settle()
    expect(boldTitle(w)).toBe(en.toolbar.bold)
    w.unmount()
  })

  it('the toolbar alone follows the kit provider', async () => {
    const w = mount(UidLocaleProvider, {
      props: { locale: { ...uidRu, code: 'ru' } },
      slots: { default: () => h(DskWysiwygToolbar, { controller: null, items: ['bold'] }) },
      attachTo: document.body,
    })
    await settle()
    expect(boldTitle(w)).toBe(ru.toolbar.bold)
    w.unmount()
  })

  it('the slash menu speaks the language, and filters by its labels', async () => {
    const w = mount(DskWysiwygSlashMenu, {
      props: { open: true, controller: null, query: '', top: 0, left: 0, locale: 'ru' },
      attachTo: document.body,
    })
    await settle()
    const labels = () => [...document.querySelectorAll('.dsk-wysiwyg-slash__label')].map((n) => n.textContent)
    expect(labels()[0]).toBe(ru.slash.h1)

    await w.setProps({ query: 'цитат' })
    expect(labels()).toEqual([ru.slash.blockquote])

    await w.setProps({ locale: 'en', query: 'quote' })
    expect(labels()).toEqual([en.slash.blockquote])
    w.unmount()
  })
})
