import { describe, expect, it } from 'vitest';
import { zoneLabel } from './zone-label';

const TZ = 'America/Toronto';
const locale = 'en-CA';
// 11:00 in Toronto on a Friday before the 2026-11-01 fallback, and the Monday after it.
const beforeDstEnd = new Date('2026-10-30T15:00:00.000Z');
const afterDstEnd = new Date('2026-11-02T16:00:00.000Z');

describe('zoneLabel', () => {
  it('uses the long name of the selected instant, which changes at the November DST boundary', () => {
    expect(zoneLabel(TZ, beforeDstEnd, 'long', locale)).toBe('Eastern Daylight Time (Toronto)');
    expect(zoneLabel(TZ, afterDstEnd, 'long', locale)).toBe('Eastern Standard Time (Toronto)');
  });

  it('uses a generic name that is the same on both sides of the change', () => {
    const before = zoneLabel(TZ, beforeDstEnd, 'longGeneric', locale);
    const after = zoneLabel(TZ, afterDstEnd, 'longGeneric', locale);
    expect(before).toBe('Eastern Time (Toronto)');
    expect(after).toBe(before);
  });
});
