# Expense Backend

Node.js + Express API for the Expense Tracker mobile app (Clerk auth, Supabase DB).

## Prerequisites

- Node.js 20+
- A [Clerk](https://dashboard.clerk.com) application (**Development** instance for local work)
- A [Supabase](https://supabase.com) project

## 1. Install

```bash
cd expenseBackend
npm install
cp .env.example .env
```

## 2. Fill `.env`

Use **Clerk Development** keys (`pk_test_` / `sk_test_`) and your Supabase project values. See `.env.example` for what each variable is.

| Variable | Required locally? |
|----------|-------------------|
| `CLERK_SECRET_KEY` | Yes (API auth) |
| `CLERK_PUBLISHABLE_KEY` | Recommended |
| `SUPABASE_URL` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (Dashboard → Settings → API → `service_role`) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | No locally (leave empty) |

Mobile app `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` must be from the **same** Clerk Development instance.

## 3. Database migrations

In Supabase → SQL Editor, run these files **in order** from `supabase/migrations/`:

1. `001_initial_schema.sql`
2. `002_domain_tables.sql`
3. `003_storage_buckets.sql`
4. `004_rls_policies.sql`
5. `005_user_id_fk.sql`
6. `006_rls_user_id.sql`
7. `007_customer_id.sql`
8. `008_sync_infrastructure.sql`
9. `009_user_backups.sql`

## 4. Run the API

```bash
npm run dev
```

The API listens on your machine at [http://localhost:3000](http://localhost:3000).  
Check: [http://localhost:3000/health](http://localhost:3000/health) → should return OK.

In the **same terminal**, each API call from the app is logged like:

```text
GET /api/v1/me 200 45ms
POST /api/v1/sync/push 201 120ms
```

That replaces the old ngrok request inspector — watch `npm run dev` for method, path, status, and duration. (`/health` probes are not logged so the list stays readable.)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development (hot reload + request logs) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run compiled `dist/` (production-style) |
| `npm run typecheck` | Type-check only |

## 5. Point the mobile app at this API

Backend stays on **localhost:3000**. The mobile app needs a URL that reaches that process from the emulator or phone.

In `expense-tracker/.env`:

| Where the app runs | `EXPO_PUBLIC_API_BASE_URL` |
|--------------------|----------------------------|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Physical device (same Wi‑Fi as your PC) | `http://YOUR_PC_LAN_IP:3000` (e.g. `http://192.168.1.10:3000`) |

`10.0.2.2` is the Android emulator’s special address for the host machine’s `localhost`.

Restart Expo / rebuild after changing the env. Confirm:

`GET {EXPO_PUBLIC_API_BASE_URL}/health` → 200

## Environments (Clerk Dev vs Prod)

| | Local / Development | Production (e.g. Render) |
|--|---------------------|---------------------------|
| Clerk instance | **Development** (`*_test_*`) | **Production** (`*_live_*`) |
| Backend URL | `localhost:3000` (app uses emulator/LAN URL above) | Fixed public HTTPS host |
| Webhook | Leave unset | Set once (see below) |

Never put live Clerk keys in local `.env`.

## Delete account vs webhook

Two different ways a user can be removed:

1. **In the app** (Settings → Delete account)  
   App calls `DELETE /api/v1/me`. Backend deletes Supabase data **and** the Clerk user.  
   **No webhook needed** — works the same locally and in production.

2. **In Clerk Dashboard** (admin deletes the user there)  
   Clerk is gone, but your database does not know unless Clerk notifies you.  
   That notification is the webhook: `POST /webhooks/clerk` (`user.deleted`).

| | Local | Production |
|--|-------|------------|
| Test Delete account in the app | Yes — leave webhook empty | Works without webhook too |
| Clean DB if someone deletes a user in Clerk Dashboard | Skip (rare while developing) | Set webhook so leftover user data is removed |

## Production deploy (summary)

1. Deploy this API to a fixed HTTPS host.
2. Set host env: Clerk **Production** keys + Supabase.
3. (Recommended) Clerk **Production** → Webhooks → `https://YOUR_HOST/webhooks/clerk`, event `user.deleted` → set `CLERK_WEBHOOK_SIGNING_SECRET` on the host once.
4. Mobile release builds: `pk_live_…` + production API base URL.
