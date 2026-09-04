import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import type { Todo } from '../../todo/types.ts'
import { createInitialMetadata } from './reconciliation.ts'
import { SupabaseSyncTransport } from './SupabaseSyncTransport.ts'
import type { SyncOperation } from './types.ts'

const environment = process.env
const enabled = environment.LIFEOS_SUPABASE_RELAY_INTEGRATION === '1'
const required = [
  'LIFEOS_SUPABASE_TEST_URL',
  'LIFEOS_SUPABASE_TEST_ANON_KEY',
  'LIFEOS_SUPABASE_TEST_USER_A_EMAIL',
  'LIFEOS_SUPABASE_TEST_USER_A_PASSWORD',
  'LIFEOS_SUPABASE_TEST_USER_B_EMAIL',
  'LIFEOS_SUPABASE_TEST_USER_B_PASSWORD',
] as const
const configured = enabled && required.every((key) => Boolean(environment[key]))

function operation(deviceId: string): SyncOperation {
  const sequence = 1
  const record: Todo = {
    id: `integration-${deviceId}`,
    title: 'Supabase relay integration probe',
    description: null,
    dueDate: null,
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    priority: 2,
    category: null,
    recurrence: 'none',
    completedDates: [],
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const stamp = { counter: sequence, deviceId }
  return {
    protocolVersion: 1,
    operationId: `${deviceId}/${sequence}`,
    deviceId,
    sequence,
    domain: 'todo',
    entityId: record.id,
    kind: 'upsert',
    occurredAt: new Date().toISOString(),
    record,
    metadata: createInitialMetadata('todo', record, stamp),
  }
}

describe('Supabase Sync Relay deployment verification', { skip: !configured }, () => {
  it('verifies real idempotency, append-only pull ordering, and two-user RLS isolation', async () => {
    const url = environment.LIFEOS_SUPABASE_TEST_URL!
    const anonKey = environment.LIFEOS_SUPABASE_TEST_ANON_KEY!
    const clientA = createClient(url, anonKey, { auth: { persistSession: false } })
    const clientB = createClient(url, anonKey, { auth: { persistSession: false } })
    const authA = await clientA.auth.signInWithPassword({
      email: environment.LIFEOS_SUPABASE_TEST_USER_A_EMAIL!,
      password: environment.LIFEOS_SUPABASE_TEST_USER_A_PASSWORD!,
    })
    const authB = await clientB.auth.signInWithPassword({
      email: environment.LIFEOS_SUPABASE_TEST_USER_B_EMAIL!,
      password: environment.LIFEOS_SUPABASE_TEST_USER_B_PASSWORD!,
    })
    assert.equal(authA.error, null)
    assert.equal(authB.error, null)

    const deviceId = `integration-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const probe = operation(deviceId)
    const transportA = new SupabaseSyncTransport({ client: clientA, pageSize: 500 })
    const transportB = new SupabaseSyncTransport({ client: clientB, pageSize: 500 })
    assert.equal((await transportA.push([probe]))[0]?.status, 'accepted')
    assert.equal((await transportA.push([probe]))[0]?.status, 'accepted')

    const ownRow = await clientA
      .from('sync_relay_operations')
      .select('relay_seq,operation_id')
      .eq('operation_id', probe.operationId)
      .single()
    assert.equal(ownRow.error, null)
    const relaySequence = BigInt(String(ownRow.data!.relay_seq))
    const pageA = await transportA.pull(String(relaySequence - 1n))
    assert.equal(
      pageA.operations.some((item) => (item as SyncOperation).operationId === probe.operationId),
      true,
    )
    const pageB = await transportB.pull(String(relaySequence - 1n))
    assert.equal(
      pageB.operations.some((item) => (item as SyncOperation).operationId === probe.operationId),
      false,
    )

    const crossUserWrite = await clientA.from('sync_relay_operations').insert({
      user_id: authB.data.user!.id,
      operation_id: `${deviceId}/cross-user`,
      protocol_version: 1,
      device_id: deviceId,
      device_sequence: 2,
      domain: 'todo',
      entity_id: 'cross-user-probe',
      kind: 'delete',
      occurred_at: new Date().toISOString(),
      record_payload: null,
      sync_metadata: probe.metadata,
    })
    assert.notEqual(crossUserWrite.error, null)
  })
})
