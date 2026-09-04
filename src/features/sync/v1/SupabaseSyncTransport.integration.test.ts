import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { AppDatabase } from '../../../data/database.ts'
import type { Todo } from '../../todo/types.ts'
import { SyncEngine } from './SyncEngine.ts'
import {
  commitLocalCreate,
  commitLocalUpsert,
  ensureSyncAccountBinding,
  initializeSyncDevice,
} from './localMutation.ts'
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
if (enabled && !configured) {
  const missing = required.filter((key) => !environment[key])
  throw new Error(`Real Supabase verification is enabled but missing: ${missing.join(', ')}`)
}

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

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

async function latestRelaySequence(client: SupabaseClient): Promise<string> {
  const result = await client
    .from('sync_relay_operations')
    .select('relay_seq')
    .order('relay_seq', { ascending: false })
    .limit(1)
  assert.equal(result.error, null)
  return result.data?.[0]?.relay_seq === undefined
    ? '0'
    : String(result.data[0].relay_seq)
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
      operation_id: `${deviceId}/2`,
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

  it('runs authenticated device A → B → A through real SyncEngine convergence', async () => {
    const url = environment.LIFEOS_SUPABASE_TEST_URL!
    const anonKey = environment.LIFEOS_SUPABASE_TEST_ANON_KEY!
    const clientDeviceA = createClient(url, anonKey, { auth: { persistSession: false } })
    const clientDeviceB = createClient(url, anonKey, { auth: { persistSession: false } })
    const clientOtherUser = createClient(url, anonKey, { auth: { persistSession: false } })
    const [authDeviceA, authDeviceB, authOther] = await Promise.all([
      clientDeviceA.auth.signInWithPassword({
        email: environment.LIFEOS_SUPABASE_TEST_USER_A_EMAIL!,
        password: environment.LIFEOS_SUPABASE_TEST_USER_A_PASSWORD!,
      }),
      clientDeviceB.auth.signInWithPassword({
        email: environment.LIFEOS_SUPABASE_TEST_USER_A_EMAIL!,
        password: environment.LIFEOS_SUPABASE_TEST_USER_A_PASSWORD!,
      }),
      clientOtherUser.auth.signInWithPassword({
        email: environment.LIFEOS_SUPABASE_TEST_USER_B_EMAIL!,
        password: environment.LIFEOS_SUPABASE_TEST_USER_B_PASSWORD!,
      }),
    ])
    assert.equal(authDeviceA.error, null)
    assert.equal(authDeviceB.error, null)
    assert.equal(authOther.error, null)

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const databaseA = new AppDatabase(`sync-cloud-device-a-${suffix}`)
    const databaseB = new AppDatabase(`sync-cloud-device-b-${suffix}`)
    try {
      const baseline = await latestRelaySequence(clientDeviceA)
      const transportA = new SupabaseSyncTransport({ client: clientDeviceA, pageSize: 1 })
      const transportB = new SupabaseSyncTransport({ client: clientDeviceB, pageSize: 1 })
      const userId = authDeviceA.data.user!.id
      transportA.bindExpectedUser(userId)
      transportB.bindExpectedUser(userId)
      await initializeSyncDevice(databaseA, `real-device-a-${suffix}`)
      await initializeSyncDevice(databaseB, `real-device-b-${suffix}`)
      await ensureSyncAccountBinding(databaseA, userId)
      await ensureSyncAccountBinding(databaseB, userId)
      await databaseA.syncCheckpoints.put({
        transportId: transportA.id,
        cursor: baseline,
        updatedAt: new Date().toISOString(),
      })
      await databaseB.syncCheckpoints.put({
        transportId: transportB.id,
        cursor: baseline,
        updatedAt: new Date().toISOString(),
      })
      const engineA = new SyncEngine(transportA, { database: databaseA })
      const engineB = new SyncEngine(transportB, { database: databaseB })
      const initial = operation(`real-device-a-${suffix}`).record as Todo
      const createOperation = await commitLocalCreate(
        'todo',
        initial,
        new Date().toISOString(),
        databaseA,
      )

      const firstPush = await engineA.runCycle()
      assert.equal(firstPush.complete, true)
      assert.equal(firstPush.error, null)
      const firstPull = await engineB.runCycle()
      assert.equal(firstPull.complete, true)
      assert.deepEqual(await databaseB.todos.get(initial.id), await databaseA.todos.get(initial.id))

      const onB = (await databaseB.todos.get(initial.id))!
      const updateOperation = await commitLocalUpsert(
        'todo',
        { ...onB, title: 'Updated on authenticated device B', updatedAt: new Date().toISOString() },
        new Date().toISOString(),
        databaseB,
      )
      const secondPush = await engineB.runCycle()
      assert.equal(secondPush.complete, true)
      const secondPull = await engineA.runCycle()
      assert.equal(secondPull.complete, true)
      assert.deepEqual(await databaseA.todos.get(initial.id), await databaseB.todos.get(initial.id))
      assert.equal((await databaseA.todos.get(initial.id))?.title, 'Updated on authenticated device B')

      assert.equal((await transportA.push([createOperation]))[0]?.status, 'accepted')
      assert.equal((await transportA.push([createOperation]))[0]?.status, 'accepted')
      const duplicateCount = await clientDeviceA
        .from('sync_relay_operations')
        .select('relay_seq', { count: 'exact', head: true })
        .eq('operation_id', createOperation.operationId)
      assert.equal(duplicateCount.error, null)
      assert.equal(duplicateCount.count, 1)

      const pageOne = await transportA.pull(baseline)
      const pageTwo = await transportA.pull(pageOne.nextCheckpoint)
      assert.equal(pageOne.operations[0] && (pageOne.operations[0] as SyncOperation).operationId, createOperation.operationId)
      assert.equal(pageTwo.operations[0] && (pageTwo.operations[0] as SyncOperation).operationId, updateOperation.operationId)
      assert.equal(BigInt(pageTwo.nextCheckpoint) > BigInt(pageOne.nextCheckpoint), true)
      assert.equal(
        (await databaseA.syncCheckpoints.get(transportA.id))?.cursor,
        pageTwo.nextCheckpoint,
      )
      assert.equal(
        (await databaseB.syncCheckpoints.get(transportB.id))?.cursor,
        pageTwo.nextCheckpoint,
      )

      const otherOperation = operation(`real-other-user-${suffix}`)
      const otherTransport = new SupabaseSyncTransport({ client: clientOtherUser })
      assert.equal((await otherTransport.push([otherOperation]))[0]?.status, 'accepted')
      const crossUserRead = await clientDeviceA
        .from('sync_relay_operations')
        .select('relay_seq')
        .eq('operation_id', otherOperation.operationId)
      assert.equal(crossUserRead.error, null)
      assert.deepEqual(crossUserRead.data, [])
    } finally {
      await Promise.all([
        databaseA.delete(),
        databaseB.delete(),
        clientDeviceA.auth.signOut(),
        clientDeviceB.auth.signOut(),
        clientOtherUser.auth.signOut(),
      ])
    }
  })
})
