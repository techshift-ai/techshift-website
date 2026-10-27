import { GOOGLE_SCOPES } from '../config';
import type { Env } from '../env';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export type TokenProvider = () => Promise<string>;
type FetchLike = typeof fetch;

export class ConfigError extends Error {}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Signs a Google service account assertion (RS256) with Web Crypto. */
export async function signServiceAccountJwt(opts: {
  clientEmail: string;
  privateKeyPem: string;
  subject: string;
  scopes: string[];
  nowSeconds: number;
}): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: opts.clientEmail,
    sub: opts.subject,
    scope: opts.scopes.join(' '),
    aud: TOKEN_URL,
    iat: opts.nowSeconds,
    exp: opts.nowSeconds + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(opts.privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64url(signature)}`;
}

async function requestToken(body: URLSearchParams, fetchFn: FetchLike) {
  const res = await fetchFn(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    // The body can echo request details; keep only the status and error code.
    let code = 'unknown';
    try {
      code = ((await res.json()) as { error?: string }).error ?? code;
    } catch {
      /* ignore */
    }
    throw new Error(`Google token request failed: ${res.status} ${code}`);
  }
  return (await res.json()) as { access_token: string; expires_in: number };
}

/** Builds a cached access-token provider from env secrets. */
export function createTokenProvider(env: Env, fetchFn: FetchLike = fetch): TokenProvider {
  const mode = env.GOOGLE_AUTH_MODE;
  let cached: { token: string; expiresAt: number } | undefined;

  const fetchToken = async () => {
    if (mode === 'service_account') {
      const { GOOGLE_SA_CLIENT_EMAIL, GOOGLE_SA_PRIVATE_KEY, GOOGLE_IMPERSONATE_USER } = env;
      if (!GOOGLE_SA_CLIENT_EMAIL || !GOOGLE_SA_PRIVATE_KEY || !GOOGLE_IMPERSONATE_USER) {
        throw new ConfigError('Service account secrets are missing');
      }
      const assertion = await signServiceAccountJwt({
        clientEmail: GOOGLE_SA_CLIENT_EMAIL,
        privateKeyPem: GOOGLE_SA_PRIVATE_KEY,
        subject: GOOGLE_IMPERSONATE_USER,
        scopes: GOOGLE_SCOPES,
        nowSeconds: Math.floor(Date.now() / 1000),
      });
      return requestToken(
        new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }),
        fetchFn,
      );
    }
    if (mode === 'oauth') {
      const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } =
        env;
      if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
        throw new ConfigError('OAuth secrets are missing');
      }
      return requestToken(
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
          refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN,
          scope: GOOGLE_SCOPES.join(' '),
        }),
        fetchFn,
      );
    }
    throw new ConfigError(`Unsupported GOOGLE_AUTH_MODE: ${mode ?? 'unset'}`);
  };

  return async () => {
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
    const { access_token, expires_in } = await fetchToken();
    cached = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
    return access_token;
  };
}
