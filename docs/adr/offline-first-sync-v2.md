# ADR: Offline-First Sync v2

## Status

Accepted — implementation in progress.

## Context

The mobile app uses Zustand + MMKV with optimistic REST and full bootstrap pull. This is offline-capable but not offline-first at scale. We need SQLite locally, incremental server pull, batch push with idempotency, and a server change log.

## Preservation policy (mandatory)

This migration changes **how data is stored and synced**, not **what the app does**.

- All screens, navigation routes, components, and user-visible flows remain.
- Store action names and selector shapes exposed to screens remain unchanged.
- Business rules (tombstones, deletion transfers, protected accounts, budgets, travel mode, etc.) are preserved; only persistence/sync transport changes.
- Legacy REST CRUD endpoints remain during overlap for older clients.

## Decisions

### Local storage (mobile)

- **SQLite** via `expo-sqlite` + **Drizzle ORM** per signed-in user (`expense_{clerkUserId}.db`).
- Zustand remains the reactive UI cache; financial stores drop `persist` middleware and hydrate from SQLite.
- One-time MMKV → SQLite migration per user on upgrade.

### Server revision model

- Per-user monotonic `revision` (bigint) in `user_sync_state.server_revision`.
- Every mutation appends to `change_log` with the allocated revision.
- Single-device primary: one cursor per user (`last_server_revision` on client).

### Conflict resolution

- **Last-write-wins** using `updatedAt` when revisions conflict on push.
- Push retry with same `operationId` returns `duplicate` via `processed_operations`.
- No user-facing conflict UI in v2.

### Deletes

- Syncable entities use `deleted_at` soft delete (not physical delete) except `DELETE /me/data` wipe.
- Accounts retain `deleted_account_names` for history labels.

### API surface

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/sync` | Cold start bootstrap + `meta.serverRevision` |
| `GET /api/v1/sync/changes?since=&limit=` | Incremental pull |
| `POST /api/v1/sync/push` | Batch outbox with `operationId` idempotency |

Legacy `/api/v1/transactions`, `/accounts`, etc. remain; writes emit change log.

### Bootstrap fallback

Use full bootstrap when: first login, `last_server_revision === 0`, post-wipe, cursor corrupt, or migration.

### Feature flag

Mobile: `EXPO_PUBLIC_SYNC_V2=true` enables batch push + incremental pull. When false, legacy sync path runs until regression QA passes.

## Consequences

- New tables: `change_log`, `processed_operations`, `user_sync_state`.
- Domain tables gain `deleted_at`, `revision`.
- Repositories filter `deleted_at IS NULL` on reads.
- Mobile sync cycle: one push batch + incremental pull pages (no triple bootstrap on normal sync).
