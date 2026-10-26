/**
 * The editor's UI strings: the toolbar's titles, the slash menu, the
 * placeholder.
 *
 * Where the language comes from, first match wins:
 *   1. the `labels` prop — a partial override of single strings;
 *   2. the `locale` prop — 'en' | 'ru';
 *   3. the @dskripchenko/ui kit's locale, when the kit is installed and a
 *      provider (UidLocaleProvider / provideLocale) is above the editor —
 *      a `code` starting with `ru` gives Russian, anything else English;
 *   4. English.
 *
 * The kit is an optional peer: it is imported lazily and its absence is not
 * an error.
 */
import {
  computed,
  defineAsyncComponent,
  shallowRef,
  type Component,
  type ComputedRef,
  type Ref,
} from 'vue'

export type WysiwygLocale = 'en' | 'ru'

export interface WysiwygToolbarLabels {
  /** The toolbar's aria-label. */
  label: string
  bold: string
  italic: string
  underline: string
  strike: string
  code: string
  h1: string
  h2: string
  h3: string
  paragraph: string
  bulletList: string
  orderedList: string
  blockquote: string
  codeBlock: string
  link: string
  image: string
  horizontalRule: string
  table: string
  undo: string
  redo: string
  /** The source button while the editor shows the formatted text. */
  source: string
  /** The source button while the editor shows the HTML. */
  sourceBack: string
  fullscreen: string
  fullscreenExit: string
  /** The text of the fallback `window.prompt` asking for a link's URL. */
  linkPrompt: string
}

export interface WysiwygSlashLabels {
  h1: string
  h1Hint: string
  h2: string
  h2Hint: string
  h3: string
  h3Hint: string
  paragraph: string
  paragraphHint: string
  bulletList: string
  orderedList: string
  blockquote: string
  codeBlock: string
  horizontalRule: string
  table: string
}

export interface WysiwygLabels {
  /** The empty editor's placeholder (the `placeholder` prop wins over it). */
  placeholder: string
  toolbar: WysiwygToolbarLabels
  slash: WysiwygSlashLabels
}

/** A partial override: any single string of any group. */
export interface WysiwygPartialLabels {
  placeholder?: string
  toolbar?: Partial<WysiwygToolbarLabels>
  slash?: Partial<WysiwygSlashLabels>
}

export const en: WysiwygLabels = {
  placeholder: 'Start typing…',
  toolbar: {
    label: 'Editor',
    bold: 'Bold (⌘B)',
    italic: 'Italic (⌘I)',
    underline: 'Underline (⌘U)',
    strike: 'Strikethrough',
    code: 'Inline code',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    paragraph: 'Paragraph',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    blockquote: 'Quote',
    codeBlock: 'Code block',
    link: 'Link',
    image: 'Image',
    horizontalRule: 'Horizontal rule',
    table: 'Insert a 3×3 table',
    undo: 'Undo (⌘Z)',
    redo: 'Redo (⌘⇧Z)',
    source: 'Source code (HTML)',
    sourceBack: 'Back to the editor',
    fullscreen: 'Fullscreen',
    fullscreenExit: 'Exit fullscreen (Esc)',
    linkPrompt: 'Link URL',
  },
  slash: {
    h1: 'Heading 1',
    h1Hint: 'Large heading',
    h2: 'Heading 2',
    h2Hint: 'Medium heading',
    h3: 'Heading 3',
    h3Hint: 'Small heading',
    paragraph: 'Paragraph',
    paragraphHint: 'Plain text',
    bulletList: 'Bulleted list',
    orderedList: 'Numbered list',
    blockquote: 'Quote',
    codeBlock: 'Code block',
    horizontalRule: 'Horizontal rule',
    table: 'Table 3×3',
  },
}

export const ru: WysiwygLabels = {
  placeholder: 'Введите текст…',
  toolbar: {
    label: 'Редактор',
    bold: 'Жирный (⌘B)',
    italic: 'Курсив (⌘I)',
    underline: 'Подчёркнутый (⌘U)',
    strike: 'Зачёркнутый',
    code: 'Код в строке',
    h1: 'Заголовок 1',
    h2: 'Заголовок 2',
    h3: 'Заголовок 3',
    paragraph: 'Параграф',
    bulletList: 'Маркированный список',
    orderedList: 'Нумерованный список',
    blockquote: 'Цитата',
    codeBlock: 'Блок кода',
    link: 'Ссылка',
    image: 'Изображение',
    horizontalRule: 'Горизонтальная линия',
    table: 'Вставить таблицу 3×3',
    undo: 'Отменить (⌘Z)',
    redo: 'Повторить (⌘⇧Z)',
    source: 'Исходный код (HTML)',
    sourceBack: 'Назад в редактор',
    fullscreen: 'Во весь экран',
    fullscreenExit: 'Выйти из полноэкранного режима (Esc)',
    linkPrompt: 'URL ссылки',
  },
  slash: {
    h1: 'Заголовок 1',
    h1Hint: 'Большой заголовок',
    h2: 'Заголовок 2',
    h2Hint: 'Средний заголовок',
    h3: 'Заголовок 3',
    h3Hint: 'Малый заголовок',
    paragraph: 'Параграф',
    paragraphHint: 'Обычный текст',
    bulletList: 'Маркированный список',
    orderedList: 'Нумерованный список',
    blockquote: 'Цитата',
    codeBlock: 'Блок кода',
    horizontalRule: 'Горизонтальная линия',
    table: 'Таблица 3×3',
  },
}

export const wysiwygLocales: Record<WysiwygLocale, WysiwygLabels> = { en, ru }

/** The kit's locale `code` → the editor's language: `ru*` is Russian, the rest English. */
export function localeFromCode(code: string | null | undefined): WysiwygLocale {
  return typeof code === 'string' && /^ru(?:$|[-_])/i.test(code) ? 'ru' : 'en'
}

/** The labels of a language with a partial override on top. */
export function resolveLabels(locale: WysiwygLocale, override?: WysiwygPartialLabels | null): WysiwygLabels {
  const base = wysiwygLocales[locale] ?? en
  if (!override) return base
  return {
    placeholder: override.placeholder ?? base.placeholder,
    toolbar: { ...base.toolbar, ...stripUndefined(override.toolbar) },
    slash: { ...base.slash, ...stripUndefined(override.slash) },
  }
}

function stripUndefined<T extends object>(o: T | undefined): Partial<T> {
  if (!o) return {}
  const out: Partial<T> = {}
  for (const k of Object.keys(o) as (keyof T)[]) {
    if (o[k] !== undefined) out[k] = o[k]
  }
  return out
}

interface KitLocaleRef { readonly value: { code?: string } | undefined }

/**
 * An invisible component that reads the kit's locale. The kit's useLocale()
 * injects, so it has to run in a setup — and the kit arrives asynchronously;
 * an async component gives the call a setup under the editor, where the
 * kit's provider above is in reach.
 */
function makeKitLocaleProbe(target: Ref<KitLocaleRef | null>): Component {
  const empty = { name: 'DskWysiwygKitLocaleProbe', render: () => null }
  return defineAsyncComponent({
    loader: async () => {
      try {
        const mod = (await import('@dskripchenko/ui')) as unknown as { useLocale?: () => KitLocaleRef }
        if (typeof mod.useLocale !== 'function') return empty as never
        const useLocale = mod.useLocale
        return {
          name: 'DskWysiwygKitLocaleProbe',
          setup() {
            target.value = useLocale()
            return () => null
          },
        } as never
      } catch {
        return empty as never
      }
    },
    errorComponent: empty as never,
  })
}

export interface UseWysiwygLabels {
  /** The language in effect. */
  locale: ComputedRef<WysiwygLocale>
  labels: ComputedRef<WysiwygLabels>
  /** Rendered in the component's template while the kit's locale is wanted (`v-if="probeKit"`). */
  KitLocaleProbe: Component
  probeKit: ComputedRef<boolean>
}

export function useWysiwygLabels(props: { locale?: WysiwygLocale; labels?: WysiwygPartialLabels }): UseWysiwygLabels {
  const kit = shallowRef<KitLocaleRef | null>(null)
  const KitLocaleProbe = makeKitLocaleProbe(kit)
  const probeKit = computed<boolean>(() => !props.locale)
  const locale = computed<WysiwygLocale>(() => {
    if (props.locale === 'en' || props.locale === 'ru') return props.locale
    return localeFromCode(kit.value?.value?.code)
  })
  const labels = computed<WysiwygLabels>(() => resolveLabels(locale.value, props.labels))
  return { locale, labels, KitLocaleProbe, probeKit }
}
