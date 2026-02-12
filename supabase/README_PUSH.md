# Peggy Web Push Setup (Supabase + iPhone PWA)

This app now includes:
- account-synced notification preference (`baby-prep-smart-notifs-enabled`)
- per-device push subscription sync
- edge functions for subscription management + dispatch

## 1) Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Copy the generated keys.

## 2) Frontend env

Update `app/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_WEB_PUSH_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
```

## 3) Create DB table + policies

Run this script in Supabase SQL Editor:

- `app/supabase/sql/2026-02-09_push_notifications.sql`

## 4) Deploy edge functions

From `app/`:

```bash
npx supabase functions deploy push-subscriptions --no-verify-jwt
npx supabase functions deploy push-dispatch
```

Why `--no-verify-jwt` on `push-subscriptions`:
- Some projects issue ES256 access tokens and Supabase function gateway JWT verification can reject them with `Invalid JWT`.
- This function already validates bearer access token internally via `auth.getUser(accessToken)` using service-role client, so auth remains enforced.

## 5) Set edge function secrets

```bash
npx supabase secrets set WEB_PUSH_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
npx supabase secrets set WEB_PUSH_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY
npx supabase secrets set WEB_PUSH_CONTACT_EMAIL=mailto:you@example.com
npx supabase secrets set PUSH_CRON_SECRET=YOUR_RANDOM_SECRET
npx supabase secrets set PUSH_DEFAULT_TITLE="Peggy reminder"
npx supabase secrets set PUSH_DEFAULT_BODY="Quick check-in: open Peggy for your reminders."
npx supabase secrets set PUSH_MIN_INTERVAL_MINUTES=120
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase runtime.

## 6) Schedule automatic dispatch (optional but recommended)

Use the commented cron block in:
- `app/supabase/sql/2026-02-09_push_notifications.sql`

Set your project function URL + same `PUSH_CRON_SECRET`.

## 7) iPhone requirements (important)

Web Push on iPhone requires:
- iOS/iPadOS 16.4+
- app opened as **Home Screen web app** (Add to Home Screen)
- user taps **Allow Notifications**

If opened only inside Safari tab, push behavior can be limited/unreliable.

## 8) Verify quickly

1. Sign in to cloud account in Peggy.
2. Enable notifications in Home tab.
3. In `More > Backup > Cloud Sync`, tap `Send Test Push`.
4. Confirm notification arrives on the installed PWA device.
