// EXPLAIN: build settings. The page lives at aswinguruswamy.github.io/aswin-guruswamy-portfolio (GitHub Pages, D1).
import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://aswinguruswamy.github.io',
  base: '/aswin-guruswamy-portfolio/',
  build: { inlineStylesheets: 'never' },
  devToolbar: { enabled: false },
});
