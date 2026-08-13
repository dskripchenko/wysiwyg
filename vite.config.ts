import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      tsconfigPath: resolve(__dirname, 'tsconfig.json'),
      include: ['src/**/*.ts', 'src/**/*.vue'],
      copyDtsFiles: false,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DskripchenkoWysiwyg',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
      cssFileName: 'style',
    },
    rollupOptions: {
      external: [
        'vue',
        // UidIcon from @dskripchenko/ui is the host's peer dependency and is
        // not bundled. When a host does not use the ui kit the import stays at
        // run time and the component degrades gracefully (see the fallback in
        // DskWysiwygToolbar).
        /^@dskripchenko\/ui($|\/)/,
        // The Lucide icons are used through the ui kit; in case of a direct
        // import we mark them external as well.
        'lucide-vue-next',
      ],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
