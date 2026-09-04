-- LifeOS Sync v1 append-only relay.
-- Supabase is a per-user operation relay, never the business source of truth.

CREATE TABLE IF NOT EXISTS public.sync_relay_operations (
    relay_seq BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operation_id TEXT NOT NULL,
    protocol_version INTEGER NOT NULL CHECK (protocol_version = 1),
    device_id TEXT NOT NULL CHECK (length(btrim(device_id)) > 0),
    device_sequence BIGINT NOT NULL CHECK (device_sequence > 0),
    domain TEXT NOT NULL CHECK (domain IN ('todo', 'schedule', 'mood', 'cycle', 'health', 'continuity')),
    entity_id TEXT NOT NULL CHECK (length(btrim(entity_id)) > 0),
    kind TEXT NOT NULL CHECK (kind IN ('upsert', 'delete')),
    occurred_at TIMESTAMPTZ NOT NULL,
    record_payload JSONB,
    sync_metadata JSONB NOT NULL CHECK (jsonb_typeof(sync_metadata) = 'object'),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sync_relay_operation_per_user_unique UNIQUE (user_id, operation_id),
    CONSTRAINT sync_relay_device_sequence_per_user_unique UNIQUE (user_id, device_id, device_sequence),
    CONSTRAINT sync_relay_operation_identity_matches CHECK (
        operation_id = device_id || '/' || device_sequence::TEXT
    ),
    CONSTRAINT sync_relay_payload_matches_kind CHECK (
        (kind = 'upsert' AND record_payload IS NOT NULL AND jsonb_typeof(record_payload) = 'object')
        OR (kind = 'delete' AND record_payload IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_sync_relay_user_sequence
    ON public.sync_relay_operations (user_id, relay_seq);

ALTER TABLE public.sync_relay_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_relay_operations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync relay select own operations" ON public.sync_relay_operations;
CREATE POLICY "sync relay select own operations"
    ON public.sync_relay_operations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "sync relay insert own operations" ON public.sync_relay_operations;
CREATE POLICY "sync relay insert own operations"
    ON public.sync_relay_operations
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Authenticated clients are deliberately unable to mutate committed operations.
REVOKE ALL PRIVILEGES ON TABLE public.sync_relay_operations FROM anon, authenticated;
GRANT SELECT ON TABLE public.sync_relay_operations TO authenticated;
GRANT INSERT (
    user_id,
    operation_id,
    protocol_version,
    device_id,
    device_sequence,
    domain,
    entity_id,
    kind,
    occurred_at,
    record_payload,
    sync_metadata
) ON TABLE public.sync_relay_operations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.sync_relay_operations_relay_seq_seq TO authenticated;
