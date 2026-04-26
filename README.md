# Techshift AI Consulting — Website

Marketing site for [Techshift AI Consulting](https://techshift-website.pages.dev/). Built with Astro, Tailwind CSS 4, React, and Framer Motion. Deployed to Cloudflare Pages.

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321
```

## Build and preview

```bash
npm run build    # production build to ./dist/
npm run preview  # preview the build locally
```

## Deploy

Merging to `main` auto-deploys to [techshift-website.pages.dev](https://techshift-website.pages.dev/) via GitHub Actions.

Pull requests get preview deploys at `<branch>.techshift-website.pages.dev`.

Manual deploy (if needed):
```bash
npm run build
npx wrangler pages deploy dist --project-name=techshift-website
```

## Making content changes

Most content lives in `src/pages/index.astro`. Common edits:

- **Section copy** — edit directly in `index.astro` within the relevant `<section>` block
- **FAQ items** — update the `faqItems` array in `index.astro` frontmatter
- **Navigation** — edit `navItems` in `src/components/sections/Header.astro`
- **Footer** — edit `src/components/sections/Footer.astro`
- **Meta tags** — update `title` and `description` props on the `<BaseLayout>` in `index.astro`

After changing content, also update `src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts` to keep the AI-crawler endpoints in sync.

## Design system

Visual tokens (colors, typography, spacing, motion) are defined in `src/styles/global.css` under `@theme`. Source of truth is the design system in the `techshift-ai-workforce` repo at `clients/techshift/design-system/tokens.json`.

## Project structure

```
src/
  pages/index.astro         ← landing page (all sections)
  pages/llms.txt.ts         ← AI crawler index
  pages/llms-full.txt.ts    ← AI crawler full content
  layouts/BaseLayout.astro  ← root layout
  components/               ← UI primitives and page sections
  lib/motion.ts             ← animation constants
  styles/global.css         ← Tailwind theme + design tokens
public/assets/              ← logos, favicon
```

See `CLAUDE.md` for full development conventions and guidelines.
