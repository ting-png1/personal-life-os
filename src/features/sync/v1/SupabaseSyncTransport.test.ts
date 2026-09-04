import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { Todo } from '../../todo/types.ts'
import { createInitialMetadata } from './reconciliation.ts'
import {
  SupabaseSyncTransport,
  SupabaseSyncTransportError,
  type SupabaseRelayError,
  type SupabaseRelayGateway,
  type SupabaseRelayRow,
} from './SupabaseSyncTransport.ts'
import type { SyncOperation } from './types.ts'

type StoredRelayRow = SupabaseRelayRow & {
  relay_seq: number
  received_at: string
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function todo(id: string, title = id): Todo {
  return {
    id,
    title,
    description: null,
    dueDate: '2026-09-04',
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    priority: 2,
    category: null,
    recurrence: 'none',
    completedDates: [],
    completed: false,
    completedAt: null,
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
  }
}

function operation(sequence: number, id = `todo-${sequence}`): SyncOperation {
  const deviceId = 'transport-device'
  const record = todo(id)
  const stamp = { counter: sequence, deviceId }
  return {
    protocolVersion: 1,
    operationId: `${deviceId}/${sequence}`,
    deviceId,
    sequence,
    domain: 'todo',
    entityId: id,
    kind: 'upsert',
    occurredAt: '2099-01-01T00:00:00.000Z',
    record,
    metadata: createInitialMetadata('todo', record, stamp),
  }
}

class MockRelayGateway implements SupabaseRelayGateway {
  userId: string | null = 'user-a'
  authError: SupabaseRelayError | null = null
  rows: StoredRelayRow[] = []
  insertErrorByOperation = new Map<string, SupabaseRelayError | 'throw'>()
  selectOverride: unknown | undefined
  selectedAsUser: string[] = []

  async getAuthenticatedUser() {
    return { userId: this.userId, error: this.authError }
  }

  async insert(row: SupabaseRelayRow) {
    const configured = this.insertErrorByOperation.get(row.operation_id)
    if (configured === 'throw') throw new Error('simulated network failure')
    if (configured) return { error: configured }
    if (this.rows.some((item) =>
      item.user_id === row.user_id && item.operation_id === row.operation_id)) {
      return { error: { code: '23505', message: 'duplicate operation' } }
    }
    this.rows.push({
      ...clone(row),
      relay_seq: this.rows.length + 1,
      received_at: `2026-09-04T00:00:0${this.rows.length}.000Z`,
    })
    return { error: null }
  }

  async selectAfter(input: { userId: string; checkpoint: string; limit: number }) {
    this.selectedAsUser.push(input.userId)
    if (this.selectOverride !== undefined) return { data: this.selectOverride, error: null }
    return {
      data: this.rows
        .filter((row) => row.user_id === input.userId && BigInt(row.relay_seq) > BigInt(input.checkpoint))
        .sort((left, right) => left.relay_seq - right.relay_seq)
        .slice(0, input.limit)
        .map(clone),
      error: null,
    }
  }
}

describe('SupabaseSyncTransport push contract', () => {
  it('maps a duplicate operation insert to idempotent accepted without a second relay row', async () => {
    const gateway = new MockRelayGateway()
    const transport = new SupabaseSyncTransport({ gateway })
    const input = operation(1)

    assert.deepEqual(await transport.push([input]), [{
      operationId: input.operationId,
      status: 'accepted',
      errorCode: null,
    }])
    assert.deepEqual(await transport.push([input]), [{
      operationId: input.operationId,
      status: 'accepted',
      errorCode: null,
    }])
    assert.equal(gateway.rows.length, 1)
  })

  it('maps per-operation retry/rejection independently and preserves accepted work', async () => {
    const gateway = new MockRelayGateway()
    const transport = new SupabaseSyncTransport({ gateway })
    const accepted = operation(1)
    const retry = operation(2)
    const rejected = operation(3)
    gateway.insertErrorByOperation.set(retry.operationId, 'throw')
    gateway.insertErrorByOperation.set(rejected.operationId, {
      code: '23514',
      message: 'check constraint failed',
    })

    assert.deepEqual(await transport.push([accepted, retry, rejected]), [
      { operationId: accepted.operationId, status: 'accepted', errorCode: null },
      { operationId: retry.operationId, status: 'retry', errorCode: 'Error' },
      { operationId: rejected.operationId, status: 'rejected', errorCode: '23514' },
    ])
    assert.deepEqual(gateway.rows.map((row) => row.operation_id), [accepted.operationId])
  })

  it('derives user_id only from authenticated Supabase state', async () => {
    const gateway = new MockRelayGateway()
    gateway.userId = 'authenticated-user'
    const transport = new SupabaseSyncTransport({ gateway })
    await transport.push([operation(1)])
    await transport.pull(null)

    assert.equal(gateway.rows[0]?.user_id, 'authenticated-user')
    assert.deepEqual(gateway.selectedAsUser, ['authenticated-user'])
  })

  it('does not upload if the authenticated account changes after local binding', async () => {
    const gateway = new MockRelayGateway()
    const transport = new SupabaseSyncTransport({ gateway })
    transport.bindExpectedUser('user-a')
    gateway.userId = 'user-b'

    assert.equal((await transport.push([operation(1)]))[0]?.status, 'retry')
    assert.equal(gateway.rows.length, 0)
    await assert.rejects(transport.pull(null), /account changed during sync/)
  })
})

describe('SupabaseSyncTransport pull contract', () => {
  it('uses stable relay_seq ordering and paginated checkpoints only', async () => {
    const gateway = new MockRelayGateway()
    const writer = new SupabaseSyncTransport({ gateway })
    await writer.push([operation(1), operation(2), operation(3)])
    const reader = new SupabaseSyncTransport({ gateway, pageSize: 2 })

    const first = await reader.pull(null)
    assert.deepEqual(
      first.operations.map((item) => (item as SyncOperation).operationId),
      ['transport-device/1', 'transport-device/2'],
    )
    assert.equal(first.nextCheckpoint, '2')
    assert.equal(first.hasMore, true)

    const second = await reader.pull(first.nextCheckpoint)
    assert.deepEqual(
      second.operations.map((item) => (item as SyncOperation).operationId),
      ['transport-device/3'],
    )
    assert.equal(second.nextCheckpoint, '3')
    assert.equal(second.hasMore, false)
  })

  it('rejects malformed pages, cross-user rows, and non-monotonic relay_seq', async () => {
    const gateway = new MockRelayGateway()
    const transport = new SupabaseSyncTransport({ gateway })
    gateway.selectOverride = { unexpected: true }
    await assert.rejects(transport.pull(null), SupabaseSyncTransportError)

    await gateway.insert(operationToRelayRow(operation(1), 'user-b'))
    gateway.selectOverride = gateway.rows
    await assert.rejects(transport.pull(null), /cross-user relay row rejected/)

    const validGateway = new MockRelayGateway()
    await validGateway.insert(operationToRelayRow(operation(1), 'user-a'))
    await validGateway.insert(operationToRelayRow(operation(2), 'user-a'))
    validGateway.selectOverride = [validGateway.rows[1], validGateway.rows[0]]
    await assert.rejects(
      new SupabaseSyncTransport({ gateway: validGateway }).pull(null),
      /ordering is not strictly increasing/,
    )
  })
})

function operationToRelayRow(input: SyncOperation, userId: string): SupabaseRelayRow {
  return {
    user_id: userId,
    operation_id: input.operationId,
    protocol_version: input.protocolVersion,
    device_id: input.deviceId,
    device_sequence: input.sequence,
    domain: input.domain,
    entity_id: input.entityId,
    kind: input.kind,
    occurred_at: input.occurredAt,
    record_payload: input.record,
    sync_metadata: input.metadata,
  }
}

describe('Supabase Sync Relay migration contract', () => {
  it('keeps ordering/server time generated by Postgres and grants authenticated users append-only own-row access', () => {
    const sql = readFileSync(
      new URL('../../../../supabase/migrations/002_sync_relay_v1.sql', import.meta.url),
      'utf8',
    )
    assert.match(sql, /relay_seq BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY/i)
    assert.match(sql, /received_at TIMESTAMPTZ NOT NULL DEFAULT now\(\)/i)
    assert.match(sql, /UNIQUE \(user_id, operation_id\)/i)
    assert.match(sql, /UNIQUE \(user_id, device_id, device_sequence\)/i)
    assert.match(sql, /protocol_version = 1/i)
    assert.match(sql, /operation_id = device_id \|\| '\/' \|\| device_sequence::TEXT/i)
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/i)
    assert.match(sql, /FOR SELECT[\s\S]*USING \(user_id = auth\.uid\(\)\)/i)
    assert.match(sql, /FOR INSERT[\s\S]*WITH CHECK \(user_id = auth\.uid\(\)\)/i)
    assert.match(sql, /REVOKE ALL PRIVILEGES[\s\S]*FROM anon, authenticated/i)
    assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,120}FOR (UPDATE|DELETE)/i)
    const insertGrant = sql.match(/GRANT INSERT \(([\s\S]*?)\) ON TABLE/i)?.[1] ?? ''
    assert.equal(insertGrant.includes('relay_seq'), false)
    assert.equal(insertGrant.includes('received_at'), false)
  })
})
