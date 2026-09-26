import { resolve } from 'path';
import { defineConfig } from 'vite';

// Two story chapters = two pages.
// base './' = relative asset paths, so the same build works on localhost,
// GitHub Pages (https://<user>.github.io/<repo>/) or any other static host.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        chapter2: resolve(__dirname, 'chapter2.html'),
      },
    },
  },
});
