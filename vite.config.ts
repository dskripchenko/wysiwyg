import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

// The toolbar icons are bundled (no `lucide-vue-next` in a CDN import map); their license goes with them.
const lucideLicense = readFileSync(resolve(__dirname, 'node_modules/lucide-vue-next/LICENSE'), 'utf8').trim()
const lucideBanner = `/*! Includes icons from lucide-vue-next (https://lucide.dev)\n${lucideLicense.replace(/\*\//g, '* /')}\n*/`

export default defineConfig({
  // Keep the /*! license banner through minification.
  esbuild: { legalComments: 'inline' },
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
      ],
      output: {
        banner: lucideBanner,
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
