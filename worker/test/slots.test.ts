import { describe, expect, it } from 'vitest';
import { BOOKING_RULES } from '../src/config';
import {
  generateSlots,
  groupByLocalDate,
  isValidSlotStart,
  localParts,
  zonedTimeToUtc,
} from '../src/slots';

const rules = BOOKING_RULES;
const TZ = 'America/Toronto';
const at = (iso: string) => Date.parse(iso);
const toronto = (y: number, m: number, d: number, h: number, min = 0) =>
  zonedTimeToUtc(y, m, d, h, min, TZ);
const onDay = <T extends { start: string }>(slots: T[], isoDate: string, tz = TZ): T[] =>
  slots.filter((s) => {
    const p = localParts(Date.parse(s.start), tz);
    return (
      `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` === isoDate
    );
  });

describe('time zone conversion', () => {
  it('converts Toronto wall time to UTC on both sides of DST', () => {
    expect(new Date(toronto(2026, 10, 30, 10)).toISOString()).toBe('2026-10-30T14:00:00.000Z');
    expect(new Date(toronto(2026, 11, 1, 10)).toISOString()).toBe('2026-11-01T15:00:00.000Z');
    expect(new Date(toronto(2026, 11, 2, 10)).toISOString()).toBe('2026-11-02T15:00:00.000Z');
    expect(new Date(toronto(2026, 3, 6, 10)).toISOString()).toBe('2026-03-06T15:00:00.000Z');
    expect(new Date(toronto(2026, 3, 9, 10)).toISOString()).toBe('2026-03-09T14:00:00.000Z');
  });
});

describe('generateSlots', () => {
  // Monday 2026-10-19 09:00 Toronto (EDT).
  const now = toronto(2026, 10, 19, 9);

  it('offers 30-minute slots from 10:00 to 15:30 on weekdays, ending by 16:00', () => {
    const tuesday = onDay(generateSlots({ rules, now }), '2026-10-20');
    expect(tuesday).toHaveLength(12);
    expect(tuesday[0]).toEqual({
      start: '2026-10-20T14:00:00.000Z',
      end: '2026-10-20T14:30:00.000Z',
    });
    expect(tuesday.at(-1)).toEqual({
      start: '2026-10-20T19:30:00.000Z',
      end: '2026-10-20T20:00:00.000Z',
    });
  });

  it('never offers weekends', () => {
    const slots = generateSlots({ rules, now });
    expect(onDay(slots, '2026-10-24')).toHaveLength(0);
    expect(onDay(slots, '2026-10-25')).toHaveLength(0);
    for (const s of slots) {
      const day = new Date(Date.parse(s.start) - 4 * 3600_000).getUTCDay();
      expect([0, 6]).not.toContain(day);
    }
  });

  it('enforces the 24-hour minimum notice', () => {
    const lateMorning = toronto(2026, 10, 19, 12, 10);
    const slots = generateSlots({ rules, now: lateMorning });
    expect(onDay(slots, '2026-10-19')).toHaveLength(0);
    expect(slots[0]!.start).toBe(new Date(toronto(2026, 10, 20, 12, 30)).toISOString());
  });

  it('a slot exactly 24 hours out is allowed', () => {
    const slots = generateSlots({ rules, now: toronto(2026, 10, 19, 10) });
    expect(slots[0]!.start).toBe(new Date(toronto(2026, 10, 20, 10)).toISOString());
  });

  it('stays inside the 30-day window', () => {
    const slots = generateSlots({ rules, now });
    const limit = now + 30 * 24 * 3600_000;
    expect(Math.max(...slots.map((s) => Date.parse(s.start)))).toBeLessThanOrEqual(limit);
    // Day 30 is Wednesday 2026-11-18; 09:00 cutoff means nothing on that day.
    expect(onDay(slots, '2026-11-17')).toHaveLength(12);
    expect(onDay(slots, '2026-11-18')).toHaveLength(0);
  });

  it('applies a 15-minute buffer on both sides of busy time', () => {
    const busy = [{ start: toronto(2026, 10, 20, 11), end: toronto(2026, 10, 20, 11, 30) }];
    const starts = onDay(generateSlots({ rules, now, busy }), '2026-10-20').map(
      (s) =>
        localParts(Date.parse(s.start), TZ).hour * 100 + localParts(Date.parse(s.start), TZ).minute,
    );
    expect(starts).toContain(1000);
    expect(starts).not.toContain(1030);
    expect(starts).not.toContain(1100);
    expect(starts).not.toContain(1130);
    expect(starts).toContain(1200);
  });

  it('treats the buffer edge as exclusive', () => {
    // Busy 11:00 to 11:15 blocks 10:45 to 11:30, so 11:30 is still open.
    const busy = [{ start: toronto(2026, 10, 20, 11), end: toronto(2026, 10, 20, 11, 15) }];
    const tuesday = onDay(generateSlots({ rules, now, busy }), '2026-10-20');
    const iso = (h: number, m: number) => new Date(toronto(2026, 10, 20, h, m)).toISOString();
    const starts = tuesday.map((s) => s.start);
    expect(starts).not.toContain(iso(11, 0));
    expect(starts).not.toContain(iso(10, 30));
    expect(starts).toContain(iso(11, 30));
  });

  it('blocks a whole day for an all-day busy block', () => {
    const busy = [{ start: at('2026-10-21T04:00:00Z'), end: at('2026-10-22T04:00:00Z') }];
    expect(onDay(generateSlots({ rules, now, busy }), '2026-10-21')).toHaveLength(0);
  });

  it('keeps 10:00 local across the fall-back DST change', () => {
    const slots = generateSlots({ rules, now: toronto(2026, 10, 28, 9) });
    const friday = onDay(slots, '2026-10-30');
    const monday = onDay(slots, '2026-11-02');
    expect(friday).toHaveLength(12);
    expect(monday).toHaveLength(12);
    expect(friday[0]!.start).toBe('2026-10-30T14:00:00.000Z');
    expect(monday[0]!.start).toBe('2026-11-02T15:00:00.000Z');
    expect(monday.at(-1)!.end).toBe('2026-11-02T21:00:00.000Z');
  });

  it('keeps 10:00 local across the spring-forward DST change', () => {
    const slots = generateSlots({ rules, now: toronto(2026, 3, 4, 9) });
    expect(onDay(slots, '2026-03-06')[0]!.start).toBe('2026-03-06T15:00:00.000Z');
    expect(onDay(slots, '2026-03-09')[0]!.start).toBe('2026-03-09T14:00:00.000Z');
    expect(onDay(slots, '2026-03-09')).toHaveLength(12);
  });

  it('respects a narrower from and to range', () => {
    const from = toronto(2026, 10, 21, 0);
    const to = toronto(2026, 10, 21, 23, 59);
    const slots = generateSlots({ rules, now, from, to });
    expect(slots).toHaveLength(12);
    expect(onDay(slots, '2026-10-21')).toHaveLength(12);
  });
});

describe('visitor time zones', () => {
  const now = toronto(2026, 10, 19, 9);
  const slots = generateSlots({ rules, now });

  it('returns the same UTC slots regardless of who asks', () => {
    expect(slots.every((s) => s.start.endsWith('Z'))).toBe(true);
  });

  it('shows Vancouver visitors the same slot three hours earlier', () => {
    const first = onDay(slots, '2026-10-20', 'America/Vancouver')[0]!;
    expect(localParts(Date.parse(first.start), 'America/Vancouver').hour).toBe(7);
  });

  it('moves late Toronto slots to the next day for Tokyo visitors', () => {
    const groups = groupByLocalDate(slots, 'Asia/Tokyo');
    // Toronto Tue 10:00 and 10:30 EDT are Tue 23:00 and 23:30 in Tokyo; Tue 11:00 is Wed 00:00.
    expect(groups.get('2026-10-20')!.map((s) => s.start)).toEqual([
      '2026-10-20T14:00:00.000Z',
      '2026-10-20T14:30:00.000Z',
    ]);
    const wednesdayTokyo = groups.get('2026-10-21')!;
    expect(wednesdayTokyo[0]!.start).toBe('2026-10-20T15:00:00.000Z');
    expect(wednesdayTokyo.map((s) => s.start)).toContain('2026-10-20T19:30:00.000Z');
  });

  it('handles the week when London has left DST but Toronto has not', () => {
    // 2026-10-26 to 2026-10-30: London is GMT, Toronto is still EDT, so the gap is 4 hours.
    const groups = groupByLocalDate(slots, 'Europe/London');
    const first = groups.get('2026-10-27')![0]!;
    expect(localParts(Date.parse(first.start), 'Europe/London').hour).toBe(14);
  });
});

describe('isValidSlotStart', () => {
  const now = toronto(2026, 10, 19, 9);
  it('accepts grid slots and rejects everything else', () => {
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 20, 10))).toBe(true);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 20, 15, 30))).toBe(true);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 20, 10, 15))).toBe(false);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 20, 16))).toBe(false);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 24, 10))).toBe(false);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 19, 14))).toBe(false);
    expect(isValidSlotStart(rules, now, toronto(2026, 11, 19, 10))).toBe(false);
  });
});
