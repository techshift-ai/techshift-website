/**
 * Single source of truth for business facts used in SEO, JSON-LD, llms.txt, and the footer.
 * Copy and claims come from the approved homepage. Do not add a phone number.
 */
export const site = {
  name: 'Techshift',
  legalName: 'Techshift',
  url: 'https://techshift.ai',
  locale: 'en_CA',
  language: 'en-CA',
  title: 'AI systems that lower costs and drive growth | Techshift',
  tagline: 'Intelligent systems built around your business, made to lower costs and drive growth.',
  description:
    'Techshift is a Canadian-based AI technology firm. We build intelligent systems that answer customers, automate repetitive work, and help you get found online.',
  email: 'info@techshift.ai',
  /** Public phone number. Intentionally unset: the site does not publish one. */
  telephone: undefined as string | undefined,
  founder: {
    name: undefined as string | undefined,
    jobTitle: 'Founder',
  },
  address: {
    addressLocality: 'Barrie',
    addressRegion: 'ON',
    addressCountry: 'CA',
    postalCode: undefined as string | undefined,
    streetAddress: undefined as string | undefined,
  },
  /**
   * Left empty on purpose. Techshift works with businesses anywhere, so schema has no service area
   * until a founder confirms a public area.
   */
  areaServed: [] as string[],
  sameAs: [] as string[],
  /** In-page booking. The modal opens from any link with data-book. */
  bookingUrl: 'https://techshift.ai/#book',
  /** Used when the booking API is unavailable, including on pages.dev previews where /api is not routed. */
  bookingFallbackUrl: 'https://calendar.app.google/e6LSuFcapUGRxbvu9',
  /** Public Turnstile site key. The secret stays in the Worker and is never committed. */
  turnstileSiteKey: '0x4AAAAAAFoeL5CQup-ywEKf',
  social: {
    twitterHandle: undefined as string | undefined,
  },
  defaultOgImage: '/og-default.png',
  themeColor: '#002244',
} as const;

export type Site = typeof site;
