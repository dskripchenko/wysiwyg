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

## Правка на месте: плавающий тулбар и frameless

Чтобы править страницу там, где она стоит, уберите рамку, а форматирование
отдайте небольшой тёмной панели над выделением:

```vue
<DskWysiwyg v-model="html" frameless bubble :toolbar="false" :resizable="false" />
```

`bubble` показывает панель, пока выделение в содержимом не схлопнуто (не в
режиме исходника и не в readonly); она прячется, когда выделение схлопнуто,
ушло из редактора, или по Escape. Нажатие на её кнопки не сбрасывает
выделение. Панель стоит по центру над выделением, под ним — если сверху нет
места, и не выходит за редактор. `true` — жирный, курсив, подчёркнутый,
зачёркнутый, код, ссылка, заголовок 2 и маркированный список; массив задаёт
свои кнопки (`:bubble="['bold', 'italic', 'link']"`).

`frameless` убирает рамку, скругление, фон и отступы вокруг содержимого и фон
тулбара, а цвет и размер текста берёт со страницы.
`--dsk-wysiwyg-frameless-padding` (по умолчанию 0) возвращает отступы.

Токены панели (в тёмной теме — на тон светлее и с краем):

```css
.dsk-wysiwyg {
  --dsk-wysiwyg-bubble-bg: #18181b;
  --dsk-wysiwyg-bubble-fg: #f4f4f5;
  --dsk-wysiwyg-bubble-border: transparent;
  --dsk-wysiwyg-bubble-radius: 8px;
  --dsk-wysiwyg-bubble-shadow: 0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.16);
  --dsk-wysiwyg-bubble-hover-bg: rgba(255, 255, 255, 0.1);
  --dsk-wysiwyg-bubble-active-bg: rgba(255, 255, 255, 0.16);
  --dsk-wysiwyg-bubble-active-fg: #5eead4;
  --dsk-wysiwyg-bubble-divider: rgba(255, 255, 255, 0.16);
  --dsk-wysiwyg-bubble-z: 20;
}
```

### Свои действия в плавающем тулбаре

`bubbleActions` добавляет свои кнопки в конец плавающего тулбара, после
разделителя, — например, кнопку «Комментировать»:

```vue
<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next'
import type { BubbleAction } from '@dskripchenko/wysiwyg'

const actions: BubbleAction[] = [
  { key: 'comment', label: 'Комментировать', icon: MessageSquare, run: ({ text, block }) => openComment(text, block) },
]
</script>

<template>
  <DskWysiwyg v-model="html" bubble :bubble-actions="actions" />
</template>
```

Кнопка показывает `icon` (любой компонент с пропом `size`) и `label`.
Нажатие сохраняет выделение, как и на остальных кнопках; `run` получает
выделенный текст и `block` — номер блока верхнего уровня (прямого потомка
содержимого), в котором начинается выделение. При выключенном `bubble`
плавающий тулбар показывает только действия.

## Ручки блоков

`blockHandles` ставит «+» и ручку «⋮⋮» на поле слева от блока под
указателем (а если указатель в другом месте — от блока с курсором):

- «+» добавляет пустой абзац ниже и открывает в нём slash-меню: абзац
  начинается с `/`, как будто его набрали, поэтому ввод фильтрует меню, а
  Escape оставляет `/` текстом.
- Перетаскивание ручки (мышью, пером или пальцем) переносит блок; линия
  показывает, куда он встанет. Диаграмма переезжает вместе со своим кодом.
- Нажатие на ручку (или Enter / пробел на ней) открывает меню: «Переместить
  выше», «Переместить ниже», «Дублировать», «Удалить». По нему ходят
  стрелками, Home и End; Escape закрывает.

Каждое изменение — один шаг отмены и `update:modelValue`. Копия блока не
получает его id (`^id`): id уникальны. Ручки не показываются в режиме
только для чтения и в режиме исходника, а также на экранах уже 600px.
Редактор с рамкой освобождает для них место в своём отступе; `frameless`
ставит их на поля страницы, за пределами своей коробки, — оставьте слева
около `--dsk-wysiwyg-handles-gutter` (52px). Линия вставки берёт цвет
`--dsk-wysiwyg-drop-color`; строки — в группе `blocks` (см.
[Язык интерфейса](#язык-интерфейса)).

Те же операции есть у контроллера: `moveBlock(from, to)`,
`duplicateBlock(index)`, `removeBlock(index)`.

## Совместная правка: чужие курсоры и изменения извне

Для совместной правки в реальном времени редактор сообщает, где его курсор,
принимает новое значение извне, не теряя курсора, и рисует чужие курсоры.

- Новый `modelValue` извне (правка другого человека) не подменяет
  содержимое целиком: общие в начале и в конце блоки верхнего уровня
  остаются теми же DOM-узлами, заменяется только различающаяся середина.
  Курсор в нетронутом блоке остаётся ровно там, где был; курсор в
  заменённом блоке возвращается по номеру блока и смещению в его тексте.
  `controller.patchContent(html)` делает то же из кода.
- `@caret` сообщает `{ block, offset }` — номер блока верхнего уровня и
  смещение в символах в его тексте — не чаще раза в 100 мс, и `null`, когда
  редактор теряет фокус. Отправляйте его остальным.
- `remoteCarets` рисует их курсоры: тонкая линия цвета человека и имя на
  маленьком флажке над ней.

```vue
<DskWysiwyg
  v-model="html"
  :remote-carets="[{ id: 'u2', name: 'Анна', color: '#e11d48', block: 3, offset: 12 }]"
  @caret="(pos) => channel.send({ caret: pos })"
/>
```

Курсор без `color` получает цвет из небольшой палитры по `id`; без
`offset` или за концом текста блока он стоит в конце блока; если блока нет,
курсор не рисуется. Курсоры — слой поверх содержимого: не перехватывают
указатель, не трогают содержимое и значение, следуют за вводом, изменением
размера и прокруткой, одинаково в светлой и тёмной теме.

**История после изменения извне.** Локальная отмена не должна откатывать
чужую правку как свою, поэтому патч перестраивает историю: стеки отмены и
повтора очищаются и начинаются заново с обновлённого содержимого. Шаги,
сделанные до изменения извне, отменить уже нельзя.

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

Строки ручек блоков — в группе `blocks` (`add`, `grip`, `menu`, `moveUp`,
`moveDown`, `duplicate`, `remove`), переключатель открытого блока с превью —
в `preview` (`split`, `preview`).
