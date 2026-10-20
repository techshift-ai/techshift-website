/**
 * Single source of truth for business facts used in SEO, JSON-LD, llms.txt, and the footer.
 * Every client site gets its own copy of this file. Values marked TODO need founder confirmation
 * before launch; leave them undefined rather than guessing.
 */
export const site = {
  name: 'Techshift',
  legalName: 'Techshift', // TODO: confirm registered business name
  url: 'https://techshift.ai',
  locale: 'en_CA',
  language: 'en-CA',
  tagline: 'TODO: tagline from the approved mockup',
  description: 'TODO: default meta description from the approved mockup (150 to 160 characters).',
  email: undefined as string | undefined, // TODO: public contact email
  telephone: undefined as string | undefined, // TODO: public phone number, E.164 format
  founder: {
    name: undefined as string | undefined, // TODO: confirm founder name for About and schema
    jobTitle: 'Founder',
  },
  address: {
    addressLocality: 'Barrie', // TODO: confirm public locality
    addressRegion: 'ON',
    addressCountry: 'CA',
    postalCode: undefined as string | undefined,
    streetAddress: undefined as string | undefined,
  },
  // Cities or regions served. Drives areaServed in schema.
  areaServed: ['Greater Toronto Area'], // TODO: confirm service area
  // Public profiles: LinkedIn, Google Business Profile, etc.
  sameAs: [] as string[],
  // Primary call to action. A dead booking link is a release blocker.
  bookingUrl: undefined as string | undefined, // TODO: new booking page URL
  social: {
    twitterHandle: undefined as string | undefined,
  },
  defaultOgImage: '/og-default.png',
} as const;

export type Site = typeof site;
