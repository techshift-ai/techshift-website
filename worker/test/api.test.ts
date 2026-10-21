import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/env';

const ORIGIN = 'http://localhost:4321';
const localEnv: Env = {
  ENVIRONMENT: 'local',
  ALLOWED_ORIGINS: ORIGIN,
  GOOGLE_AUTH_MODE: 'mock',
  TURNSTILE_MODE: 'off',
};

const form = {
  name: 'Jordan Lee',
  email: 'jordan@example.com',
  businessName: 'Lee Plumbing',
  problem: 'We miss calls after hours.',
};

const post = (body: unknown, env: Env = localEnv, origin: string | null = ORIGIN) =>
  worker.fetch(
    new Request('https://techshift.ai/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
      body: JSON.stringify(body),
    }),
    env,
  );

async function firstSlot(env: Env = localEnv): Promise<string> {
  const res = await worker.fetch(new Request('https://techshift.ai/api/availability'), env);
  const data = (await res.json()) as { slots: { start: string }[] };
  return data.slots[0]!.start;
}

describe('booking API (mock calendar)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('lists availability in UTC', async () => {
    const res = await worker.fetch(new Request('https://techshift.ai/api/availability'), localEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const data = (await res.json()) as { timeZone: string; slots: { start: string }[] };
    expect(data.timeZone).toBe('America/Toronto');
    expect(data.slots.length).toBeGreaterThan(0);
    expect(data.slots[0]!.start.endsWith('Z')).toBe(true);
  });

  it('rejects malformed ranges', async () => {
    const res = await worker.fetch(
      new Request('https://techshift.ai/api/availability?from=soon'),
      localEnv,
    );
    expect(res.status).toBe(400);
  });

  it('books a slot, then returns 409 for the same slot', async () => {
    const start = await firstSlot();
    const ok = await post({ ...form, start });
    expect(ok.status).toBe(201);
    expect(await ok.json()).toMatchObject({ status: 'confirmed', start });
    const again = await post({ ...form, start });
    expect(again.status).toBe(409);
  });

  it('returns field errors for invalid input', async () => {
    const res = await post({ start: 'later', email: 'x' });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { fields: Record<string, string> };
    expect(Object.keys(data.fields)).toEqual(
      expect.arrayContaining(['start', 'name', 'email', 'businessName', 'problem']),
    );
  });

  it('pretends success for honeypot submissions and books nothing', async () => {
    const start = await firstSlot();
    const res = await post({ ...form, start, honeypot: 'http://spam.example' });
    expect(res.status).toBe(201);
    // The slot is still open afterwards.
    expect(await firstSlot()).toBe(start);
  });

  it('requires an allowed Origin on POST', async () => {
    expect((await post(form, localEnv, null)).status).toBe(403);
    expect((await post(form, localEnv, 'https://evil.example')).status).toBe(403);
  });

  it('enforces the rate limiter when bound', async () => {
    const env = { ...localEnv, BOOKING_RATE_LIMITER: { limit: async () => ({ success: false }) } };
    expect((await post(form, env)).status).toBe(429);
  });

  it('refuses Turnstile off or the mock calendar in production', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const start = await firstSlot();
    const prodNoTurnstile = { ...localEnv, ENVIRONMENT: 'production' };
    expect((await post({ ...form, start }, prodNoTurnstile)).status).toBe(403);
    const prodMock = { ...prodNoTurnstile, TURNSTILE_MODE: 'on', TURNSTILE_SECRET_KEY: 'x' };
    const res = await worker.fetch(new Request('https://techshift.ai/api/availability'), prodMock);
    expect(res.status).toBe(503);
  });

  it('verifies Turnstile tokens when enabled', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] })),
      );
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const env = { ...localEnv, TURNSTILE_MODE: 'on', TURNSTILE_SECRET_KEY: 'secret' };
    const start = await firstSlot();
    const res = await post({ ...form, start, turnstileToken: 'bad' }, env);
    expect(res.status).toBe(403);
    expect(fetchSpy.mock.calls[0]![0]).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
  });

  it('leaves non-API paths alone', async () => {
    const res = await worker.fetch(new Request('https://techshift.ai/'), localEnv);
    expect(res.status).toBe(404);
  });
});
