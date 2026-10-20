# techshift.ai website: agent instructions

Marketing site for Techshift, built on the Techshift standard website stack. Atlas governs the work:
`roles/website-developer.md` and `techshift-hq/engineering/web-development/` in techshift-ai/techshift-atlas.

## Stack

Astro 7 (static output, zero client JS by default), TypeScript strict, Tailwind CSS 4 (tokens in
`src/styles/global.css` under `@theme`), Astro Fonts API (self-hosted), `astro:assets` for images,
`@astrojs/sitemap`, typed JSON-LD via `schema-dts`. No UI framework. Node 24 LTS (see `.nvmrc`).

## Commands

| Command              | What it does                                                   |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | Dev server at http://localhost:4321                            |
| `npm run build`      | `astro check` then static build to `dist/`                     |
| `npm run preview`    | Serve `dist/` locally                                          |
| `npm run lint`       | ESLint plus the no em dash check                               |
| `npm run format`     | Prettier (Astro and Tailwind class sorting)                    |
| `npm run verify`     | Format check, lint, and build. Run before every commit.        |
| `npm run lighthouse` | Mobile Lighthouse on the build; fails below 95 in any category |

## Where things live

- `src/site.config.ts`: business facts (name, address, phone, booking URL, profiles). The only place
  these are written; SEO, schema, footer, and `llms.txt` read from it.
- `src/components/seo/`: `SEO.astro` (title, description, canonical, Open Graph, Twitter) and
  `JsonLd.astro`. Schema builders are in `src/lib/schema.ts`.
- `src/layouts/BaseLayout.astro`: the only layout. Emits Organization, ProfessionalService
  (a LocalBusiness subtype), WebSite, and WebPage on every page; pass extra nodes with `schema`.
- `src/content/`: `services` and `pages` collections, validated in `src/content.config.ts`.
  `draft: true` keeps an entry out of the build, sitemap, and `llms.txt`.
- `src/pages/llms.txt.ts`: generated from config and collections, never edited by hand.
- `public/_headers` and `public/_redirects`: Cloudflare caching, security headers, and redirects.

## Rules

- Build from the approved Creative Studio mockup. Do not invent layouts, copy, or claims.
- No em dashes anywhere, including code comments. `npm run lint` enforces it.
- Never invent results, statistics, testimonials, or client names.
- Tokens only: add a token to `@theme` before using a new colour, size, or duration.
- Zero JS by default. Motion is CSS first: `data-reveal` for scroll reveals, native cross-document
  view transitions. Add a small library only for a specific effect CSS cannot do, and justify it.
- Images go through `astro:assets` (`<Image>` or `<Picture>`), with width, height, and alt text.
  The LCP image gets `loading="eager"` and `fetchpriority="high"`.
- One `h1` per page. Every page sets a unique title (under 60 characters) and description
  (under 160 characters).
- CSP is on (`security.csp`). Do not add inline `style` attributes or inline event handlers; use
  classes and bundled scripts.
- Every booking link and form is tested on the preview before release. A dead booking link blocks
  release.

## Deploy

`.github/workflows/deploy.yml` builds and runs `wrangler pages deploy` to the Cloudflare Pages
project `techshift-website`: pull requests get preview deploys, and a push to `main` deploys
production. Pushing or merging to `main` is a production release and needs Azeem's explicit approval.
