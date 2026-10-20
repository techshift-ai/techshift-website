import { describe, expect, it, vi } from 'vitest';
import { GOOGLE_SCOPES } from '../src/config';
import { createTokenProvider, signServiceAccountJwt } from '../src/google/auth';

async function testKeyPair() {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  let bin = '';
  for (const b of der) bin += String.fromCharCode(b);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(bin)
    .match(/.{1,64}/g)!
    .join('\n')}\n-----END PRIVATE KEY-----\n`;
  return { pem, publicKey: pair.publicKey };
}

const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));

describe('service account JWT', () => {
  it('signs an RS256 assertion that impersonates the Workspace user with minimal scopes', async () => {
    const { pem, publicKey } = await testKeyPair();
    // Secrets often arrive with escaped newlines; the signer must accept that form.
    const jwt = await signServiceAccountJwt({
      clientEmail: 'booking@project.iam.gserviceaccount.com',
      privateKeyPem: pem.replace(/\n/g, '\\n'),
      subject: 'admin@techshift.ai',
      scopes: GOOGLE_SCOPES,
      nowSeconds: 1_800_000_000,
    });
    const [h, c, s] = jwt.split('.');
    expect(decode(h!)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(decode(c!)).toEqual({
      iss: 'booking@project.iam.gserviceaccount.com',
      sub: 'admin@techshift.ai',
      scope:
        'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_800_000_000,
      exp: 1_800_003_600,
    });
    const sig = Uint8Array.from(atob(s!.replace(/-/g, '+').replace(/_/g, '/')), (ch) =>
      ch.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      sig,
      new TextEncoder().encode(`${h}.${c}`),
    );
    expect(valid).toBe(true);
  });
});

describe('token provider', () => {
  const tokenResponse = () =>
    new Response(JSON.stringify({ access_token: 'ya29.test', expires_in: 3600 }), { status: 200 });

  it('uses the refresh token grant in oauth mode and caches the token', async () => {
    const fetchFn = vi.fn(async () => tokenResponse());
    const get = createTokenProvider(
      {
        GOOGLE_AUTH_MODE: 'oauth',
        GOOGLE_OAUTH_CLIENT_ID: 'id',
        GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
        GOOGLE_OAUTH_REFRESH_TOKEN: 'refresh',
      },
      fetchFn as unknown as typeof fetch,
    );
    expect(await get()).toBe('ya29.test');
    expect(await get()).toBe('ya29.test');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const body = (fetchFn.mock.calls[0]! as unknown as [string, RequestInit])[1]
      .body as URLSearchParams;
    expect(body.get('grant_type')).toBe('refresh_token');
  });

  it('uses the JWT bearer grant in service account mode', async () => {
    const { pem } = await testKeyPair();
    const fetchFn = vi.fn(async () => tokenResponse());
    const get = createTokenProvider(
      {
        GOOGLE_AUTH_MODE: 'service_account',
        GOOGLE_SA_CLIENT_EMAIL: 'sa@p.iam.gserviceaccount.com',
        GOOGLE_SA_PRIVATE_KEY: pem,
        GOOGLE_IMPERSONATE_USER: 'admin@techshift.ai',
      },
      fetchFn as unknown as typeof fetch,
    );
    await get();
    const body = (fetchFn.mock.calls[0]! as unknown as [string, RequestInit])[1]
      .body as URLSearchParams;
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    expect(body.get('assertion')!.split('.')).toHaveLength(3);
  });

  it('fails clearly when secrets are missing', async () => {
    await expect(createTokenProvider({ GOOGLE_AUTH_MODE: 'service_account' })()).rejects.toThrow(
      /missing/,
    );
    await expect(createTokenProvider({})()).rejects.toThrow(/Unsupported/);
  });
});
