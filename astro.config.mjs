// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://nard.eamag.me';

// https://astro.build/config
export default defineConfig({
  site,
  vite: {
    build: {
      // Keep vendor prefixes like -webkit-backdrop-filter that Lightning CSS would strip.
      cssMinify: 'esbuild',
    },
  },
  integrations: [
    svelte(),
    sitemap({
      filter: (page) => new URL(page).pathname.replace(/\/$/, '') !== '/404',
      changefreq: 'monthly',
      priority: 1,
      namespaces: {
        news: false,
        video: false,
      },
    }),
  ],
});
