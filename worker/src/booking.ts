import { OPERATIONS_CALENDAR_ID, type BookingRules } from './config';
import type { CalendarClient, CalendarEventInput, FreeBusyResponse } from './google/calendar';
import {
  excludeOpenWindows,
  generateSlots,
  isOnBookingGrid,
  isValidSlotStart,
  windowsFromEvents,
  type Interval,
  type Slot,
} from './slots';
import { ISSUE_LABELS, type BookingRequest } from './validate';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export interface BookingDeps {
  calendar: CalendarClient;
  rules: BookingRules;
  bookingCalendarId: string;
  conflictCalendarIds: string[];
  now: () => number;
  newId: () => string;
}

/** A conflict calendar could not be read. Fail closed: never offer or book unverified time. */
export class BusyCheckError extends Error {}
export class SlotTakenError extends Error {}
export class InvalidSlotError extends Error {}

function collectBusy(res: FreeBusyResponse, calendarIds: string[]): Interval[] {
  const busy: Interval[] = [];
  for (const id of calendarIds) {
    const cal = res.calendars?.[id];
    if (!cal || (cal.errors && cal.errors.length > 0)) {
      throw new BusyCheckError(
        `freeBusy failed for a conflict calendar: ${cal?.errors?.[0]?.reason ?? 'missing'}`,
      );
    }
    for (const b of cal.busy ?? [])
      busy.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
  }
  return busy;
}

async function busyBetween(deps: BookingDeps, from: number, to: number): Promise<Interval[]> {
  const res = await deps.calendar.freeBusy(
    deps.conflictCalendarIds,
    new Date(from).toISOString(),
    new Date(to).toISOString(),
  );
  return collectBusy(res, deps.conflictCalendarIds);
}

async function openWindows(deps: BookingDeps, from: number, to: number): Promise<Interval[]> {
  try {
    const events = await deps.calendar.listEvents(
      OPERATIONS_CALENDAR_ID,
      new Date(from).toISOString(),
      new Date(to).toISOString(),
    );
    return windowsFromEvents(events, deps.rules.timeZone);
  } catch (err) {
    throw new BusyCheckError(err instanceof Error ? err.message : 'events.list failed');
  }
}

export interface AvailabilityResult {
  timeZone: string;
  durationMinutes: number;
  slots: Slot[];
}

/** Open slots between from and to (epoch ms), clamped to notice, window, and a 31-day span. */
export async function getAvailability(
  deps: BookingDeps,
  from?: number,
  to?: number,
): Promise<AvailabilityResult> {
  const now = deps.now();
  const start = Math.max(from ?? now, now + deps.rules.minNoticeMin * MINUTE);
  const end = Math.min(to ?? Infinity, now + deps.rules.windowDays * DAY, start + 31 * DAY);
  const base = { timeZone: deps.rules.timeZone, durationMinutes: deps.rules.durationMin };
  if (start >= end) return { ...base, slots: [] };

  const buffer = deps.rules.bufferMin * MINUTE;
  const windows = await openWindows(
    deps,
    start - buffer,
    end + deps.rules.durationMin * MINUTE + buffer,
  );
  const busy = excludeOpenWindows(
    await busyBetween(deps, start - buffer, end + deps.rules.durationMin * MINUTE + buffer),
    windows,
  );
  return {
    ...base,
    slots: generateSlots({ rules: deps.rules, now, from: start, to: end, busy, windows }),
  };
}

function describe(req: BookingRequest): string {
  const lines = [
    'Free consultation booked on techshift.ai.',
    '',
    `Name: ${req.name}`,
    `Email: ${req.email}`,
    `Business: ${req.businessName}`,
  ];
  if (req.businessType) lines.push(`Business type: ${req.businessType}`);
  if (req.website) lines.push(`Website: ${req.website}`);
  if (req.phone) lines.push(`Phone: ${req.phone}`);
  if (req.timeZone) lines.push(`Visitor time zone: ${req.timeZone}`);
  lines.push('', `Topic: ${ISSUE_LABELS[req.issue]}`);
  if (req.problem) lines.push('', 'Notes:', req.problem);
  return lines.join('\n');
}

export interface BookingResult {
  bookingId: string;
  eventId: string;
  start: string;
  end: string;
  meetLink?: string;
}

/**
 * Re-checks both calendars for the exact slot (with buffers) right before inserting, so a slot
 * taken since the visitor loaded availability returns SlotTakenError (HTTP 409).
 */
export async function createBooking(
  deps: BookingDeps,
  req: BookingRequest,
): Promise<BookingResult> {
  const now = deps.now();
  const start = Date.parse(req.start);
  const end = start + deps.rules.durationMin * MINUTE;
  const buffer = deps.rules.bufferMin * MINUTE;
  // Off-grid and too-soon starts fail before any calendar read.
  if (!isOnBookingGrid(deps.rules, now, start)) throw new InvalidSlotError('Not a bookable slot');
  const windows = await openWindows(deps, start - DAY, end + DAY);
  if (!isValidSlotStart(deps.rules, now, start, windows)) {
    throw new InvalidSlotError('Not a bookable slot');
  }
  const busy = excludeOpenWindows(await busyBetween(deps, start - buffer, end + buffer), windows);
  if (busy.some((b) => b.start < end + buffer && b.end > start - buffer)) {
    throw new SlotTakenError('Slot no longer available');
  }

  const bookingId = deps.newId();
  const event: CalendarEventInput = {
    summary: `Techshift consultation: ${req.businessName}`,
    description: describe(req),
    start: { dateTime: new Date(start).toISOString(), timeZone: deps.rules.timeZone },
    end: { dateTime: new Date(end).toISOString(), timeZone: deps.rules.timeZone },
    attendees: [{ email: req.email, displayName: req.name }],
    conferenceData: {
      createRequest: { requestId: bookingId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    },
    // Private properties are visible only on the organizer's copy, never to guests.
    // CRM matching later adds techshiftCompanyId (CLI-####) and techshiftWorkId (WRK-####).
    extendedProperties: {
      private: {
        techshiftSource: 'techshift.ai/booking',
        techshiftBookingId: bookingId,
        techshiftCrmMatch: 'pending',
      },
    },
    guestsCanInviteOthers: false,
    guestsCanSeeOtherGuests: false,
  };

  const created = await deps.calendar.insertEvent(deps.bookingCalendarId, event);
  return {
    bookingId,
    eventId: created.id,
    start: event.start.dateTime,
    end: event.end.dateTime,
    meetLink: created.hangoutLink,
  };
}
