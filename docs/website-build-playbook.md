# Website build playbook

A record of how this marketing site was taken from an approved single-file mockup to a static production build. The steps are the method. Names, URLs, and secrets stay in the client repo (`site.config.ts`, the Worker config, and the host dashboard), not in this playbook.

## Stack and versions (this build)

| Piece        | Version / choice                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Node         | 24 LTS in `.nvmrc` and in the Pages workflow. `package.json` allows Node 22.22 or newer, which is what local checks used on this build. |
| Astro        | 7.4.1, `output: 'static'`, `build.format: 'file'`, `trailingSlash: 'never'`                                                             |
| Tailwind CSS | 4.3.3, CSS-first. Tokens live in `@theme` in `src/styles/global.css`. There is no `tailwind.config.js`.                                 |
| TypeScript   | strict, via `astro check` and a separate `tsc` project for the Worker                                                                   |
| Fonts        | Astro Fonts API, Fontsource, self-hosted. Poppins 400, 500, 600, 700, Latin, `font-display: swap`, Arial fallback. Preload 400 and 600. |
| Images       | `astro:assets` for raster brand files used in metadata. The logo on the page is inline SVG from the approved mark.                      |
| Sitemap      | `@astrojs/sitemap` 3.7.4, with `/404` and `/review` filtered out                                                                        |
| Schema       | `schema-dts`, one JSON-LD script per node                                                                                               |
| Worker       | Wrangler 4.151.3, Vitest 5. The Worker is not deployed by the site workflow.                                                            |
| Quality      | ESLint 10, Prettier 3, Lighthouse 13 via `chrome-launcher`                                                                              |
| Host         | Cloudflare Pages. Pull requests get a preview. A push to `main` is production.                                                          |

## Project structure

```
src/site.config.ts          business facts only (name, email, booking URLs, theme color)
src/styles/global.css       @theme tokens, then the ported stylesheet
src/styles/site.css         layout and motion from the mockup, using token variables
src/data/                   copy that must stay in sync (FAQ, service blurbs)
src/components/brand/       logo and icon sprite
src/components/site/        header, footer, booking dialog
src/components/home/        homepage sections
src/components/seo/         meta tags and JSON-LD
src/layouts/BaseLayout.astro
src/pages/                  routes, llms.txt, web manifest
src/scripts/                the only client TypeScript
public/_headers             Cloudflare headers the meta CSP cannot set
public/_redirects           301s for retired URLs
public/review/              design review only, noindex
worker/                     booking API, tested locally, deployed separately
```

`draft: true` on a content entry keeps it out of the build, the sitemap, and `llms.txt`.

## Mockup to Astro

1. Treat the approved HTML file as the only source of layout and copy. Do not invent claims, statistics, testimonials, or client names.
2. Lift the mockup `<style>` into `site.css` after deleting embedded font files. Point every color at a `@theme` token (`--color-brand-navy`, `--color-navy-deep`, tints, `--color-brand-red`, and the form and status colors the mockup uses).
3. Replace repeated logo SVG with one component. Keep the icon sprite as one component included once per page.
4. Delete anything marked dev-only (state switchers, screenshot hooks).
5. Do not ship pages the mockup only points at as future work. On this build the "see how it works" link targeted a page that was explicitly out of scope, so the link was removed rather than left as a 404.
6. Split the page into layout chrome (header, footer, dialog) and the homepage sections. The layout owns the single `<main>`.
7. FAQ questions and answers live in one data module. The accordion and `FAQPage` schema both map that module. Service names and descriptions used in schema and `llms.txt` are the sentences visible on the page.

### Inline styles and CSP

The mockup set `--k`, `--i`, and `--h` with `style` attributes. Astro's CSP hashes stylesheets and rejects inline style attributes. Those custom properties became classes (`.k-0`, `.i-1`) and `:nth-child` rules for the waveform. Animation delays still read `var(--k)` and `var(--i)`.

JS may set custom properties at runtime (`element.style.setProperty`) for pointer-reactive motion. That is not an HTML style attribute, and it is limited to fine pointers with reduced motion off.

## Design tokens

Add a token before using a new color, radius, or easing. This build put the brand palette, the darker navy, the on-dark tints, the red accent, form and status colors, radii, and the draw easing in `@theme`. The fluid type scale and the spacing ramp from the mockup stay as custom properties in `site.css` because they are `clamp()` values tied to that layout, and they reference the theme tokens for color and easing.

Do not hardcode a hex in a component. The theme color in `<meta name="theme-color">` and the manifest is read from `site.config.ts`, which matches the navy token.

## Motion

CSS first:

- Scroll reveal: elements with `data-reveal` stay visible without JS. With the `js` class, children start offset and `.is-in` (added by `IntersectionObserver`) plays them once.
- Hero underline, offer hover, accordion height, FAQ height, dialog open and close, and the orbit mark are CSS.
- `prefers-reduced-motion: reduce` kills animation and transition duration and shows the final state.

Small TypeScript, only where CSS cannot do the job:

- `src/scripts/site.ts`: menu, reveal, header shadow on scroll, pointer depth and magnetic buttons, the scroll-driven systems story, accordions.
- `src/scripts/booking.ts`: the dialog.

An inline classic script in `<head>` adds `js` before first paint so the mobile nav does not flash open. Astro hashes that script into the CSP.

Accordions are one open panel at a time, including under reduced motion. Without JS every panel is visible because the closed state is only applied under `.js`.

## SEO and AEO checklist

- One `h1`. Section titles are `h2`. Cards, steps, and questions are `h3`.
- Unique title under 60 characters and description under 160. If the mockup meta description is over 160, shorten it with the same facts. Do not add a new claim to make the count.
- Canonical, Open Graph, and Twitter tags from `SEO.astro`. `og:image` is a real 1200x630 image made from the logo on the brand navy, with no claims on it.
- Favicon SVG (the mark on navy), `favicon.ico`, apple touch icon, 192 and 512 PNG icons, and a web manifest generated from `site.config.ts`.
- `robots.txt` allows `/` and disallows `/review/`. The review folder also sends `X-Robots-Tag: noindex`.
- Sitemap from the integration. Filter 404 and review URLs.
- JSON-LD on every page: `Organization`, `ProfessionalService`, `WebSite`, `WebPage`. Homepage adds `FAQPage` from the FAQ module and one `Service` node per system named on the page.
- Omit phone and person when `site.config.ts` does not set them. Emit `areaServed` only from that config, with a `City` for a city and an `AdministrativeArea` for a wider region. This build serves Toronto (City) and the Greater Toronto Area (AdministrativeArea). The postal address is the locality only: Toronto, Ontario, Canada, with no street address. Do not add that location to visible page copy, and do not invent a service area that config does not list.
- `llms.txt` is generated from config, the service list, and the FAQ. It is not a hand-written file.
- Semantic landmarks: `header`, `nav` (named), `main`, `footer`. Accordions are `button` plus `aria-expanded` plus `aria-controls` and a `role="region"`. The booking dialog is a native `<dialog>` with `aria-modal`, a Tab trap, Esc, and focus returned to the opener.

## Accessibility checklist

- Visible focus rings. Touch targets at least 44px (buttons are 48px).
- Contrast uses the approved palette. White on the brand blue and muted text on white were checked against WCAG AA before shipping. On-dark tints were chosen so secondary text on navy clears AA.
- Reduced motion is respected in CSS and in the scroll story.
- The mobile menu control is an icon button with an accessible name and no visible "Menu" word.
- Form errors use `aria-invalid` and visible text. The honeypot is `aria-hidden` and `tabindex="-1"`.
- Decorative demo art is `aria-hidden` where the adjacent heading already says the same thing. The systems story steps are the accessible description of the booking demo.

## Booking

The page stays static. A Worker serves `GET /api/availability` and `POST /api/book` on the production hostname only.

Pattern:

1. Every "book" control is a real link to the fallback URL in config, with `data-book`. Without JS the browser follows the link. With JS the click opens the dialog.
2. The dialog fetches same-origin `/api/availability`. On the production host the Worker route answers. On a Pages preview host (`*.pages.dev`) that route does not exist.
3. If the response is not OK, is not JSON, or has no slots, the dialog shows a short message and the same fallback link. It does not show business hours or scheduling rules.
4. The details step loads the Turnstile script (`https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`) only after the dialog is open. The site key is public and lives in `site.config.ts`. The secret is a Worker secret and is never committed.
5. Submit posts JSON including the topic chip (`issue`), optional notes, a honeypot, and the Turnstile token when one exists.
6. If the widget mounts and has not errored, wait for a token. If Turnstile errors (a hostname mismatch on localhost is the usual case), submit anyway. Production with Turnstile required will reject a missing token, and the dialog then shows the email plus the fallback link so the path is never dead.
7. Success copy does not name the video product. A join URL may be placed in the calendar file. The on-screen sentence is the approved line about the invitation.
8. Time zone labels follow the selected date. The header, the slot details, and the confirmation use the long zone name of that instant, so a date after the November change says Eastern Standard Time and a date before it says Eastern Daylight Time. With nothing selected, the header uses the generic name (Eastern Time) so it does not contradict a later slot. Do not show availability hours or scheduling rules.

Local dev: `npm run worker:dev` (mock calendar, Turnstile off) and `astro dev`, which proxies `/api` to the Worker. `astro preview` uses that same proxy, so it is not a test of a missing API. Stop the Worker, or use the Pages preview URL, to test the fallback.

The Worker reads bookable windows from calendar events titled exactly "Open for consultations" (trimmed, case-insensitive) on the operations calendar. Slots are 30-minute starts on a 30-minute clock, fully inside a window, outside a 15-minute buffer around freeBusy conflicts on both calendars, at least 24 hours ahead, and at most 30 days ahead. Transparent window events must not count as busy. A calendar read failure is HTTP 503. Duration, buffer, notice, and horizon stay in code. Hours do not.

Production auth for this build is `GOOGLE_AUTH_MODE=oauth` with a refresh token. The scope is `https://www.googleapis.com/auth/calendar` because listing event titles needs more than freeBusy. Set secrets with `wrangler secret put`. Do not deploy the Worker from the site workflow.

## Performance budget

- Static HTML. Client JS is two small modules, loaded from the layout because the dialog and menu are global.
- CSS is inlined (`build.inlineStylesheets: 'always'`) so the first view has no render-blocking stylesheet request. Revisit if a page's CSS grows past about 50 KB.
- Fonts are self-hosted woff2 with `font-display: swap`. No third-party font host.
- No client UI framework.
- Lighthouse mobile, all categories, target 95. This build scored 100 in performance, accessibility, best practices, and SEO on `/`.
- The LCP text is HTML, not an image. The hero art is inline SVG.

## CSP and headers

Astro `security.csp` writes a meta policy and hashes every processed script and style.

This build sets:

- `script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com` plus Astro's hashes
- `frame-src https://challenges.cloudflare.com` for the Turnstile iframe
- `connect-src 'self' https://cloudflareinsights.com` for same-origin `/api` and the analytics beacon

Cloudflare Web Analytics injects `https://static.cloudflareinsights.com/beacon.min.js` at the edge, after the build. Astro never sees that tag, so it cannot hash it. `script-src` must allow `https://static.cloudflareinsights.com`, and `connect-src` must allow `https://cloudflareinsights.com`. Leave every other source as strict as it is. Turnstile's own requests run inside its iframe, so the parent does not need that host on `connect-src`. Do not enable `strict-dynamic` or the external script hosts are ignored.

`public/_headers` adds what a meta policy cannot: `frame-ancestors`, `base-uri`, `form-action`, `X-Frame-Options`, nosniff, referrer policy, and HSTS. `/review/*` is framable by the same origin and marked `noindex`.

## Redirects

`public/_redirects`, one 301 per retired URL that already existed on the previous production site, aimed at the homepage or the matching section. Also redirect a retired full-text AI file to `llms.txt` if that URL was public. Confirm the list against the previous branch before release, not against the new routes only.

## QA gates

Run, in order:

1. `npm run verify` (format, lint including the em dash check, Worker typecheck, `npm test`, production build).
2. `npm test` is part of verify. It covers slots, windows, validation topics, auth, and the HTTP API against the mock calendar.
3. `npm run lighthouse` against the build. Fail under 95 in any category.
4. Browser pass at 390 and 1440: homepage, mobile menu (icon only, Esc closes), accordions (one open), booking with the Worker running, booking with the Worker stopped.
5. No console or page errors on those flows.
6. JSON-LD present for the types above, FAQ count matches the visible questions, no telephone, no person node. Address locality is Toronto, Ontario, Canada, with no street. `areaServed` lists Toronto (City) and the Greater Toronto Area (AdministrativeArea).
7. `npx wrangler deploy --dry-run` from `worker/` before anyone deploys the Worker. Pass `--env=""` if Wrangler warns about multiple environments. Dry-run does not deploy.

## Deploy flow

GitHub Actions (`.github/workflows/deploy.yml`) checks out, uses Node 24, `npm ci`, `npm run build`, and `wrangler pages deploy` to the Pages project. Pull requests deploy a preview. A push to `main` deploys production.

Do not merge, and do not push `main`, until the owner has looked at the preview. Do not deploy the Worker in that workflow. Worker deploy is a separate command and needs the owner's approval, secrets, and a zone route for `/api/*`.

## Release checklist

- Preview URL loads, mobile and desktop match the approved mockup, and the fallback booking link works on `*.pages.dev`.
- Title, description, canonical, social image, favicon, manifest, sitemap, robots, and JSON-LD checked on the preview.
- `llms.txt` matches the live copy.
- Old URLs 301.
- No phone number. No video-product name in the UI. No hours in the booking UI.
- Worker secrets are set in the dashboard, not in git, and a dry-run has succeeded. The owner deploys the Worker when they want `/api` live on the production host.
- `npm run verify` and Lighthouse are green on the commit that is released.

## Pitfalls hit on this build

- The em dash check scans comments and markdown. Use a comma, colon, or period.
- The approved meta description was longer than 160 characters. It was shortened with the same facts.
- Mockup `style` attributes for animation indexes fail CSP. Classes and `:nth-child` replaced them.
- Astro's HTML parser requires a closing tag on `<option>` inside `<datalist>`. Browsers accept the unclosed form. The build does not.
- A `<script>` module that is not an ES module cannot contain `declare global`. Type the third-party widget with a cast instead.
- Control-flow narrowing of a dialog element does not survive into inner functions unless a fresh `const` of type `HTMLDialogElement` is created inside the branch.
- The public Turnstile key rejected localhost (widget error 110200). Blocking submit until a token exists made local booking impossible. A widget error must still allow submit, and the API decides.
- `localhost` and `127.0.0.1` are different origins. The local Worker allow-list needs both if people use both.
- `vite.server.proxy` also applies to `astro preview` in this project. Preview on the laptop is not the same as a Pages preview. Test the dead API by stopping the Worker, then again on `*.pages.dev`.
- Element screenshots of a sticky header look like the header is covering the section. Full-page shots taken before reveal animations finish make motion sections look empty. Wait for fonts and for `.is-in`, or read computed style, before calling a section broken.
- The stock favicon in the scaffold was the framework logo. Replace it from the approved symbol before release.
- `wrangler deploy` with a `local` environment warns unless you pass `--env=""`. The top-level environment is the production config. Dry-run still does not upload.
- The operations calendar's open windows are data. Putting weekday hours back into code will drift from the calendar the owner actually edits.
- Cloudflare Web Analytics injects `beacon.min.js` from `static.cloudflareinsights.com` after the build. A hash-only `script-src` blocks it. Allow that host on `script-src` and `cloudflareinsights.com` on `connect-src`.
- A booking zone label taken from the current instant says Eastern Daylight Time in October and then disagrees with a November slot, which is Eastern Standard Time. Name the selected instant, and use the generic name until a date is selected.
- Location schema uses `areaServed`: a City for Toronto and an AdministrativeArea for the Greater Toronto Area. The postal address is Toronto, Ontario, Canada, with no street address. Do not put that location in visible page copy.
