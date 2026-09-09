import { db } from '../../../data/database.ts'
import { SyncEngine } from './SyncEngine.ts'
import { SyncRuntime } from './SyncRuntime.ts'
import { createConfiguredSyncTransport } from './configuredTransport.ts'
import type { SyncCycleResult } from './types.ts'

/** Browser composition root: reuse the single configured Supabase client. */
export function createConfiguredSyncRuntime(
  onRemoteApplied: (result: SyncCycleResult) => Promise<void> | void,
): SyncRuntime {
  const transport = createConfiguredSyncTransport()
  return new SyncRuntime({
    database: db,
    transport,
    engine: transport === null ? null : new SyncEngine(transport, { database: db }),
    onRemoteApplied,
  })
}
