import { describe, expect, it, vi } from 'vitest';
import { BOOKING_CALENDAR_ID, BOOKING_RULES, CONFLICT_CALENDAR_IDS } from '../src/config';
import {
  BusyCheckError,
  createBooking,
  getAvailability,
  InvalidSlotError,
  SlotTakenError,
  type BookingDeps,
} from '../src/booking';
import {
  createGoogleCalendarClient,
  type CalendarClient,
  type CalendarEventInput,
} from '../src/google/calendar';
import { zonedTimeToUtc } from '../src/slots';

const toronto = (y: number, m: number, d: number, h: number, min = 0) =>
  zonedTimeToUtc(y, m, d, h, min, 'America/Toronto');
const iso = (ms: number) => new Date(ms).toISOString();
const NOW = toronto(2026, 10, 19, 9);

function mockClient(busyByCalendar: Record<string, { start: string; end: string }[]> = {}) {
  const client = {
    freeBusy: vi.fn(async (ids: string[], _timeMin: string, _timeMax: string) => ({
      calendars: Object.fromEntries(ids.map((id) => [id, { busy: busyByCalendar[id] ?? [] }])),
    })),
    insertEvent: vi.fn(async () => ({
      id: 'evt1',
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
    })),
  } satisfies CalendarClient;
  return client;
}

function deps(calendar: CalendarClient): BookingDeps {
  return {
    calendar,
    rules: BOOKING_RULES,
    bookingCalendarId: BOOKING_CALENDAR_ID,
    conflictCalendarIds: CONFLICT_CALENDAR_IDS,
    now: () => NOW,
    newId: () => 'booking123',
  };
}

const request = {
  start: iso(toronto(2026, 10, 20, 10)),
  name: 'Jordan Lee',
  email: 'jordan@example.com',
  businessName: 'Lee Plumbing',
  problem: 'We miss calls after hours.',
  businessType: 'Trades',
  timeZone: 'America/Toronto',
};

describe('getAvailability', () => {
  it('queries both calendars and removes busy time from either', async () => {
    const client = mockClient({
      [BOOKING_CALENDAR_ID]: [
        { start: iso(toronto(2026, 10, 20, 10)), end: iso(toronto(2026, 10, 20, 10, 30)) },
      ],
      'admin@techshift.ai': [
        { start: iso(toronto(2026, 10, 20, 14)), end: iso(toronto(2026, 10, 20, 15)) },
      ],
    });
    const from = toronto(2026, 10, 20, 0);
    const to = toronto(2026, 10, 20, 23);
    const result = await getAvailability(deps(client), from, to);
    expect(client.freeBusy).toHaveBeenCalledWith(
      CONFLICT_CALENDAR_IDS,
      expect.any(String),
      expect.any(String),
    );
    const starts = result.slots.map((s) => s.start);
    expect(starts).not.toContain(iso(toronto(2026, 10, 20, 10)));
    expect(starts).not.toContain(iso(toronto(2026, 10, 20, 14)));
    expect(starts).toContain(iso(toronto(2026, 10, 20, 11)));
    expect(result.timeZone).toBe('America/Toronto');
    expect(result.durationMinutes).toBe(30);
  });

  it('fails closed when a conflict calendar returns an error', async () => {
    const client = mockClient();
    client.freeBusy.mockResolvedValueOnce({
      calendars: {
        [BOOKING_CALENDAR_ID]: { busy: [] },
        'admin@techshift.ai': { errors: [{ domain: 'global', reason: 'notFound' }] },
      },
    } as never);
    await expect(getAvailability(deps(client))).rejects.toBeInstanceOf(BusyCheckError);
  });

  it('caps the span at the booking window', async () => {
    const client = mockClient();
    const result = await getAvailability(deps(client), NOW, NOW + 90 * 24 * 3600_000);
    const last = Date.parse(result.slots.at(-1)!.start);
    expect(last).toBeLessThanOrEqual(NOW + 30 * 24 * 3600_000);
  });
});

describe('createBooking', () => {
  it('re-checks freeBusy and creates a Meet event with private references', async () => {
    const client = mockClient();
    const result = await createBooking(deps(client), request);

    expect(client.freeBusy).toHaveBeenCalledTimes(1);
    const [ids, timeMin, timeMax] = client.freeBusy.mock.calls[0]!;
    expect(ids).toEqual(CONFLICT_CALENDAR_IDS);
    expect(timeMin).toBe(iso(toronto(2026, 10, 20, 9, 45)));
    expect(timeMax).toBe(iso(toronto(2026, 10, 20, 10, 45)));

    const [calendarId, event] = client.insertEvent.mock.calls[0]! as unknown as [
      string,
      CalendarEventInput,
    ];
    expect(calendarId).toBe(BOOKING_CALENDAR_ID);
    expect(event.attendees).toEqual([{ email: 'jordan@example.com', displayName: 'Jordan Lee' }]);
    expect(event.conferenceData.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
    expect(event.start).toEqual({
      dateTime: '2026-10-20T14:00:00.000Z',
      timeZone: 'America/Toronto',
    });
    expect(event.end.dateTime).toBe('2026-10-20T14:30:00.000Z');
    expect(event.description).toContain('Lee Plumbing');
    expect(event.description).toContain('We miss calls after hours.');
    expect(event.extendedProperties.private).toMatchObject({
      techshiftSource: 'techshift.ai/booking',
      techshiftBookingId: 'booking123',
    });
    // Internal references never leak into guest-visible fields.
    const visible = `${event.summary} ${event.description}`;
    expect(visible).not.toMatch(/techshift(Source|BookingId|CrmMatch)|CLI-|WRK-/);

    expect(result).toEqual({
      bookingId: 'booking123',
      eventId: 'evt1',
      start: '2026-10-20T14:00:00.000Z',
      end: '2026-10-20T14:30:00.000Z',
      meetLink: 'https://meet.google.com/abc-defg-hij',
    });
  });

  it('returns slot taken when the slot was booked since availability loaded', async () => {
    const client = mockClient();
    const d = deps(client);
    const before = await getAvailability(d, toronto(2026, 10, 20, 0), toronto(2026, 10, 20, 23));
    expect(before.slots.map((s) => s.start)).toContain(request.start);

    // Someone books 10:15 to 10:45 on the operations calendar in between.
    client.freeBusy.mockResolvedValueOnce({
      calendars: {
        [BOOKING_CALENDAR_ID]: { busy: [] },
        'admin@techshift.ai': {
          busy: [
            { start: iso(toronto(2026, 10, 20, 10, 15)), end: iso(toronto(2026, 10, 20, 10, 45)) },
          ],
        },
      },
    });
    await expect(createBooking(d, request)).rejects.toBeInstanceOf(SlotTakenError);
    expect(client.insertEvent).not.toHaveBeenCalled();
  });

  it('treats busy time inside the buffer as taken', async () => {
    const client = mockClient({
      [BOOKING_CALENDAR_ID]: [
        { start: iso(toronto(2026, 10, 20, 10, 40)), end: iso(toronto(2026, 10, 20, 11)) },
      ],
    });
    await expect(createBooking(deps(client), request)).rejects.toBeInstanceOf(SlotTakenError);
  });

  it('rejects off-grid, weekend, and too-soon starts without calling Google', async () => {
    const client = mockClient();
    for (const start of [
      toronto(2026, 10, 20, 10, 10),
      toronto(2026, 10, 24, 10),
      toronto(2026, 10, 19, 15),
    ]) {
      await expect(
        createBooking(deps(client), { ...request, start: iso(start) }),
      ).rejects.toBeInstanceOf(InvalidSlotError);
    }
    expect(client.freeBusy).not.toHaveBeenCalled();
  });
});

describe('Google Calendar HTTP client', () => {
  it('creates events with conferenceDataVersion=1 and sendUpdates=all', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: 'x' }), { status: 200 }));
    const client = createGoogleCalendarClient(
      async () => 'token',
      fetchFn as unknown as typeof fetch,
    );
    await client.insertEvent(BOOKING_CALENDAR_ID, {} as never);
    const [url, init] = fetchFn.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(BOOKING_CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=all`,
    );
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token');
  });

  it('sends freeBusy for every conflict calendar', async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ calendars: {} }), { status: 200 }),
    );
    const client = createGoogleCalendarClient(
      async () => 'token',
      fetchFn as unknown as typeof fetch,
    );
    await client.freeBusy(CONFLICT_CALENDAR_IDS, 'a', 'b');
    const body = JSON.parse(
      (fetchFn.mock.calls[0]! as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.items).toEqual(CONFLICT_CALENDAR_IDS.map((id) => ({ id })));
  });
});
