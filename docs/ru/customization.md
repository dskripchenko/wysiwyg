# Кастомизация

## Темы

Редактор понимает распространённые признаки тёмной темы через CSS:

- `data-theme="dark"` на `:root` или любом предке (например, его
  выставляет переключатель темы вашего приложения)
- `:root.dark` (в стиле Tailwind)
- предок с `[data-theme='dark']` (большинство переключателей уровня приложения)
- `@media (prefers-color-scheme: dark)` (системная настройка)
- `[data-theme='light']` принудительно включает светлую тему даже при тёмной системной

Или задайте тему напрямую:

```vue
<DskWysiwyg v-model="html" class="dsk-wysiwyg--dark-theme" />
```

## Токены

Все цвета — CSS custom properties, переопределяйте где угодно:

```css
.dsk-wysiwyg {
  --dsk-wysiwyg-bg: #fff;
  --dsk-wysiwyg-fg: #111;
  --dsk-wysiwyg-border: #e5e7eb;
  --dsk-wysiwyg-accent: #14b8a6;
  --dsk-wysiwyg-muted: #6b7280;

  /* цвета токенов подсветки синтаксиса */
  --dsk-wysiwyg-tok-keyword: #2563eb;
  --dsk-wysiwyg-tok-string: #16a34a;
  --dsk-wysiwyg-tok-comment: #9ca3af;
  --dsk-wysiwyg-tok-number: #b45309;
  --dsk-wysiwyg-tok-tag: #2563eb;
  --dsk-wysiwyg-tok-attr: #b45309;
  --dsk-wysiwyg-tok-function: #7c3aed;
  --dsk-wysiwyg-tok-punct: #4b5563;
}
```

## Размеры и изменение высоты

```vue
<DskWysiwyg
  v-model="html"
  min-height="150px"
  max-height="600px"
  :resizable="true"
/>
```

Пользователь может тянуть уголок в правом нижнем углу по вертикали. Чтобы
отключить:

```vue
<DskWysiwyg :resizable="false" />
```

## Свои кнопки тулбара

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', '|', 'h2', 'h3', '|', 'link', 'image', 'source']"
/>
```

`|` — разделитель. Кнопки: `bold`, `italic`, `underline`, `strike`,
`code`, `h1`-`h3`, `ul`, `ol`, `quote`, `link`, `image`, `hr`,
`codeblock`, `table`, `undo`, `redo`, `source`, `fullscreen`.

## Свои команды

Вызывайте контроллер из кнопки хоста:

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'

const editorRef = ref(null)
const html = ref('')

function insertSignature() {
  editorRef.value.controller.chain()
    .focus()
    .paragraph()
    .insertText('— Sent from MyApp')
    .run()
}
</script>

<template>
  <DskWysiwyg ref="editorRef" v-model="html" />
  <button @click="insertSignature">Insert signature</button>
</template>
```

## Санитизация

`getHTML()` пропускает результат через whitelist на основе DOMParser:

- Разрешённые теги: `p`, `br`, `strong`, `em`, `u`, `s`, `code`, `pre`,
  `h1`-`h6`, `ul`, `ol`, `li`, `blockquote`, `a` (`href`, `target`,
  `rel`), `img` (`src`, `alt`, `width`, `height`), `hr`, `table`,
  `thead`, `tbody`, `tr`, `th`, `td`, `class` на `span`/`code` с
  префиксом `language-`/`dsk-tok-`.
- Всё остальное отбрасывается.

Чтобы расширить: сделайте форк или перед сохранением прогоняйте HTML
через свою обёртку над `sanitizeHtml`.

## События и жизненный цикл

- `@update:modelValue` — после каждой зафиксированной правки (с debounce).
- `controller.on('blur', fn)` — доступен хосту для сохранения по blur.

## См. также

- [Controller API](controller-api.md)
- [Расширения](extensions.md)

## Полноэкранный режим

Кнопка `fullscreen` (в наборе по умолчанию, после `source`) разворачивает
редактор на всё окно — для длинных текстов и широких блоков вроде диаграмм и
API-виджетов. Выход — Escape или та же кнопка; страница под редактором в это
время не прокручивается, а на широком экране текст остаётся читаемой колонкой.

```ts
const editor = ref()
editor.value.toggleFullscreen()      // или setFullscreen(true)
editor.value.fullscreen              // текущее состояние
```

```vue
<DskWysiwyg ref="editor" v-model="html" @fullscreen-change="(on) => …" />
```

Если у хоста свои фиксированные слои поверх страницы, поднимите
`--dsk-wysiwyg-fullscreen-z` (по умолчанию 1000).

## Язык интерфейса

Подсказки тулбара, slash-меню и плейсхолдер есть на английском и русском.
Откуда берётся язык — побеждает первое совпадение:

1. `labels` — отдельные строки поверх языка;
2. `locale` — `'en'` или `'ru'`;
3. локаль UI-кита @dskripchenko/ui, если кит установлен и над редактором есть
   `UidLocaleProvider` (или `provideLocale()`): `code`, начинающийся с `ru`, —
   русский, любой другой — английский;
4. английский.

```vue
<DskWysiwyg v-model="html" locale="ru" />

<DskWysiwyg
  v-model="html"
  :labels="{ placeholder: 'Пишите…', toolbar: { bold: 'Полужирный (⌘B)' }, slash: { h1: 'Крупный заголовок' } }"
/>
```

Проп `placeholder` по-прежнему главнее плейсхолдера языка. Группы — `toolbar`
(подсказки кнопок, `label` для aria-label тулбара, `sourceBack`,
`fullscreenExit`, `linkPrompt` для запасного prompt) и `slash` (встроенные
пункты и их подсказки); полные наборы экспортируются как `wysiwygEn` и
`wysiwygRu`, типы — `WysiwygLabels` и `WysiwygPartialLabels`.
`DskWysiwygToolbar` и `DskWysiwygSlashMenu` принимают те же `locale` и
`labels`, если используются отдельно.

Кит — необязательный peer: без него редактор английский, если не сказано иное.
