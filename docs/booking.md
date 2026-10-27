# Booking backend

Custom booking for the free consultation, replacing the old Google appointment link. A small
Cloudflare Worker in `worker/` serves `/api/*`; the rest of the site stays static. Status: built and
tested locally. Not deployed, and no Google Cloud or Cloudflare resources exist yet.

## Rules

Approved in HQ's Email, Calendar and EA setup log. Defined once in `worker/src/config.ts`.

| Rule                 | Value                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Length               | 30 minutes. The calendar event includes a video meeting. The site does not name the provider. |
| Open windows         | Events titled exactly `Open for consultations` on the Techshift Operations calendar           |
| Grid                 | 30-minute starts on the America/Toronto clock, and the whole 30 minutes must sit in a window  |
| Buffer               | 15 minutes clear before and after any existing event                                          |
| Notice               | At least 24 hours ahead                                                                       |
| Window               | Up to 30 days ahead                                                                           |
| Created on           | Client Meetings calendar                                                                      |
| Conflicts checked on | Client Meetings and admin@techshift.ai (Techshift Operations)                                 |

Bookable hours are not hardcoded. An event on `admin@techshift.ai` whose title is exactly
`Open for consultations` (trimmed, case-insensitive) is a window. Those events are created with
transparency `transparent` (show as free). `events.list` loads them (`singleEvents=true`, `timeMin`,
`timeMax`). A read failure fails closed with 503.

Slots are 30-minute starts on a 30-minute grid, fully inside a window. freeBusy on both calendars
removes conflicts, with the 15-minute buffer on both sides. The open-window events themselves must
not count as busy: freeBusy ignores transparent events, and the Worker also drops a busy block that
matches a window exactly.

A busy block ending at 11:00 still blocks an 11:00 start (buffer), so the next open start is 11:30
when that start is inside a window. Calendly is not used.

## API

`GET /api/availability?from=ISO&to=ISO` returns open slots in UTC. Both parameters are optional and
are clamped to the notice, the window, and a 31-day span.

```json
{
  "timeZone": "America/Toronto",
  "durationMinutes": 30,
  "slots": [{ "start": "2026-10-22T14:00:00.000Z", "end": "2026-10-22T14:30:00.000Z" }]
}
```

`POST /api/book` with JSON: `start` (a slot start), `name`, `email`, `businessName`, `issue`
(required, one of `lowering-costs`, `saving-time`, `growing-revenue`, `customer-service`,
`online-presence`, `something-else`), `problem` (optional notes), `phone`, `website`, `businessType`,
`timeZone` (optional), `turnstileToken`, and the hidden `honeypot` field.

| Status | Meaning                                                                              |
| ------ | ------------------------------------------------------------------------------------ |
| 201    | Booked: `{ status, start, end, meetLink }`. Google emails the invite to the visitor. |
| 400    | Invalid input: `{ error: "invalid", fields: { field: message } }`                    |
| 403    | Origin not allowed, or Turnstile failed                                              |
| 409    | `slot_taken`: someone booked it since availability loaded. Refresh slots.            |
| 422    | `invalid_slot`: not on the grid, too soon, or outside the window                     |
| 429    | Rate limited                                                                         |
| 503    | A calendar could not be checked. Fails closed: nothing is offered or booked.         |

## How a booking is made

1. Validate the form on the server, then check the honeypot (a filled honeypot gets a fake 201 and
   nothing is created), the rate limit, and Turnstile.
2. Confirm the start is a valid slot under the rules.
3. Call `freeBusy` on both calendars for the slot plus buffers, right before inserting. Busy means 409.
4. `events.insert` on Client Meetings with `conferenceDataVersion=1` and `sendUpdates=all`: the visitor
   is the only attendee, the description holds their form answers, and Meet is created.
5. Internal references go in `extendedProperties.private` (`techshiftSource`, `techshiftBookingId`,
   `techshiftCrmMatch`; CRM matching later adds `techshiftCompanyId` and `techshiftWorkId`). Private
   properties are only on the organizer's copy. Never put private notes in the summary or description,
   which guests see.

Known limit: two visitors submitting the same slot in the same second can both pass the re-check.
Traffic makes this unlikely; if it happens, one event is moved by hand.

## Configuration

Vars live in `worker/wrangler.jsonc`; secrets are set with `wrangler secret put` and never committed.

| Name                                                                                 | Kind     | Purpose                                                                               |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------- |
| `GOOGLE_AUTH_MODE`                                                                   | var      | `oauth` (production default), `service_account`, or `mock` (local only)               |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` | secrets  | OAuth mode                                                                            |
| `GOOGLE_SA_CLIENT_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`                                    | secrets  | Service account mode                                                                  |
| `GOOGLE_IMPERSONATE_USER`                                                            | var      | `admin@techshift.ai` (service account mode)                                           |
| `TURNSTILE_MODE`                                                                     | var      | `on` or `off`. Off, and the mock calendar, are refused when `ENVIRONMENT=production`. |
| `TURNSTILE_SECRET_KEY`                                                               | secret   | Turnstile server-side key                                                             |
| `ALLOWED_ORIGINS`                                                                    | var      | Origins allowed to POST                                                               |
| `BOOKING_RATE_LIMITER`, `AVAILABILITY_RATE_LIMITER`                                  | bindings | 5 bookings and 60 availability calls per minute per IP, per Cloudflare location       |

Production auth is `GOOGLE_AUTH_MODE=oauth`: a refresh token for admin@techshift.ai with scope
`https://www.googleapis.com/auth/calendar`. That scope is what `events.list`, freeBusy, and
`events.insert` need. It is broader than the earlier events and freeBusy pair: the token can read and
change calendars that admin@techshift.ai can access. Service account mode uses the same scope.
Auth uses `fetch` and Web Crypto (RS256 JWT), with no Google client library, so it runs on Workers.

## Local development

```bash
npm run worker:dev   # http://localhost:8787, mock calendar, Turnstile off
npm test             # slot, booking, auth, validation, and API tests
```

The local mock publishes sample "Open for consultations" windows so the form has times to show.
Those windows are not the production rules. Production reads the real Operations calendar.
Local `ALLOWED_ORIGINS` includes `http://localhost:4321` and `http://127.0.0.1:4321`.

## One-time setup (needs Azeem's approval; none of this exists yet)

HQ's log records that Google Cloud CLI authentication is still pending, so this must be done in the
Google Cloud console or after `gcloud` is authenticated.

**Google, recommended path: OAuth refresh token (`GOOGLE_AUTH_MODE=oauth`).**

1. Create or choose a Google Cloud project under the techshift.ai organization and enable the Google
   Calendar API.
2. Set the OAuth consent screen to **Internal**. Internal apps' refresh tokens do not expire after
   7 days the way External apps in testing do.
3. Create an OAuth client ID (type Web application).
4. Sign in once as admin@techshift.ai and grant `https://www.googleapis.com/auth/calendar`, for example with the
   OAuth 2.0 Playground set to use this client, to get a refresh token.
5. `wrangler secret put` the client ID, client secret, and refresh token.

**Google, alternative: service account with domain-wide delegation (`GOOGLE_AUTH_MODE=service_account`).**

1. Same project, Calendar API enabled. Create a service account with no IAM roles.
2. Create a JSON key. New organizations often block this with the
   `iam.disableServiceAccountKeyCreation` policy; an admin exception would be needed.
3. Workspace Admin console, Security, Access and data control, API controls, Domain-wide delegation:
   add the service account's client ID with `https://www.googleapis.com/auth/calendar`.
4. `wrangler secret put GOOGLE_SA_CLIENT_EMAIL` and `GOOGLE_SA_PRIVATE_KEY`.

Delegation lets that key act as any user in the domain for those scopes, so a leaked key is wider
exposure than a leaked refresh token, which only reaches admin@techshift.ai. That is why OAuth is
recommended.

**Cloudflare.**

1. Turnstile: create a widget in Invisible mode for `techshift.ai` and `www.techshift.ai`. The site
   key goes in the site build; the secret goes in `wrangler secret put TURNSTILE_SECRET_KEY`.
2. Confirm the techshift.ai zone uses Cloudflare nameservers (needed for the Worker route).
3. An API token with Workers Scripts Edit and Workers Routes Edit for the zone. The current GitHub
   Actions token may be scoped to Pages only.
4. `npx wrangler deploy -c worker/wrangler.jsonc` creates the `techshift-booking` Worker, its
   `techshift.ai/api/*` route, and the rate limit bindings. Production deploys need Azeem's approval.
5. When the booking form is built, add `https://challenges.cloudflare.com` to the site's CSP
   (`script-src` and `frame-src`) for Turnstile.
