import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://FrankBetances.github.io',
  base: '/proyectos',
  build: {
    format: 'file'
  }
});
