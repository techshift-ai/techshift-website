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
  /**
   * Locality only: Toronto, Ontario, Canada. No street address is published.
   * JSON-LD reads these fields. Visible page copy does not.
   */
  address: {
    addressLocality: 'Toronto',
    addressRegion: 'Ontario',
    addressCountry: 'Canada',
    postalCode: undefined as string | undefined,
    streetAddress: undefined as string | undefined,
  },
  /**
   * Service area for JSON-LD. Toronto is a City. The Greater Toronto Area is an AdministrativeArea.
   * Not rendered in visible page copy.
   */
  areaServed: [
    { type: 'City', name: 'Toronto' },
    { type: 'AdministrativeArea', name: 'Greater Toronto Area' },
  ] as const,
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
