import { BOOKING_CALENDAR_ID, BOOKING_RULES, CONFLICT_CALENDAR_IDS } from './config';
import {
  BusyCheckError,
  createBooking,
  getAvailability,
  InvalidSlotError,
  SlotTakenError,
  type BookingDeps,
} from './booking';
import type { Env, RateLimiter } from './env';
import { ConfigError, createTokenProvider } from './google/auth';
import {
  createGoogleCalendarClient,
  createMockCalendarClient,
  type CalendarClient,
} from './google/calendar';
import { verifyTurnstile } from './turnstile';
import { validateBookingRequest } from './validate';

const MAX_BODY_BYTES = 10_000;

// One client per isolate so the access token cache is reused across requests.
let cachedClient: { key: string; client: CalendarClient } | undefined;

function calendarFor(env: Env): CalendarClient {
  const mode = env.GOOGLE_AUTH_MODE ?? 'unset';
  if (mode === 'mock' && env.ENVIRONMENT === 'production') {
    throw new ConfigError('Mock calendar is not allowed in production');
  }
  if (cachedClient?.key === mode) return cachedClient.client;
  const client =
    mode === 'mock'
      ? createMockCalendarClient()
      : createGoogleCalendarClient(createTokenProvider(env));
  cachedClient = { key: mode, client };
  return client;
}

function deps(env: Env): BookingDeps {
  return {
    calendar: calendarFor(env),
    rules: BOOKING_RULES,
    bookingCalendarId: BOOKING_CALENDAR_ID,
    conflictCalendarIds: CONFLICT_CALENDAR_IDS,
    now: () => Date.now(),
    newId: () => crypto.randomUUID().replace(/-/g, ''),
  };
}

function allowedOrigin(env: Env, request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return allowed.includes(origin) ? origin : null;
}

function json(body: unknown, status: number, origin: string | null, extra: HeadersInit = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function underLimit(limiter: RateLimiter | undefined, key: string): Promise<boolean> {
  if (!limiter) return true; // No binding locally; production config always has one.
  return (await limiter.limit({ key })).success;
}

function parseTime(value: string | null): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? Number.NaN : ms;
}

async function handleAvailability(request: Request, env: Env, origin: string | null) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  if (!(await underLimit(env.AVAILABILITY_RATE_LIMITER, `availability:${ip}`))) {
    return json({ error: 'rate_limited' }, 429, origin, { 'Retry-After': '60' });
  }
  const url = new URL(request.url);
  const from = parseTime(url.searchParams.get('from'));
  const to = parseTime(url.searchParams.get('to'));
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return json({ error: 'invalid_range', message: 'from and to must be ISO 8601' }, 400, origin);
  }
  const result = await getAvailability(deps(env), from, to);
  return json(result, 200, origin);
}

async function handleBook(request: Request, env: Env, origin: string | null) {
  // Browsers always send Origin on POST; require it to match so other sites cannot post here.
  if (!origin) return json({ error: 'forbidden_origin' }, 403, null);
  if (!(request.headers.get('Content-Type') ?? '').includes('application/json')) {
    return json({ error: 'unsupported_media_type' }, 415, origin);
  }
  const ip = request.headers.get('CF-Connecting-IP');
  if (!(await underLimit(env.BOOKING_RATE_LIMITER, `book:${ip ?? 'local'}`))) {
    return json({ error: 'rate_limited' }, 429, origin, { 'Retry-After': '60' });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413, origin);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'invalid_json' }, 400, origin);
  }

  const parsed = validateBookingRequest(body);
  if (!parsed.ok) return json({ error: 'invalid', fields: parsed.errors }, 400, origin);

  // Honeypot filled: pretend success so bots learn nothing, and create nothing.
  if (parsed.value.honeypot) return json({ status: 'confirmed' }, 201, origin);

  const turnstile = await verifyTurnstile(env, parsed.value.turnstileToken, ip);
  if (!turnstile.ok) {
    console.warn('turnstile rejected', turnstile.reason);
    return json({ error: 'verification_failed' }, 403, origin);
  }

  try {
    const result = await createBooking(deps(env), parsed.value);
    return json(
      { status: 'confirmed', start: result.start, end: result.end, meetLink: result.meetLink },
      201,
      origin,
    );
  } catch (err) {
    if (err instanceof SlotTakenError) return json({ error: 'slot_taken' }, 409, origin);
    if (err instanceof InvalidSlotError) return json({ error: 'invalid_slot' }, 422, origin);
    throw err;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(env, request);

    if (!url.pathname.startsWith('/api/')) {
      // If the static site is ever served from this Worker, hand everything else to assets.
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }

    if (request.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }

    try {
      if (url.pathname === '/api/availability' && request.method === 'GET') {
        return await handleAvailability(request, env, origin);
      }
      if (url.pathname === '/api/book' && request.method === 'POST') {
        return await handleBook(request, env, origin);
      }
      return json({ error: 'not_found' }, 404, origin);
    } catch (err) {
      // Log the reason server side; never return internal details or Google responses.
      console.error('booking api error', err instanceof Error ? err.message : err);
      if (err instanceof BusyCheckError || err instanceof ConfigError) {
        return json({ error: 'unavailable' }, 503, origin);
      }
      return json({ error: 'server_error' }, 500, origin);
    }
  },
};
