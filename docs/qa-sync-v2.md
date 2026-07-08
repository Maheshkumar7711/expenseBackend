# Sync v2 — QA matrix

Use with `EXPO_PUBLIC_SYNC_V2=true` on a dev build after backend migration `010` is applied.

## Part A — Sync-specific

| Scenario | Expected |
|----------|----------|
| Offline add transaction | Instant UI; syncs on reconnect |
| Kill app mid-sync | Outbox replay; no duplicates |
| Server ahead of client | Pull overwrites with newer revision |
| Client ahead of server | Push applies; revision bumps |
| Delete transaction offline | Tombstone propagated on pull |
| Account delete (cash/savings) | Tombstone preserved |
| Full data wipe | Local + server clean; bootstrap |

## Part B — Regression (must match pre-migration)

- Home, Money, Add, Savings, Insight, Accounts, Drawer flows
- Auth, onboarding, passcode lock
- Backup/restore v2 export + v1 import

## Rollout

1. Deploy backend with migration 010 + sync endpoints
2. Ship mobile with `EXPO_PUBLIC_SYNC_V2=false` (default)
3. Enable `EXPO_PUBLIC_SYNC_V2=true` in staging; run Part A + B
4. After 1–2 releases with clean metrics: retire `pushLocalToBackend` and MMKV financial keys
