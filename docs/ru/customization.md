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
