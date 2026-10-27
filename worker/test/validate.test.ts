import { describe, expect, it } from 'vitest';
import { validateBookingRequest } from '../src/validate';

const base = {
  start: '2026-10-20T14:00:00Z',
  name: 'Jordan Lee',
  email: 'Jordan@Example.com',
  businessName: 'Lee Plumbing',
  issue: 'lowering-costs',
  problem: 'We miss calls after hours.',
};

describe('validateBookingRequest', () => {
  it('accepts the required fields and normalizes them', () => {
    const r = validateBookingRequest(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe('jordan@example.com');
      expect(r.value.start).toBe('2026-10-20T14:00:00.000Z');
      expect(r.value.phone).toBeUndefined();
    }
  });

  it('requires name, email, business name, a topic, and a slot', () => {
    const r = validateBookingRequest({
      name: ' ',
      email: '',
      businessName: '',
      issue: '',
      problem: '',
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(Object.keys(r.errors).sort()).toEqual([
        'businessName',
        'email',
        'issue',
        'name',
        'start',
      ]);
  });

  it('accepts each consultation topic and treats notes as optional', () => {
    for (const issue of [
      'lowering-costs',
      'saving-time',
      'growing-revenue',
      'customer-service',
      'online-presence',
      'something-else',
    ]) {
      const r = validateBookingRequest({ ...base, issue, problem: '' });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.issue).toBe(issue);
        expect(r.value.problem).toBeUndefined();
      }
    }
    expect(validateBookingRequest({ ...base, issue: 'not-a-topic' }).ok).toBe(false);
  });

  it('validates optional phone, website, and time zone', () => {
    const good = validateBookingRequest({
      ...base,
      phone: '+1 (416) 555-0100 ext 12',
      website: 'leeplumbing.ca',
      businessType: 'Trades',
      timeZone: 'America/Vancouver',
    });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.value.website).toBe('https://leeplumbing.ca/');

    const bad = validateBookingRequest({
      ...base,
      phone: 'call me',
      website: 'javascript:alert(1)',
      timeZone: 'Mars/Base',
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['phone', 'timeZone', 'website']);
  });

  it('rejects bad emails and oversized fields', () => {
    const r = validateBookingRequest({ ...base, email: 'not-an-email', problem: 'x'.repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toMatchObject({ email: expect.any(String), problem: expect.any(String) });
  });

  it('strips control characters and passes the honeypot through', () => {
    const r = validateBookingRequest({ ...base, name: 'Jordan\u0000 Lee', honeypot: 'spam' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe('Jordan Lee');
      expect(r.value.honeypot).toBe('spam');
    }
  });

  it('rejects non-object bodies', () => {
    expect(validateBookingRequest('hello').ok).toBe(false);
    expect(validateBookingRequest(null).ok).toBe(false);
  });
});
