import type { TokenProvider } from './auth';

const API = 'https://www.googleapis.com/calendar/v3';

export interface FreeBusyResponse {
  calendars: Record<
    string,
    { busy?: { start: string; end: string }[]; errors?: { domain: string; reason: string }[] }
  >;
}

export interface CalendarEventInput {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: { email: string; displayName?: string }[];
  conferenceData: {
    createRequest: { requestId: string; conferenceSolutionKey: { type: 'hangoutsMeet' } };
  };
  extendedProperties: { private: Record<string, string> };
  guestsCanInviteOthers?: boolean;
  guestsCanSeeOtherGuests?: boolean;
}

export interface CreatedEvent {
  id: string;
  htmlLink?: string;
  hangoutLink?: string;
}

/** The two Calendar API calls the booking flow needs. Mocked in tests and local dev. */
export interface CalendarClient {
  freeBusy(calendarIds: string[], timeMin: string, timeMax: string): Promise<FreeBusyResponse>;
  insertEvent(calendarId: string, event: CalendarEventInput): Promise<CreatedEvent>;
}

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function createGoogleCalendarClient(
  getToken: TokenProvider,
  fetchFn: typeof fetch = fetch,
): CalendarClient {
  const call = async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetchFn(`${API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new GoogleApiError(res.status, `Calendar API ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  };

  return {
    freeBusy: (calendarIds, timeMin, timeMax) =>
      call('/freeBusy', { timeMin, timeMax, items: calendarIds.map((id) => ({ id })) }),
    insertEvent: (calendarId, event) =>
      call(
        `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
        event,
      ),
  };
}

/** In-memory calendar for local development (GOOGLE_AUTH_MODE=mock). Never used in production. */
export function createMockCalendarClient(
  initialBusy: { start: string; end: string }[] = [],
): CalendarClient & { events: CalendarEventInput[] } {
  const events: CalendarEventInput[] = [];
  const busy = [...initialBusy];
  return {
    events,
    async freeBusy(calendarIds, timeMin, timeMax) {
      const inRange = busy.filter((b) => b.end > timeMin && b.start < timeMax);
      return { calendars: Object.fromEntries(calendarIds.map((id) => [id, { busy: inRange }])) };
    },
    async insertEvent(_calendarId, event) {
      events.push(event);
      busy.push({ start: event.start.dateTime, end: event.end.dateTime });
      const id = `mock${events.length}`;
      return { id, hangoutLink: `https://meet.google.com/mock-${id}` };
    },
  };
}
