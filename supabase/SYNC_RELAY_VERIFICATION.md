# Sync v1 real-cloud verification

This gate uses the existing LifeOS Supabase client dependency, the public anon
key, and two dedicated authenticated test users. It never uses a service-role
key and never writes credentials to the repository.

## One-time project preparation

1. Log the Supabase CLI into the intended non-production verification project
   and link this repository to that project.
2. Apply repository migrations with `supabase db push`. This installs
   `002_sync_relay_v1.sql`; do not recreate the table or RLS policies manually
   in Dashboard.
3. Create two dedicated Auth test users. Device A and device B both sign in as
   test user A; test user B exists only for RLS isolation checks.

## Run from PowerShell

Set these values only in the current shell or another ignored local secret
store:

```powershell
$env:LIFEOS_SUPABASE_RELAY_INTEGRATION = '1'
$env:LIFEOS_SUPABASE_TEST_URL = '<project-url>'
$env:LIFEOS_SUPABASE_TEST_ANON_KEY = '<anon-key>'
$env:LIFEOS_SUPABASE_TEST_USER_A_EMAIL = '<test-user-a-email>'
$env:LIFEOS_SUPABASE_TEST_USER_A_PASSWORD = '<test-user-a-password>'
$env:LIFEOS_SUPABASE_TEST_USER_B_EMAIL = '<test-user-b-email>'
$env:LIFEOS_SUPABASE_TEST_USER_B_PASSWORD = '<test-user-b-password>'
npm run test:sync:cloud
```

Without the explicit enable flag and every variable, the real-cloud suite is
skipped rather than reporting a false pass.

## Verified path

The harness runs two independent Dexie databases and two SyncEngine instances:

1. Authenticated device A creates and pushes a Todo operation.
2. Authenticated device B (same user) pulls it.
3. Device B modifies the Todo and pushes a second operation.
4. Device A pulls the update and both local records must match.
5. Re-pushing the first operation must remain accepted with exactly one relay
   row.
6. One-row pages must advance strictly by server `relay_seq`, and both local
   checkpoints must reach the second operation.
7. User A must not see user B's relay row, and a direct attempt by user A to
   insert user B's `user_id` must fail under RLS.

Relay rows are append-only test evidence and are intentionally not deleted by
the client harness.
