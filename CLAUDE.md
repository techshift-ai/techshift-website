# Techshift AI Consulting — Website

Marketing site for Techshift AI Consulting, deployed to [techshift-website.pages.dev](https://techshift-website.pages.dev/).

## Stack

- **Astro 6** — content-first, ships HTML by default, hydrates only interactive islands
- **Tailwind CSS 4** — CSS-first config via `@theme` in `src/styles/global.css`
- **React + Framer Motion** — interactive components and scroll/entrance animations
- **Cloudflare Pages** — auto-deploys on merge to `main` via GitHub Actions
- **TypeScript strict** — non-negotiable

## Run locally

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # production build to ./dist/
npm run preview    # preview production build locally
```

## File structure

```
src/
  pages/
    index.astro           ← the landing page (all sections in one file)
    llms.txt.ts           ← AEO: markdown index for AI crawlers
    llms-full.txt.ts      ← AEO: full plaintext content for AI crawlers
  layouts/
    BaseLayout.astro      ← root layout (head, header, footer wrapper)
  components/
    BaseHead.astro        ← meta tags, OG, structured data slot, fonts
    sections/
      Header.astro        ← sticky nav with desktop + mobile variants
      MobileMenu.tsx      ← full-screen mobile nav (React island)
      Footer.astro        ← dark footer with nav, contact, copyright
    ui/
      Button.astro        ← variant/size button primitive
      FAQAccordion.tsx     ← animated accordion (React island)
      HeroAnimated.tsx     ← hero entrance sequence components
      AnimatedSection.tsx  ← scroll-triggered fade/stagger wrapper
  lib/
    motion.ts             ← Framer Motion variants and duration/easing constants
  styles/
    global.css            ← Tailwind @theme with all design tokens
public/
  assets/                 ← logo variants (synced from design system)
  robots.txt
  favicon.svg, favicon.ico
```

## Design tokens — the hard rule

Every color, font size, spacing value, radius, shadow, and motion duration in this repo comes from design tokens defined in `src/styles/global.css` under `@theme`. The source of truth is the design system at `techshift-ai-workforce/clients/techshift/design-system/tokens.json`.

**Never hardcode:**
- Hex colors — use `text-primary-600`, `bg-surface-brand`, etc.
- Pixel values for spacing — use `p-4`, `mt-12`, `gap-8`, etc.
- Font sizes — use `text-display-lg`, `text-body-md`, etc.
- Durations/easings — use the motion.ts exports or CSS custom properties

If you need a value that doesn't exist in the token set, add it to `global.css` under `@theme` first, then use the Tailwind utility. Raw values in component code are a bug.

## Tailwind 4 specifics

Tailwind 4 uses CSS-first config. There is no `tailwind.config.js`. All customization happens via `@theme` in `global.css`. The `@tailwindcss/vite` plugin handles the build.

Custom token classes follow these patterns:
- Colors: `text-primary-600`, `bg-surface-inverse`, `border-border-default`
- Type: `text-display-2xl`, `text-body-md`, `text-heading-sm`
- Font: `font-display`, `font-body`, `font-mono`
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`

## Component conventions

### Astro vs React

- **Astro components** (`.astro`) for static content — sections, layout, buttons, footer, header
- **React components** (`.tsx`) only when client-side interactivity is required — animations, accordion state, mobile menu toggle
- React components use `client:visible` or `client:load` directives for island hydration. Prefer `client:visible` (lazy) unless the component must be interactive immediately on page load.

### Animation pattern

All animations use the shared motion library at `src/lib/motion.ts`:
- Wrap sections in `<AnimatedSection>` for scroll-triggered reveals
- Use `variant="stagger"` + `<AnimatedItem>` for staggered children
- Hero uses dedicated `HeroContainer`, `HeroOverline`, `HeroHeadline`, `HeroSubhead`, `HeroCta` components
- Every animated component checks `useReducedMotion()` and falls back to instant render

### Section structure

Each section in `index.astro` follows this pattern:
```html
<section id="section-id" class="bg-surface-{variant} py-16 sm:py-20 lg:py-24" aria-labelledby="section-heading">
  <div class="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-12">
    <!-- content -->
  </div>
</section>
```

Container is always `max-w-[1280px]` with responsive horizontal padding.

## Copy rules

All site copy is written from the copy brief at `techshift-ai-workforce/clients/techshift/copy-brief.md`. If you need to change copy, check the brief first for the intended reader feeling and section direction.

Do not use internal firm language on the site:
- No "solve / save / grow", "outcomes over hours", "client zero", "build once deploy many"
- No "solutions" as a generic noun — name the thing (agent, system, automation, website)
- No AI hype words: "revolutionary", "cutting-edge", "next-gen", "transformative"
- No jargon: "leverage", "synergy", "unlock", "harness", "empower"

## SEO and AEO

### Structured data
JSON-LD schemas are defined in `index.astro` frontmatter and injected via the BaseHead `<slot>`:
- `Organization` — business name, address (Barrie, ON), contact, logo
- `FAQPage` — all 6 FAQ items with questions and answers

### AEO files
- `/llms.txt` — markdown index of pages and services for AI crawlers
- `/llms-full.txt` — full plaintext content (~5.6KB)

When adding content, update both endpoints in `src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts`.

### Meta tags
BaseHead handles title, description, canonical, OG, and Twitter Card tags. Pass via BaseLayout props:
```astro
<BaseLayout
  title="Page Title | Techshift AI Consulting"
  description="150-160 char description"
>
```

## Deploy

**Auto-deploy:** merging to `main` triggers a GitHub Actions workflow that builds and deploys to Cloudflare Pages. Preview deploys happen on PRs.

**Manual deploy** (if needed):
```bash
npm run build
npx wrangler pages deploy dist --project-name=techshift-website
```

**Branch protection:** after first production deploy, all changes go through PRs. No direct pushes to `main`.

## Quality bar

Every change should maintain all five:
1. **Aesthetic** — editorial layouts, generous whitespace, intentional type, purposeful motion. Not a template.
2. **SEO** — proper heading hierarchy (single h1), structured data, meta tags, alt text, sitemap
3. **AEO** — direct answers first in each section, named entities, FAQ schema, llms.txt updated
4. **Performance** — minimal client JS, images optimized, fonts preconnected, LCP < 2.5s
5. **Accessibility** — keyboard nav, 4.5:1 contrast, 44px touch targets, focus rings, `prefers-reduced-motion` respected

## Common tasks

### Add a new section to the homepage
1. Add the section HTML in `src/pages/index.astro` at the appropriate position
2. Wrap in `<AnimatedSection client:visible>` for scroll reveal
3. Follow the section structure pattern (see above)
4. Update `llms.txt.ts` and `llms-full.txt.ts` with the new content
5. If the section has Q&A content, add to the `faqItems` array for FAQPage schema

### Change the navigation
Edit `src/components/sections/Header.astro` — the `navItems` array at the top. MobileMenu receives the same array as a prop.

### Update design tokens
1. Update the token value in `src/styles/global.css` under `@theme`
2. If it's a motion value, also update `src/lib/motion.ts`
3. The source of truth is `tokens.json` in the design system repo — keep them in sync

### Add a new page
1. Create `src/pages/page-name.astro`
2. Use `<BaseLayout title="..." description="...">` as the wrapper
3. Add to the sitemap (automatic via `@astrojs/sitemap`)
4. Add to `llms.txt.ts` index
5. Add JSON-LD structured data appropriate to the page type
6. Link from an existing page (no orphans)

### Replace the booking CTA
The mailto fallback is at two locations in `index.astro` (hero and final CTA sections). Search for `mailto:hello@techshift.ai` and replace with a Calendly embed URL or booking widget when ready.
