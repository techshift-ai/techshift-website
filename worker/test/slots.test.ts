import { describe, expect, it } from 'vitest';
import { BOOKING_RULES } from '../src/config';
import {
  excludeOpenWindows,
  generateSlots,
  groupByLocalDate,
  isValidSlotStart,
  localParts,
  windowsFromEvents,
  zonedTimeToUtc,
  type Interval,
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
const open = (y: number, m: number, d: number, sh = 10, sm = 0, eh = 16, em = 0): Interval => ({
  start: toronto(y, m, d, sh, sm),
  end: toronto(y, m, d, eh, em),
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

describe('windowsFromEvents', () => {
  it('keeps an exact title after trim and case folding, and skips other events', () => {
    const windows = windowsFromEvents(
      [
        {
          summary: '  Open for consultations ',
          start: { dateTime: '2026-10-20T14:00:00.000Z' },
          end: { dateTime: '2026-10-20T20:00:00.000Z' },
        },
        {
          summary: 'OPEN FOR CONSULTATIONS',
          status: 'cancelled',
          start: { dateTime: '2026-10-21T14:00:00.000Z' },
          end: { dateTime: '2026-10-21T20:00:00.000Z' },
        },
        {
          summary: 'Team standup',
          start: { dateTime: '2026-10-21T15:00:00.000Z' },
          end: { dateTime: '2026-10-21T15:30:00.000Z' },
        },
      ],
      TZ,
    );
    expect(windows).toEqual([
      { start: at('2026-10-20T14:00:00.000Z'), end: at('2026-10-20T20:00:00.000Z') },
    ]);
  });
});

describe('generateSlots', () => {
  // Monday 2026-10-19 09:00 Toronto (EDT).
  const now = toronto(2026, 10, 19, 9);
  const tuesday = [open(2026, 10, 20)];

  it('offers 30-minute slots fully inside a window, on the half-hour clock', () => {
    const slots = onDay(generateSlots({ rules, now, windows: tuesday }), '2026-10-20');
    expect(slots).toHaveLength(12);
    expect(slots[0]).toEqual({
      start: '2026-10-20T14:00:00.000Z',
      end: '2026-10-20T14:30:00.000Z',
    });
    expect(slots.at(-1)).toEqual({
      start: '2026-10-20T19:30:00.000Z',
      end: '2026-10-20T20:00:00.000Z',
    });
  });

  it('offers nothing where no window was published, including a weekend', () => {
    const slots = generateSlots({ rules, now, windows: tuesday });
    expect(onDay(slots, '2026-10-24')).toHaveLength(0);
    expect(onDay(slots, '2026-10-21')).toHaveLength(0);
  });

  it('offers a weekend when an open window is published that day', () => {
    const slots = onDay(generateSlots({ rules, now, windows: [open(2026, 10, 24)] }), '2026-10-24');
    expect(slots).toHaveLength(12);
    expect(slots[0]!.start).toBe(new Date(toronto(2026, 10, 24, 10)).toISOString());
  });

  it('starts on the next grid line when the window does not', () => {
    const slots = generateSlots({
      rules,
      now,
      windows: [{ start: toronto(2026, 10, 20, 10, 7), end: toronto(2026, 10, 20, 11, 40) }],
    });
    expect(slots.map((s) => s.start)).toEqual([
      new Date(toronto(2026, 10, 20, 10, 30)).toISOString(),
      new Date(toronto(2026, 10, 20, 11)).toISOString(),
    ]);
  });

  it('enforces the 24-hour minimum notice', () => {
    const lateMorning = toronto(2026, 10, 19, 12, 10);
    const slots = generateSlots({
      rules,
      now: lateMorning,
      windows: [open(2026, 10, 19), open(2026, 10, 20)],
    });
    expect(onDay(slots, '2026-10-19')).toHaveLength(0);
    expect(slots[0]!.start).toBe(new Date(toronto(2026, 10, 20, 12, 30)).toISOString());
  });

  it('a slot exactly 24 hours out is allowed', () => {
    const slots = generateSlots({
      rules,
      now: toronto(2026, 10, 19, 10),
      windows: [open(2026, 10, 20)],
    });
    expect(slots[0]!.start).toBe(new Date(toronto(2026, 10, 20, 10)).toISOString());
  });

  it('stays inside the 30-day window', () => {
    const windows = Array.from({ length: 40 }, (_, i) => {
      const date = new Date(Date.UTC(2026, 9, 19 + i));
      return open(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    });
    const slots = generateSlots({ rules, now, windows });
    const limit = now + 30 * 24 * 3600_000;
    expect(Math.max(...slots.map((s) => Date.parse(s.start)))).toBeLessThanOrEqual(limit);
    expect(onDay(slots, '2026-11-18')).toHaveLength(0);
  });

  it('applies a 15-minute buffer on both sides of busy time', () => {
    const busy = [{ start: toronto(2026, 10, 20, 11), end: toronto(2026, 10, 20, 11, 30) }];
    const starts = onDay(generateSlots({ rules, now, busy, windows: tuesday }), '2026-10-20').map(
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
    const busy = [{ start: toronto(2026, 10, 20, 11), end: toronto(2026, 10, 20, 11, 15) }];
    const starts = onDay(generateSlots({ rules, now, busy, windows: tuesday }), '2026-10-20').map(
      (s) => s.start,
    );
    const iso = (h: number, m: number) => new Date(toronto(2026, 10, 20, h, m)).toISOString();
    expect(starts).not.toContain(iso(11, 0));
    expect(starts).not.toContain(iso(10, 30));
    expect(starts).toContain(iso(11, 30));
  });

  it('does not treat the open window itself as busy', () => {
    const windows = [open(2026, 10, 20)];
    const busy = excludeOpenWindows(windows, windows);
    expect(onDay(generateSlots({ rules, now, busy, windows }), '2026-10-20')).toHaveLength(12);
  });

  it('keeps local start times across the fall-back DST change', () => {
    const slots = generateSlots({
      rules,
      now: toronto(2026, 10, 28, 9),
      windows: [open(2026, 10, 30), open(2026, 11, 2)],
    });
    const friday = onDay(slots, '2026-10-30');
    const monday = onDay(slots, '2026-11-02');
    expect(friday).toHaveLength(12);
    expect(monday).toHaveLength(12);
    expect(friday[0]!.start).toBe('2026-10-30T14:00:00.000Z');
    expect(monday[0]!.start).toBe('2026-11-02T15:00:00.000Z');
    expect(monday.at(-1)!.end).toBe('2026-11-02T21:00:00.000Z');
  });

  it('respects a narrower from and to range', () => {
    const from = toronto(2026, 10, 21, 0);
    const to = toronto(2026, 10, 21, 23, 59);
    const slots = generateSlots({
      rules,
      now,
      from,
      to,
      windows: [open(2026, 10, 20), open(2026, 10, 21)],
    });
    expect(slots).toHaveLength(12);
    expect(onDay(slots, '2026-10-21')).toHaveLength(12);
  });
});

describe('visitor time zones', () => {
  const now = toronto(2026, 10, 19, 9);
  const slots = generateSlots({ rules, now, windows: [open(2026, 10, 20)] });

  it('returns the same UTC slots regardless of who asks', () => {
    expect(slots.every((s) => s.start.endsWith('Z'))).toBe(true);
  });

  it('shows Vancouver visitors the same slot three hours earlier', () => {
    const first = onDay(slots, '2026-10-20', 'America/Vancouver')[0]!;
    expect(localParts(Date.parse(first.start), 'America/Vancouver').hour).toBe(7);
  });

  it('moves late Toronto slots to the next day for Tokyo visitors', () => {
    const groups = groupByLocalDate(slots, 'Asia/Tokyo');
    expect(groups.get('2026-10-20')!.map((s) => s.start)).toEqual([
      '2026-10-20T14:00:00.000Z',
      '2026-10-20T14:30:00.000Z',
    ]);
    const wednesdayTokyo = groups.get('2026-10-21')!;
    expect(wednesdayTokyo[0]!.start).toBe('2026-10-20T15:00:00.000Z');
    expect(wednesdayTokyo.map((s) => s.start)).toContain('2026-10-20T19:30:00.000Z');
  });
});

describe('isValidSlotStart', () => {
  const now = toronto(2026, 10, 19, 9);
  const windows = [open(2026, 10, 20)];
  it('accepts grid slots inside a window and rejects everything else', () => {
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 20, 10), windows)).toBe(true);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 20, 15, 30), windows)).toBe(true);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 20, 10, 15), windows)).toBe(false);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 20, 16), windows)).toBe(false);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 24, 10), windows)).toBe(false);
    expect(isValidSlotStart(rules, now, toronto(2026, 10, 19, 14), windows)).toBe(false);
    expect(isValidSlotStart(rules, now, toronto(2026, 11, 19, 10), windows)).toBe(false);
  });
});
