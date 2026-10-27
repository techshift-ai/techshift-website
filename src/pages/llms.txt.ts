import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { faqItems } from '../data/faq';
import { services } from '../data/services';
import { site } from '../site.config';

// llms.txt (https://llmstxt.org): a plain markdown index for AI answer engines.
// Generated from site.config.ts and the homepage content so it stays aligned with the site.
export const GET: APIRoute = async () => {
  const pages = await getCollection('pages', ({ data }) => !data.draft && !data.seo.noindex);
  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    site.tagline,
    '',
    'Techshift is a Canadian-based AI technology firm. We build reliable, sustainable, fit-for-purpose systems that fix what costs businesses time and money.',
    '',
    `Email: ${site.email}`,
    `Book a free consultation: ${site.bookingUrl}`,
    '',
    '## Services',
    '',
  ];
  for (const item of services) {
    lines.push(`- [${item.name}](${site.url}${item.path}): ${item.description}`);
  }
  lines.push('', '## FAQ', '');
  for (const item of faqItems) {
    lines.push(`### ${item.question}`, '', item.answer, '');
  }
  if (pages.length > 0) {
    lines.push('## Pages', '');
    for (const page of pages) {
      lines.push(`- [${page.data.heading}](${site.url}/${page.id}): ${page.data.seo.description}`);
    }
  }

  return new Response(lines.join('\n').trim() + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
