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
    // Turnstile is loaded only after the booking modal opens.
    // Cloudflare Web Analytics injects its beacon at the edge, so that host is
    // allowed here. Astro never sees the tag and cannot hash it.
    csp: {
      scriptDirective: {
        resources: [
          "'self'",
          'https://challenges.cloudflare.com',
          'https://static.cloudflareinsights.com',
        ],
      },
      directives: [
        'frame-src https://challenges.cloudflare.com',
        "connect-src 'self' https://cloudflareinsights.com",
      ],
    },
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
    server: {
      // Dev only. astro preview and pages.dev have no proxy, so a missing /api uses the fallback link.
      proxy: {
        '/api': 'http://localhost:8787',
      },
    },
  },
});
