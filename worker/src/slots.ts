import type { BookingRules } from './config';

export interface Interval {
  /** Epoch milliseconds, inclusive. */
  start: number;
  /** Epoch milliseconds, exclusive. */
  end: number;
}

export interface Slot {
  /** UTC ISO 8601, for example 2026-11-02T15:00:00.000Z */
  start: string;
  end: string;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Wall-clock parts of an instant in a time zone. */
export function localParts(ms: number, timeZone: string): LocalParts {
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year!,
    month: out.month!,
    day: out.day!,
    hour: out.hour!,
    minute: out.minute!,
    second: out.second!,
  };
}

/** Offset of a time zone from UTC at an instant, in milliseconds (Toronto in winter is -5h). */
export function zoneOffsetMs(ms: number, timeZone: string): number {
  const p = localParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** UTC instant for a wall-clock time in a zone. Correct across DST changes outside the gap hour. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - zoneOffsetMs(guess, timeZone);
  return guess - zoneOffsetMs(first, timeZone);
}

function parseHm(value: string): [number, number] {
  const [h, m] = value.split(':').map(Number);
  return [h!, m!];
}

/** ISO weekday (1 Monday to 7 Sunday) of a calendar date. */
function isoWeekday(year: number, month: number, day: number): number {
  const d = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return d === 0 ? 7 : d;
}

export interface SlotQuery {
  rules: BookingRules;
  now: number;
  /** Optional narrower range, epoch ms. Clamped to notice and window. */
  from?: number;
  to?: number;
  /** Busy blocks from every conflict calendar. Buffers are applied here. */
  busy?: Interval[];
}

/** Earliest and latest allowed slot start for a given moment. */
export function bookingWindow(rules: BookingRules, now: number): Interval {
  return { start: now + rules.minNoticeMin * MINUTE, end: now + rules.windowDays * DAY };
}

/**
 * Open slots, sorted by start. A slot is open when it is on a business day, fits inside business
 * hours, starts after the minimum notice and inside the booking window, and does not touch any
 * busy block widened by the buffer on both sides.
 */
export function generateSlots({ rules, now, from, to, busy = [] }: SlotQuery): Slot[] {
  const window = bookingWindow(rules, now);
  const earliest = Math.max(window.start, from ?? -Infinity);
  const latest = Math.min(window.end, to ?? Infinity);
  if (earliest > latest) return [];

  const duration = rules.durationMin * MINUTE;
  const step = rules.stepMin * MINUTE;
  const buffer = rules.bufferMin * MINUTE;
  const [startH, startM] = parseHm(rules.dayStart);
  const [endH, endM] = parseHm(rules.dayEnd);
  const blocked = busy.map((b) => ({ start: b.start - buffer, end: b.end + buffer }));

  // Walk local calendar days from the day before earliest to the day after latest.
  const first = localParts(earliest - DAY, rules.timeZone);
  const lastDayCount = Math.ceil((latest - earliest) / DAY) + 3;
  const slots: Slot[] = [];

  for (let i = 0; i < lastDayCount; i++) {
    const date = new Date(Date.UTC(first.year, first.month - 1, first.day + i));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    if (!rules.weekdays.includes(isoWeekday(y, m, d))) continue;

    const open = zonedTimeToUtc(y, m, d, startH, startM, rules.timeZone);
    const close = zonedTimeToUtc(y, m, d, endH, endM, rules.timeZone);

    for (let start = open; start + duration <= close; start += step) {
      if (start < earliest || start > latest) continue;
      const end = start + duration;
      if (blocked.some((b) => b.start < end && b.end > start)) continue;
      slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    }
  }
  return slots;
}

/** True when a start time is on the slot grid and inside the rules, ignoring busy blocks. */
export function isValidSlotStart(rules: BookingRules, now: number, start: number): boolean {
  const iso = new Date(start).toISOString();
  return generateSlots({ rules, now, from: start, to: start }).some((s) => s.start === iso);
}

/** Groups UTC slots by the visitor's local date (YYYY-MM-DD), for display in their own zone. */
export function groupByLocalDate(slots: Slot[], timeZone: string): Map<string, Slot[]> {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const p = localParts(Date.parse(slot.start), timeZone);
    const key = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
    const list = groups.get(key) ?? [];
    list.push(slot);
    groups.set(key, list);
  }
  return groups;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
