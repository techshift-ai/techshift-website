// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Techshift standard website config. Static output, zero client JS by default.
export default defineConfig({
  site: 'https://techshift.ai',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    // Inline all CSS: removes the render-blocking request on first load (mobile LCP).
    // Revisit if page CSS grows past roughly 50 KB.
    inlineStylesheets: 'always',
  },
  markdown: {
    // No code blocks on marketing sites; Shiki's inline styles conflict with CSP.
    syntaxHighlight: false,
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  security: {
    // Hashes every Astro-processed script and style into a CSP meta tag.
    csp: true,
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Poppins',
      cssVariable: '--font-poppins',
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Arial', 'sans-serif'],
    },
  ],
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/review'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
