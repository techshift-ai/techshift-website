import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const content = `# Techshift AI Consulting
AI consulting and implementation for small and medium businesses. Based in Barrie, Ontario, Canada.
Website: https://techshift-website.pages.dev
Email: hello@techshift.ai

---

## What We Do

Techshift AI Consulting builds AI systems for small and medium businesses. We find where AI saves you the most time and money, then build it — an agent, a website, an automation, whatever fits. One team, start to finish.

We don't hand you a strategy deck and wish you luck. We build the system, deploy it into your business, and keep it running.

---

## Services

### Websites That Work For You
Not brochures. Sites that qualify visitors, answer questions, and feed leads into your pipeline automatically.

### AI Employees
Agents that handle customer calls, booking, order tracking, and lead follow-up around the clock. Think of it as hiring someone who works 24/7, uses your actual pricing and policies, and never calls in sick.

### Business Automations
The repetitive tasks you or your staff do every day, week, or month — handled automatically. Quoting, scheduling, data entry, follow-ups, reporting.

### Marketing and Lead Generation
AI-driven SEO, content, and outbound that keeps your pipeline full without adding headcount.

### Sales Tools
Smarter follow-up, better targeting, faster outreach. AI that helps you close.

### Custom Builds
When the problem doesn't fit a category, we start with your business case and build what fits.

---

## Concrete Examples

1. An AI agent that answers your phone after hours, qualifies the lead, and books them into your calendar — using your actual pricing and service area.

2. A system that reads incoming emails, drafts responses using your policies and past replies, and flags the ones that need your eyes.

3. An automation that takes a phone call recording, pulls out the job details, drafts a quote, and sends it — all before you're back from the job site.

---

## How We Work

### Step 1: We Listen
A free 30-minute call where we diagnose your biggest time and money drains. No pitch, no pressure.

### Step 2: We Plan
We map the work and propose the AI system with the best payoff. You see exactly what you're getting before you pay.

### Step 3: We Build
Four weeks, start to finish. You see a working demo every week. You're in the room for every decision.

### Step 4: We Run It
Your system goes live. We monitor it, tune it, and improve it every month. You focus on running your business.

---

## Pricing

Techshift uses a two-part pricing model:

### Setup Fee (One-Time)
Covers the full build: the AI system, integrations with your existing tools, training on your business data, testing, and go-live. 50% due upfront to start, 50% due at go-live.

### Monthly Subscription
Covers monitoring, tuning, improvements, and new features as your business grows. Starts the month after launch. No long-term contracts — cancel anytime.

---

## Why Techshift

1. We build it, not just advise on it. We ship working systems that run in your business — not recommendations that collect dust.

2. We speak business, not tech. We talk hours saved, costs cut, leads generated. If we can't put a number on it, we don't pitch it.

3. You know the price before we start. One setup fee. One monthly fee. No hourly billing, no surprise invoices, no scope creep.

4. Your AI gets better every month. We monitor, tune, and improve your system as your business evolves and AI models get better.

---

## AI Adoption Statistics

- 78% of organizations now use AI in at least one business function (McKinsey State of AI, 2025)
- 71% of Canadian SMBs are actively using AI tools (Microsoft / CNBC Canada, 2025)
- SMBs report saving 20+ hours per month after AI implementation (Thryv Survey, 2026)
- SMBs report saving $500–$2,000/month after AI implementation (Thryv Survey, 2026)
- 60% of SMBs say lack of in-house resources is the #1 barrier to AI adoption (Industry Survey, 2025)
- 66% of small businesses report improved profitability with AI investments (CPA Australia, 2025)

---

## FAQ

### How long does it take to build?
Default is four weeks from kickoff to go-live. Some projects are faster if the scope is tight. We show you a working demo every week so you're never guessing at progress.

### What does the monthly subscription cover?
Everything that keeps your AI system running and improving: monitoring for errors, tuning performance, upgrading to better AI models when they're available, and adding small new features as your business evolves. Think of it as having an AI specialist on your team without hiring one.

### Do I own what you build?
Yes. If the engagement ends, you own everything we built. We document it, hand it over cleanly, and don't hold anything hostage.

### Do I need technical staff to use this?
No. We build systems that business owners and their existing teams can use. If something breaks or needs changing, that's what the monthly subscription is for — we handle it.

### Will it work with my existing tools?
In most cases, yes. We integrate with the tools you already use — your CRM, calendar, email, phone system, website, whatever fits. During the first call, we'll map out exactly what connects to what.

### What if it doesn't work?
We monitor it closely after launch and tune it based on real results. If something isn't performing, we fix it — that's included in the monthly. And there are no long-term contracts: if you're not seeing value, you can stop anytime.

---

## Contact

- Location: Barrie, Ontario, Canada
- Email: hello@techshift.ai
- Free 30-minute diagnostic: https://techshift-website.pages.dev/#book
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
