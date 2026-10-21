/** Approved booking rules (HQ setup log, 2026-10-20). Change only with founder approval. */
export interface BookingRules {
  /** IANA zone the business hours are defined in. */
  timeZone: string;
  durationMin: number;
  /** Distance between candidate start times. */
  stepMin: number;
  /** Free time required before and after every existing busy block. */
  bufferMin: number;
  minNoticeMin: number;
  windowDays: number;
  /** ISO weekdays: 1 is Monday, 7 is Sunday. */
  weekdays: number[];
  /** Local wall-clock opening and closing times, HH:MM. The last slot must end by dayEnd. */
  dayStart: string;
  dayEnd: string;
}

export const BOOKING_RULES: BookingRules = {
  timeZone: 'America/Toronto',
  durationMin: 30,
  stepMin: 30,
  bufferMin: 15,
  minNoticeMin: 24 * 60,
  windowDays: 30,
  weekdays: [1, 2, 3, 4, 5],
  dayStart: '10:00',
  dayEnd: '16:00',
};

/** Calendar where bookings are created ("Client Meetings", owned by admin@techshift.ai). */
export const BOOKING_CALENDAR_ID =
  'c_9bc8e61435790192690c13cc2ddd9a47118110cb3dec194f1cffc5c661934e73@group.calendar.google.com';

/** Calendars checked for conflicts: Client Meetings and admin@techshift.ai (Techshift Operations). */
export const CONFLICT_CALENDAR_IDS = [BOOKING_CALENDAR_ID, 'admin@techshift.ai'];

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];
