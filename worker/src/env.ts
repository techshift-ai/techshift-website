/** Minimal Workers types, so the Worker needs no generated runtime types file. */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
export interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  /** "production" refuses to run with Turnstile off or with the mock calendar. */
  ENVIRONMENT?: string;
  /** Comma-separated origins allowed to call the API, for example https://techshift.ai */
  ALLOWED_ORIGINS?: string;

  /** "service_account" (domain-wide delegation), "oauth" (refresh token), or "mock" (local only). */
  GOOGLE_AUTH_MODE?: string;
  GOOGLE_SA_CLIENT_EMAIL?: string;
  GOOGLE_SA_PRIVATE_KEY?: string;
  /** Workspace user the service account acts as. */
  GOOGLE_IMPERSONATE_USER?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_REFRESH_TOKEN?: string;

  /** "on" (default) or "off". Off is rejected when ENVIRONMENT is production. */
  TURNSTILE_MODE?: string;
  TURNSTILE_SECRET_KEY?: string;

  BOOKING_RATE_LIMITER?: RateLimiter;
  AVAILABILITY_RATE_LIMITER?: RateLimiter;
  /** Present only if the static site is later served from this same Worker. */
  ASSETS?: AssetsFetcher;
}
