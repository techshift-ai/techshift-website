import type { TokenProvider } from './auth';
import { localParts, zonedTimeToUtc } from '../slots';

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

export interface CalendarListEvent {
  id?: string;
  status?: string;
  summary?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
}

/** Calendar calls the booking flow needs. Mocked in tests and local dev. */
export interface CalendarClient {
  freeBusy(calendarIds: string[], timeMin: string, timeMax: string): Promise<FreeBusyResponse>;
  /** Events overlapping the range. Callers filter titles. A read failure throws. */
  listEvents(calendarId: string, timeMin: string, timeMax: string): Promise<CalendarListEvent[]>;
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
  const request = async <T>(path: string, init: RequestInit): Promise<T> => {
    const res = await fetchFn(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) throw new GoogleApiError(res.status, `Calendar API ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  };

  return {
    freeBusy: (calendarIds, timeMin, timeMax) =>
      request('/freeBusy', {
        method: 'POST',
        body: JSON.stringify({ timeMin, timeMax, items: calendarIds.map((id) => ({ id })) }),
      }),
    async listEvents(calendarId, timeMin, timeMax) {
      const items: CalendarListEvent[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < 10; page++) {
        const params = new URLSearchParams({
          singleEvents: 'true',
          orderBy: 'startTime',
          timeMin,
          timeMax,
          maxResults: '250',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const data = await request<{ items?: CalendarListEvent[]; nextPageToken?: string }>(
          `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
          { method: 'GET' },
        );
        items.push(...(data.items ?? []));
        pageToken = data.nextPageToken;
        if (!pageToken) return items;
      }
      throw new GoogleApiError(503, 'Calendar event list was truncated');
    },
    insertEvent: (calendarId, event) =>
      request(
        `/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
        { method: 'POST', body: JSON.stringify(event) },
      ),
  };
}

/**
 * Sample open windows for local dev only. Mirrors the shape of the real Operations calendar
 * (weekday blocks titled "Open for consultations", transparent) without hardcoding those hours
 * as booking rules.
 */
function sampleOpenWindows(now = Date.now()): CalendarListEvent[] {
  const zone = 'America/Toronto';
  const first = localParts(now, zone);
  const windows: CalendarListEvent[] = [];
  for (let i = 0; i < 21; i++) {
    const date = new Date(Date.UTC(first.year, first.month - 1, first.day + i));
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    windows.push({
      summary: 'Open for consultations',
      status: 'confirmed',
      transparency: 'transparent',
      start: {
        dateTime: new Date(zonedTimeToUtc(year, month, day, 10, 0, zone)).toISOString(),
        timeZone: zone,
      },
      end: {
        dateTime: new Date(zonedTimeToUtc(year, month, day, 16, 0, zone)).toISOString(),
        timeZone: zone,
      },
    });
  }
  return windows;
}

/** In-memory calendar for local development (GOOGLE_AUTH_MODE=mock). Never used in production. */
export function createMockCalendarClient(
  initialBusy: { start: string; end: string }[] = [],
  windows: CalendarListEvent[] = sampleOpenWindows(),
): CalendarClient & { events: CalendarEventInput[] } {
  const events: CalendarEventInput[] = [];
  const busy = [...initialBusy];
  return {
    events,
    async freeBusy(calendarIds, timeMin, timeMax) {
      const inRange = busy.filter((b) => b.end > timeMin && b.start < timeMax);
      return { calendars: Object.fromEntries(calendarIds.map((id) => [id, { busy: inRange }])) };
    },
    async listEvents(_calendarId, timeMin, timeMax) {
      return windows.filter((event) => {
        const start = event.start?.dateTime;
        const end = event.end?.dateTime;
        if (!start || !end) return false;
        return end > timeMin && start < timeMax;
      });
    },
    async insertEvent(_calendarId, event) {
      events.push(event);
      busy.push({ start: event.start.dateTime, end: event.end.dateTime });
      const id = `mock${events.length}`;
      return { id, hangoutLink: `https://meet.google.com/mock-${id}` };
    },
  };
}
