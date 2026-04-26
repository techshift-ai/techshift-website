import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const content = `# Techshift AI Consulting
> AI consulting and implementation for small and medium businesses. Based in Barrie, Ontario, Canada.

## About
Techshift finds where AI adds real value in a business, then builds it end-to-end — agents, websites, automations, lead engines, whatever fits the problem. One team, one invoice, one system that actually runs.

## Services
- [Websites that work for you](https://techshift-website.pages.dev/#services) — Sites that qualify visitors, answer questions, and feed leads into your pipeline automatically.
- [AI employees](https://techshift-website.pages.dev/#services) — Agents that handle customer calls, booking, order tracking, and lead follow-up around the clock.
- [Business automations](https://techshift-website.pages.dev/#services) — The repetitive tasks you or your staff do every day, week, or month — handled automatically.
- [Marketing and lead generation](https://techshift-website.pages.dev/#services) — AI-driven SEO, content, and outbound that keeps your pipeline full without adding headcount.
- [Sales tools](https://techshift-website.pages.dev/#services) — Smarter follow-up, better targeting, faster outreach. AI that helps you close.
- [Custom builds](https://techshift-website.pages.dev/#services) — When the problem doesn't fit a category, we start with the business case and build what fits.

## Process
- [How we work](https://techshift-website.pages.dev/#process) — Four-step process: listen, plan, build (4 weeks), run and improve monthly.

## Pricing
- [Pricing model](https://techshift-website.pages.dev/#pricing) — One-time setup fee + monthly subscription. 50% upfront, 50% at go-live. No long-term contracts.

## FAQ
- [Frequently asked questions](https://techshift-website.pages.dev/#faq) — Build timeline, subscription details, ownership, tech requirements, integrations, and guarantees.

## Contact
- Location: Barrie, Ontario, Canada
- Email: hello@techshift.ai
- Booking: https://techshift-website.pages.dev/#book
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
