import { resolve } from 'path';
import { defineConfig } from 'vite';

// Two story chapters = two pages
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        chapter2: resolve(__dirname, 'chapter2.html'),
      },
    },
  },
});
