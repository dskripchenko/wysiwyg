/**
 * @dskripchenko/wysiwyg — public API.
 *
 * Минимальный пример:
 *
 *   <script setup>
 *   import { ref } from 'vue'
 *   import { DskWysiwyg } from '@dskripchenko/wysiwyg'
 *   import '@dskripchenko/wysiwyg/style.css'
 *
 *   const html = ref('<p>Hello</p>')
 *   </script>
 *   <template>
 *     <DskWysiwyg v-model="html" />
 *   </template>
 *
 * Programmatic-команды через ref на компонент → controller:
 *
 *   const wysiwyg = ref(null)
 *   wysiwyg.value?.controller?.chain().focus().bold().run()
 *
 * Image-upload:
 *
 *   <DskWysiwyg @image-request="onUpload" ref="ref" />
 *
 *   async function onUpload() {
 *     const url = await uploadFile(...)
 *     ref.value?.controller?.chain().focus().setImage(url).run()
 *   }
 */
export { default as DskWysiwyg } from './DskWysiwyg.vue'
export { default as DskWysiwygToolbar } from './DskWysiwygToolbar.vue'
export type { ToolbarItem } from './DskWysiwygToolbar.vue'
export { default as DskWysiwygSlashMenu } from './DskWysiwygSlashMenu.vue'
export type { SlashCommand } from './DskWysiwygSlashMenu.vue'
export { EditorController, sanitizeHtml } from './engine'
export { htmlToMarkdown } from './engine/htmlToMarkdown'
export { highlight } from './engine/highlight'
export { beautifyHtml, minifyHtml } from './engine/format'
export type { ChainAPI } from './engine'
