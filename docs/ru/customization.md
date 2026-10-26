---
title: Кастомизация
locale: ru
status: stub
translated_from: ../en/customization.md
---

# Кастомизация

> ⚠️ **Эта страница ещё не полностью переведена.** Пока используйте [английскую версию](../en/customization.md).

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
