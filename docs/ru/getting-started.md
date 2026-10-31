# Начало работы

## Установка

```bash
npm i @dskripchenko/wysiwyg
```

Опционально, для более аккуратных иконок тулбара:

```bash
npm i @dskripchenko/ui lucide-vue-next
```

## Базовое использование

```vue
<script setup>
import { ref } from 'vue'
import { DskWysiwyg } from '@dskripchenko/wysiwyg'
import '@dskripchenko/wysiwyg/style.css'

const html = ref('<p>Hello <strong>world</strong>!</p>')
</script>

<template>
  <DskWysiwyg v-model="html" />
</template>
```

Внутри компонент **неконтролируемый** — источник истины `v-model`.
Перед эмитом HTML редактора проходит санитизацию через внутренний
whitelist на основе DOMParser.

## Props

| Prop | Type | Default | Описание |
|---|---|---|---|
| `modelValue` | `string` | `''` | HTML-строка. Санитизируется при эмите. |
| `placeholder` | `string` | из языка | Показывается, когда редактор пуст. |
| `locale` | `'en' \| 'ru'` | локаль кита, иначе `'en'` | Язык интерфейса, см. [Кастомизация](customization.md#язык-интерфейса). |
| `labels` | `WysiwygPartialLabels` | — | Отдельные строки интерфейса поверх языка. |
| `toolbar` | `boolean` | `true` | Показать тулбар. |
| `toolbarItems` | `ToolbarItem[]` | (набор по умолчанию) | Свой порядок кнопок тулбара. |
| `readonly` | `boolean` | `false` | |
| `minHeight` | `string` | `'200px'` | CSS-длина на корневом элементе. |
| `maxHeight` | `string` | `undefined` | CSS-длина на корневом элементе. |
| `resizable` | `boolean` | `true` | Пользователь может менять высоту. |
| `blockRenderers` | `BlockRenderers` | `{}` | Языки блоков кода, которые показываются отрисованными, например `{ mermaid }`. См. [Расширения](extensions.md#превью-блоков-диаграммы-графики). |
| `slashCommands` | `SlashCommand[]` | `[]` | Пункты, добавляемые в slash-меню после встроенных. |
| `allowedAttributes` | `Record<string, string[]>` | `{}` | Атрибуты, которые сохраняются для тега сверх встроенного whitelist, — ваши собственные маркеры, например `{ img: ['data-signature'] }`. Обработчики `on*` не сохраняются никогда. |

## События

`@update:modelValue` — то же, что `v-model`.

## Тулбар по умолчанию

Bold / Italic / Underline / Strike / Code · H1 H2 H3 · Bullet List /
Ordered List / Blockquote · Link / Image / HR · Code Block · Table ·
Undo / Redo · переключатель режима исходного кода.

## Настройка тулбара

```vue
<DskWysiwyg
  v-model="html"
  :toolbar-items="['bold', 'italic', 'h2', 'h3', '|', 'link', 'image', 'source']"
/>
```

`|` вставляет разделитель. Доступные кнопки: `bold`, `italic`, `underline`,
`strike`, `code`, `h1`-`h3`, `ul`, `ol`, `quote`, `link`, `image`,
`hr`, `codeblock`, `table`, `undo`, `redo`, `source`, `fullscreen`.

## Что дальше

- [Controller API](controller-api.md) — программное редактирование
- [Расширения](extensions.md) — markdown-шорткаты, slash-команды,
  таблицы, подсветка синтаксиса
- [Кастомизация](customization.md) — темы, размеры, свои команды
