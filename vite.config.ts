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
        // UidIcon из @dskripchenko/ui — peer-dep host'а, не bundle'им.
        // Если host не использует ui-kit, импорт остаётся в run-time
        // и компонент падает gracefully (см. fallback в DskWysiwygToolbar).
        /^@dskripchenko\/ui($|\/)/,
        // Lucide иконки используются через ui-kit; на случай direct-import
        // тоже пометим external.
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
