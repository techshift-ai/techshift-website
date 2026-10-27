/** Booking rules that stay in code. Open hours come from the Operations calendar, not from this file. */
export interface BookingRules {
  /** IANA zone used to place 30-minute starts on the clock. */
  timeZone: string;
  durationMin: number;
  /** Distance between candidate start times. */
  stepMin: number;
  /** Free time required before and after every existing busy block. */
  bufferMin: number;
  minNoticeMin: number;
  windowDays: number;
}

export const BOOKING_RULES: BookingRules = {
  timeZone: 'America/Toronto',
  durationMin: 30,
  stepMin: 30,
  bufferMin: 15,
  minNoticeMin: 24 * 60,
  windowDays: 30,
};

/** Exact event title (compared trimmed and case-insensitive) that opens a bookable window. */
export const OPEN_WINDOW_TITLE = 'open for consultations';

/** Calendar where bookings are created ("Client Meetings", owned by admin@techshift.ai). */
export const BOOKING_CALENDAR_ID =
  'c_9bc8e61435790192690c13cc2ddd9a47118110cb3dec194f1cffc5c661934e73@group.calendar.google.com';

/** Techshift Operations. Open windows are events on this calendar. It is also checked for conflicts. */
export const OPERATIONS_CALENDAR_ID = 'admin@techshift.ai';

/** Calendars checked for conflicts: Client Meetings and Techshift Operations. */
export const CONFLICT_CALENDAR_IDS = [BOOKING_CALENDAR_ID, OPERATIONS_CALENDAR_ID];

/**
 * Production uses an OAuth refresh token for admin@techshift.ai granted this scope.
 * events.list (window titles), freeBusy, and events.insert all sit inside it.
 */
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar'];
