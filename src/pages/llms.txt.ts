import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const content = `# Techshift
> AI consulting and implementation for small and medium businesses.

## About
Techshift finds where AI adds real value in a business, then builds it end-to-end — agents, websites, automations, lead engines, whatever fits the problem. One team, one invoice, one system that actually runs.

## Services
We build AI that does work for your business. This isn't just a chatbot anymore—it can book, update systems, chase leads, and run the repeatable parts of your operations. Whatever form fits best—agents, automations, or a customer-facing website—we scope it to the job instead of boxing you into one pattern.

- [Websites that work for you](https://techshift.ai/websites) — AI-powered business websites with built-in chat assistants, automated booking, smart forms, and lead follow-up. Built for SEO, AEO, and conversion.
- [AI employees](https://techshift.ai/ai-employees) — Customer-facing AI agents for calls, chat, booking, order status, and lead follow-up — trained on your policies with escalation paths.
- [Business automation](https://techshift.ai/business-automation) — Task automation wired into quoting, invoicing, scheduling, data sync, approvals, reminders, and reporting integrated with existing tools.
- [Business process automation](https://techshift.ai/business-process-automation) — Orchestration across teams: checkpoints, SLA visibility for stalled work, handoff packets, playbooks per job type, rework branches, alignment with downstream billing.
- [Marketing and lead generation](https://techshift.ai/#services) — AI-driven SEO, content, and outbound that keeps your pipeline full without adding headcount.
- [Sales tools](https://techshift.ai/#services) — Smarter follow-up, better targeting, faster outreach. AI that helps you close.
- [Custom builds](https://techshift.ai/#services) — When the problem doesn't fit a category, we start with the business case and build what fits.

## Process
- [How we work](https://techshift.ai/#process) — Four-step process: listen, plan, build, run and improve monthly.

## Pricing
- [Pricing model](https://techshift.ai/#pricing) — One-time setup fee + monthly subscription. 50% upfront, 50% at go-live. No long-term contracts.

## FAQ
- [Frequently asked questions](https://techshift.ai/#faq) — Build timeline, subscription details, ownership, tech requirements, integrations, and guarantees.

## Pages
- [AI-Powered Websites](https://techshift.ai/websites) — Full details on AI-powered website design and development, including features, real-world use cases, and what's included.
- [AI Employees](https://techshift.ai/ai-employees) — Customer-facing agents, capabilities by channel, industry examples, FAQ, and booking.
- [Business Automation](https://techshift.ai/business-automation) — Back-office workflow automation for quotes, invoicing, scheduling, data sync, approvals, alerts, and handoffs across tools.

## Contact
- Email: info@techshift.ai
- Booking: https://techshift.ai/#book
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
