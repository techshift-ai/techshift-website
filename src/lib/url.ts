import { site } from '../site.config';

/**
 * Clean absolute URL for canonical, og:url, and schema ids.
 * Static builds use build.format "file", so Astro.url.pathname can be /index.html or /about.html.
 * Cloudflare serves those at / and /about, which is the form search engines should see.
 */
export function absoluteUrl(pathOrUrl: string): string {
  const url = new URL(pathOrUrl, site.url);
  url.pathname = url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString();
}
