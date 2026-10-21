import type { Env } from './env';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult = { ok: true } | { ok: false; reason: string };

/** Verifies a Turnstile token server side. TURNSTILE_MODE=off skips it outside production. */
export async function verifyTurnstile(
  env: Env,
  token: string | undefined,
  remoteIp: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<TurnstileResult> {
  if (env.TURNSTILE_MODE === 'off') {
    return env.ENVIRONMENT === 'production'
      ? { ok: false, reason: 'turnstile_disabled_in_production' }
      : { ok: true };
  }
  if (!env.TURNSTILE_SECRET_KEY) return { ok: false, reason: 'turnstile_not_configured' };
  if (!token) return { ok: false, reason: 'missing_token' };

  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET_KEY);
  body.append('response', token);
  if (remoteIp) body.append('remoteip', remoteIp);
  const res = await fetchFn(VERIFY_URL, { method: 'POST', body });
  if (!res.ok) return { ok: false, reason: `siteverify_${res.status}` };
  const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
  return data.success ? { ok: true } : { ok: false, reason: data['error-codes']?.[0] ?? 'failed' };
}
