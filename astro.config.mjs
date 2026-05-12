// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://techshift.ai',
  // Listen on LAN so phones/tablets on the same Wi‑Fi can open http://<your-ip>:4321
  server: {
    host: true,
  },
  prefetch: {
    prefetchAll: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react(), sitemap()],
});
