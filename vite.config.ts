import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), dts()],
  build: {
    lib: {
      entry: "src/index.ts",
      name: 'keystone6-document-renderer-vue3',
      formats: [
        'es',
        'cjs',
        'umd'
      ]
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          'vue': 'Vue'
        }
      }
    },
  }
  
})
