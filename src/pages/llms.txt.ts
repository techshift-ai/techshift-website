import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../site.config';

// llms.txt (https://llmstxt.org): a plain markdown index for AI answer engines.
// Generated from site.config.ts and the content collections so it never drifts from the site.
export const GET: APIRoute = async () => {
  const services = (await getCollection('services', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order,
  );
  const pages = await getCollection('pages', ({ data }) => !data.draft && !data.seo.noindex);

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `Based in ${site.address.addressLocality}, ${site.address.addressRegion}. Serving ${site.areaServed.join(', ')}.`,
  ];
  if (site.bookingUrl) lines.push('', `Book a consultation: ${site.bookingUrl}`);
  if (services.length > 0) {
    lines.push('', '## Services', '');
    for (const s of services) {
      lines.push(`- [${s.data.name}](${site.url}/services/${s.id}): ${s.data.summary}`);
    }
  }
  if (pages.length > 0) {
    lines.push('', '## Pages', '');
    for (const p of pages) {
      lines.push(`- [${p.data.heading}](${site.url}/${p.id}): ${p.data.seo.description}`);
    }
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
