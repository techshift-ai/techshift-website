import type {
  AdministrativeArea,
  BreadcrumbList,
  FAQPage,
  Organization,
  ProfessionalService,
  Service,
  WebPage,
  WebSite,
  WithContext,
} from 'schema-dts';
import { site } from '../site.config';

const orgId = `${site.url}/#organization`;
const businessId = `${site.url}/#business`;
const websiteId = `${site.url}/#website`;

const absolute = (path: string) => new URL(path, site.url).toString();

const areaServed: AdministrativeArea[] | undefined =
  site.areaServed.length > 0
    ? site.areaServed.map((area) =>
        area.type === 'City'
          ? { '@type': 'City', name: area.name }
          : { '@type': 'AdministrativeArea', name: area.name },
      )
    : undefined;

const postalAddress = () => ({
  '@type': 'PostalAddress' as const,
  addressLocality: site.address.addressLocality,
  addressRegion: site.address.addressRegion,
  addressCountry: site.address.addressCountry,
  ...(site.address.postalCode && { postalCode: site.address.postalCode }),
  ...(site.address.streetAddress && { streetAddress: site.address.streetAddress }),
});

export function organization(logoUrl: string): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId,
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: absolute(logoUrl),
    ...(site.email && { email: site.email }),
    ...(site.telephone && { telephone: site.telephone }),
    ...(site.sameAs.length > 0 && { sameAs: [...site.sameAs] }),
    ...(site.founder.name && {
      founder: { '@type': 'Person', name: site.founder.name, jobTitle: site.founder.jobTitle },
    }),
  };
}

/**
 * ProfessionalService is a schema.org subtype of LocalBusiness, so this one node is the
 * LocalBusiness entry too. Phone and area served are included only when site config sets them.
 */
export function professionalService(logoUrl: string): WithContext<ProfessionalService> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': businessId,
    name: site.name,
    url: site.url,
    image: absolute(logoUrl),
    parentOrganization: { '@id': orgId },
    address: postalAddress(),
    ...(areaServed && { areaServed }),
    ...(site.telephone && { telephone: site.telephone }),
    ...(site.email && { email: site.email }),
    ...(site.sameAs.length > 0 && { sameAs: [...site.sameAs] }),
  };
}

export function website(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId,
    name: site.name,
    url: site.url,
    inLanguage: site.language,
    publisher: { '@id': orgId },
  };
}

export function webPage(opts: {
  url: string;
  title: string;
  description: string;
}): WithContext<WebPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${opts.url}#webpage`,
    url: opts.url,
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': websiteId },
    inLanguage: site.language,
  };
}

export function service(opts: {
  name: string;
  description: string;
  path: string;
}): WithContext<Service> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: absolute(opts.path),
    provider: { '@id': businessId },
    ...(areaServed && { areaServed }),
  };
}

export function breadcrumbs(items: { name: string; path: string }[]): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/** Only use for questions and answers that are visible on the page. */
export function faqPage(items: { question: string; answer: string }[]): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
