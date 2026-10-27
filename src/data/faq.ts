/** Visible FAQ copy. Schema and llms.txt read this same list. */
export const faqItems = [
  {
    question: 'What does Techshift actually do?',
    answer:
      'We design, build and run AI systems that lower your costs, give you time back and help your business grow. That can be a digital front desk that answers customers day and night, automation that takes repetitive work off your team, or a stronger online presence. We start with the problem that matters most to you and build from there.',
  },
  {
    question: 'Do you work with businesses like mine?',
    answer:
      'Yes. We work with businesses of every kind, from restaurants and clinics to roofing, HVAC and other trades. We start by finding the problems and opportunities specific to your business, then build custom solutions around them.',
  },
  {
    question: 'What kinds of problems can AI solve for my business?',
    answer:
      'AI is well suited to work that is repetitive, time sensitive or easy to forget. Common examples are answering calls and messages after hours, booking appointments, following up on quotes, asking happy customers for reviews and sending maintenance reminders. If something costs you time or money every week, it is worth a conversation.',
  },
  {
    question: 'Do I need to replace my current software?',
    answer:
      'Usually not. We build around the tools you already use, so your daily operations keep running while they improve. We only suggest replacing a system when the new one genuinely adds more value without disrupting your business.',
  },
  {
    question: 'How long does it take?',
    answer:
      'It depends on the scope of the system, and we map out the timeline with you during planning. Every system then goes through a pilot that lasts from one month to several, depending on the project and how long outcomes take to show.',
  },
  {
    question: 'How do I know it’s working?',
    answer:
      'Every system starts with a pilot. At the end, we show you a clear before and after, such as booked appointments or hours saved, quantified in dollar value for your business. You see the results before you commit to anything ongoing.',
  },
  {
    question: 'How does pricing work?',
    answer:
      'Pricing comes down to two clear numbers: a one-time setup fee and a monthly cost to keep the system running. The monthly cost covers technical support, monitoring, maintenance and the AI usage itself, so there are no surprise bills from AI providers. The consultation is free, and we share pricing once we understand what you need.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'We take your data seriously. You always own your data, and we work only with reputable providers, each with stringent data policies. If you have specific data security requirements, we are happy to discuss them and walk you through the relevant policies.',
  },
  {
    question: 'Are these AI technologies safe for my business?',
    answer:
      'We build every system with clear limits. It only accesses what it needs and only works with the information it is given, and sensitive actions can require a person to approve them. We also work with model providers committed to safe and responsible AI, with governance and security built in from the start.',
  },
  {
    question: 'Do I need to be technical?',
    answer:
      'Not at all. We build systems that either run quietly in the background or are simple for anyone on your team to use. We handle the design, the build and the ongoing support, and we explain everything in plain language.',
  },
] as const;

export type FaqItem = (typeof faqItems)[number];
