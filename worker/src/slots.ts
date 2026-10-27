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

/** A calendar event that might be an "Open for consultations" window. */
export interface WindowEvent {
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
}

export interface SlotQuery {
  rules: BookingRules;
  now: number;
  /** Optional narrower range, epoch ms. Clamped to notice and window. */
  from?: number;
  to?: number;
  /** Busy blocks from every conflict calendar. Buffers are applied here. */
  busy?: Interval[];
  /** Absolute windows from the Operations calendar. Slots exist only inside these. */
  windows?: Interval[];
}

/** Earliest and latest allowed slot start for a given moment. */
export function bookingWindow(rules: BookingRules, now: number): Interval {
  return { start: now + rules.minNoticeMin * MINUTE, end: now + rules.windowDays * DAY };
}

const OPEN_WINDOW_TITLE = 'open for consultations';

export function isOpenWindowTitle(summary: string | undefined): boolean {
  return (summary ?? '').trim().toLowerCase() === OPEN_WINDOW_TITLE;
}

function atLocalMinutes(
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
  timeZone: string,
): number {
  const dayDelta = Math.floor(minuteOfDay / 1440);
  const mins = minuteOfDay - dayDelta * 1440;
  return zonedTimeToUtc(year, month, day + dayDelta, Math.floor(mins / 60), mins % 60, timeZone);
}

/** True when the instant is a whole minute on the step grid in the business time zone. */
export function isOnGrid(ms: number, rules: BookingRules): boolean {
  const p = localParts(ms, rules.timeZone);
  if (p.second !== 0) return false;
  return (p.hour * 60 + p.minute) % rules.stepMin === 0;
}

function alignUp(ms: number, rules: BookingRules): number {
  if (isOnGrid(ms, rules)) return ms;
  const p = localParts(ms, rules.timeZone);
  let total = p.hour * 60 + p.minute;
  if (p.second > 0) total += 1;
  const rounded = Math.ceil(total / rules.stepMin) * rules.stepMin;
  return atLocalMinutes(p.year, p.month, p.day, rounded, rules.timeZone);
}

function addStep(ms: number, rules: BookingRules): number {
  const p = localParts(ms, rules.timeZone);
  return atLocalMinutes(
    p.year,
    p.month,
    p.day,
    p.hour * 60 + p.minute + rules.stepMin,
    rules.timeZone,
  );
}

function eventInterval(event: WindowEvent, timeZone: string): Interval | undefined {
  if (event.start?.dateTime && event.end?.dateTime) {
    const start = Date.parse(event.start.dateTime);
    const end = Date.parse(event.end.dateTime);
    if (Number.isNaN(start) || Number.isNaN(end)) return undefined;
    return { start, end };
  }
  if (event.start?.date && event.end?.date) {
    const [ys, ms, ds] = event.start.date.split('-').map(Number);
    const [ye, me, de] = event.end.date.split('-').map(Number);
    if (!ys || !ms || !ds || !ye || !me || !de) return undefined;
    const zone = event.start.timeZone || timeZone;
    return {
      start: zonedTimeToUtc(ys, ms, ds, 0, 0, zone),
      end: zonedTimeToUtc(ye, me, de, 0, 0, zone),
    };
  }
  return undefined;
}

/** Windows whose title is exactly "Open for consultations". Cancelled events are ignored. */
export function windowsFromEvents(events: WindowEvent[], timeZone: string): Interval[] {
  const windows: Interval[] = [];
  for (const event of events) {
    if (event.status === 'cancelled') continue;
    if (!isOpenWindowTitle(event.summary)) continue;
    const interval = eventInterval(event, timeZone);
    if (!interval || interval.end <= interval.start) continue;
    windows.push(interval);
  }
  return windows;
}

/**
 * Drops busy blocks that are the open-window events themselves. Those events are created as
 * transparent, so freeBusy should already ignore them. This is a guard if one comes back busy.
 */
export function excludeOpenWindows(busy: Interval[], windows: Interval[]): Interval[] {
  return busy.filter(
    (block) => !windows.some((window) => window.start === block.start && window.end === block.end),
  );
}

/** Notice and the 30-day cap, and a start that lands on the 30-minute clock. Windows are separate. */
export function isOnBookingGrid(rules: BookingRules, now: number, start: number): boolean {
  const window = bookingWindow(rules, now);
  if (start < window.start || start > window.end) return false;
  return isOnGrid(start, rules);
}

/**
 * Open slots, sorted by start. A slot is a 30-minute block fully inside an open window, on the
 * clock grid, inside the notice and booking window, and clear of busy time plus the buffer.
 */
export function generateSlots({
  rules,
  now,
  from,
  to,
  busy = [],
  windows = [],
}: SlotQuery): Slot[] {
  const window = bookingWindow(rules, now);
  const earliest = Math.max(window.start, from ?? -Infinity);
  const latest = Math.min(window.end, to ?? Infinity);
  if (earliest > latest) return [];

  const duration = rules.durationMin * MINUTE;
  const buffer = rules.bufferMin * MINUTE;
  const blocked = busy.map((block) => ({ start: block.start - buffer, end: block.end + buffer }));
  const seen = new Set<number>();
  const slots: Slot[] = [];

  for (const open of windows) {
    if (open.end - open.start < duration) continue;
    let start = alignUp(open.start, rules);
    for (let guard = 0; guard < 5000 && start + duration <= open.end; guard++) {
      if (start >= earliest && start <= latest && !seen.has(start)) {
        const end = start + duration;
        if (!blocked.some((block) => block.start < end && block.end > start)) {
          seen.add(start);
          slots.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
        }
      }
      const next = addStep(start, rules);
      if (next <= start) break;
      start = next;
    }
  }
  slots.sort((a, b) => (a.start < b.start ? -1 : 1));
  return slots;
}

/** True when a start is on the grid, inside the notice window, and fully inside an open window. */
export function isValidSlotStart(
  rules: BookingRules,
  now: number,
  start: number,
  windows: Interval[] = [],
): boolean {
  if (!isOnBookingGrid(rules, now, start)) return false;
  const duration = rules.durationMin * MINUTE;
  return windows.some((window) => start >= window.start && start + duration <= window.end);
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
