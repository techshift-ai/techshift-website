import { isValidTimeZone } from './slots';

export const ISSUE_VALUES = [
  'lowering-costs',
  'saving-time',
  'growing-revenue',
  'customer-service',
  'online-presence',
  'something-else',
] as const;

export type Issue = (typeof ISSUE_VALUES)[number];

export const ISSUE_LABELS: Record<Issue, string> = {
  'lowering-costs': 'Lowering costs',
  'saving-time': 'Saving time',
  'growing-revenue': 'Growing revenue',
  'customer-service': 'Customer service',
  'online-presence': 'Online presence',
  'something-else': 'Something else',
};

export interface BookingRequest {
  start: string;
  name: string;
  email: string;
  businessName: string;
  issue: Issue;
  /** Optional notes from the visitor. The topic itself is `issue`. */
  problem?: string;
  phone?: string;
  website?: string;
  businessType?: string;
  /** Visitor's IANA time zone, used only to make the event description readable. */
  timeZone?: string;
  /** Honeypot. Real visitors never see or fill it. */
  honeypot?: string;
  turnstileToken?: string;
}

export type ValidationResult =
  { ok: true; value: BookingRequest } | { ok: false; errors: Record<string, string> };

const LIMITS = {
  name: 100,
  email: 254,
  businessName: 150,
  problem: 2000,
  phone: 40,
  website: 300,
  businessType: 100,
};

function isIssue(value: string): value is Issue {
  return (ISSUE_VALUES as readonly string[]).includes(value);
}

// Strip control characters except newlines and tabs, then trim.
const clean = (v: unknown): string =>
  typeof v === 'string'
    ? v
        .split('')
        .filter((c) => {
          const code = c.charCodeAt(0);
          return code === 9 || code === 10 || code >= 32;
        })
        .join('')
        .trim()
    : '';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[0-9+().\-\s]{7,}(\s*(x|ext\.?)\s*\d{1,6})?$/i;

function normalizeWebsite(raw: string): string | undefined {
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (!url.hostname.includes('.')) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function validateBookingRequest(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: { body: 'Expected a JSON object' } };
  }
  const raw = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const v = {
    start: clean(raw.start),
    name: clean(raw.name),
    email: clean(raw.email).toLowerCase(),
    businessName: clean(raw.businessName),
    issue: clean(raw.issue),
    problem: clean(raw.problem),
    phone: clean(raw.phone),
    website: clean(raw.website),
    businessType: clean(raw.businessType),
    timeZone: clean(raw.timeZone),
    honeypot: clean(raw.honeypot),
    turnstileToken: clean(raw.turnstileToken),
  };

  if (!v.start || Number.isNaN(Date.parse(v.start))) errors.start = 'Choose a time slot';
  for (const field of ['name', 'businessName'] as const) {
    if (!v[field]) errors[field] = 'Required';
  }
  if (!isIssue(v.issue)) errors.issue = 'Choose what you would like help with';
  if (!v.email) errors.email = 'Required';
  else if (!EMAIL.test(v.email)) errors.email = 'Enter a valid email address';
  if (v.phone && !PHONE.test(v.phone)) errors.phone = 'Enter a valid phone number';

  let website: string | undefined;
  if (v.website) {
    website = normalizeWebsite(v.website);
    if (!website) errors.website = 'Enter a valid website address';
  }
  for (const [field, max] of Object.entries(LIMITS)) {
    const value = v[field as keyof typeof v];
    if (value.length > max) errors[field] = `Keep this under ${max} characters`;
  }
  if (v.timeZone && !isValidTimeZone(v.timeZone)) errors.timeZone = 'Unknown time zone';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      start: new Date(Date.parse(v.start)).toISOString(),
      name: v.name,
      email: v.email,
      businessName: v.businessName,
      issue: v.issue as Issue,
      problem: v.problem || undefined,
      phone: v.phone || undefined,
      website,
      businessType: v.businessType || undefined,
      timeZone: v.timeZone || undefined,
      honeypot: v.honeypot || undefined,
      turnstileToken: v.turnstileToken || undefined,
    },
  };
}
