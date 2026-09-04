import { isSupabaseConfigured, supabase } from '../../../shared/lib/supabase.ts'
import { SupabaseSyncTransport } from './SupabaseSyncTransport.ts'

export function createConfiguredSyncTransport(): SupabaseSyncTransport | null {
  if (!isSupabaseConfigured || supabase === null) return null
  return new SupabaseSyncTransport({ client: supabase })
}
