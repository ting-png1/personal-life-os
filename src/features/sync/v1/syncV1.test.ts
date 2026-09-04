import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { AppDatabase } from '../../../data/database.ts'
import type { ContinuityItem } from '../../continuity/types.ts'
import type { DailyHealthMetric, DailyHealthSummary } from '../../health/types.ts'
import type { ScheduleEvent } from '../../schedule/types.ts'
import type { Todo } from '../../todo/types.ts'
import { SyncEngine } from './SyncEngine.ts'
import {
  bootstrapLocalFactsForSync,
  commitLocalCreate,
  commitLocalDelete,
  commitLocalUpsert,
  ensureSyncAccountBinding,
  initializeSyncDevice,
} from './localMutation.ts'
import type {
  SyncDomainRecord,
  SyncOperation,
  SyncOutboxEntry,
  SyncPullPage,
  SyncPushResult,
  SyncTransport,
} from './types.ts'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

const databases: AppDatabase[] = []

function database(label: string): AppDatabase {
  const result = new AppDatabase(`lifeos-sync-v1-${label}-${Date.now()}-${Math.random()}`)
  databases.push(result)
  return result
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function asOperation(entry: SyncOutboxEntry): SyncOperation {
  return {
    protocolVersion: entry.protocolVersion,
    operationId: entry.operationId,
    deviceId: entry.deviceId,
    sequence: entry.sequence,
    domain: entry.domain,
    entityId: entry.entityId,
    kind: entry.kind,
    occurredAt: entry.occurredAt,
    record: clone(entry.record),
    metadata: clone(entry.metadata),
  }
}

class MemoryRelay implements SyncTransport {
  readonly id = 'memory-relay'
  readonly operations: SyncOperation[] = []
  readonly operationIds = new Set<string>()
  pageSize = 100
  loseNextPushResponse = false
  failPullCall: number | null = null
  pullCalls = 0
  pushPolicy: ((operation: SyncOperation, index: number) => SyncPushResult['status']) | null = null

  async push(operations: SyncOperation[]): Promise<SyncPushResult[]> {
    const results = operations.map((operation, index): SyncPushResult => {
      const status = this.pushPolicy?.(operation, index) ?? 'accepted'
      if (status === 'accepted' && !this.operationIds.has(operation.operationId)) {
        this.operationIds.add(operation.operationId)
        this.operations.push(clone(operation))
      }
      return {
        operationId: operation.operationId,
        status,
        errorCode: status === 'accepted' ? null : `simulated-${status}`,
      }
    })
    if (this.loseNextPushResponse) {
      this.loseNextPushResponse = false
      throw new Error('response lost after relay commit')
    }
    return results
  }

  async pull(checkpoint: string | null): Promise<SyncPullPage> {
    this.pullCalls += 1
    if (this.failPullCall === this.pullCalls) throw new Error('simulated pull interruption')
    const offset = checkpoint === null ? 0 : Number(checkpoint)
    const next = Math.min(offset + this.pageSize, this.operations.length)
    return {
      operations: clone(this.operations.slice(offset, next)),
      nextCheckpoint: String(next),
      hasMore: next < this.operations.length,
    }
  }
}

function metric<T>(value: T, collectedAt = '2026-09-01T00:00:00.000Z'): DailyHealthMetric<T> {
  return {
    status: 'available',
    value,
    source: { id: 'health-source', label: 'Health' },
    collectedAt,
    updatedAt: collectedAt,
  }
}

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'shared-todo',
    title: 'Initial title',
    description: null,
    dueDate: null,
    recurrenceStartDate: '2026-09-01',
    recurrenceEndDate: null,
    priority: 2,
    category: null,
    recurrence: 'daily',
    completedDates: [],
    completed: false,
    completedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

function schedule(): ScheduleEvent {
  return {
    id: 'schedule-1',
    title: 'Schedule',
    type: 'personal',
    location: null,
    note: null,
    startDateTime: '2026-09-04T09:00:00+08:00',
    endDateTime: '2026-09-04T10:00:00+08:00',
    recurrence: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

function health(overrides: Partial<DailyHealthSummary> = {}): DailyHealthSummary {
  return {
    date: '2026-09-04',
    sleep: metric({ durationMinutes: 450 }),
    restingHeartRate: metric({ beatsPerMinute: 60 }),
    heartRateVariability: metric({ milliseconds: 40 }),
    steps: metric({ count: 7000 }),
    activity: metric({ activeMinutes: 35 }),
    ...overrides,
  }
}

function continuity(overrides: Partial<ContinuityItem> = {}): ContinuityItem {
  return {
    id: 'continuity-1',
    continuityType: 'life',
    relationshipId: null,
    content: 'Initial continuity',
    status: 'active',
    confirmation: { method: 'manual', confirmedAt: '2026-09-01T00:00:00.000Z' },
    evidence: [{ kind: 'user-statement', reference: null, note: null, observedAt: null }],
    lifecycle: [{ type: 'confirmed', at: '2026-09-01T00:00:00.000Z' }],
    supersedesId: null,
    supersededById: null,
    expiredAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  } as ContinuityItem
}

async function device(label: string, relay: MemoryRelay) {
  const local = database(label)
  await initializeSyncDevice(local, `device-${label}`)
  let tick = 0
  const engine = new SyncEngine(relay, {
    database: local,
    now: () => new Date(Date.UTC(2026, 8, 4, 0, 0, tick++)).toISOString(),
  })
  return { database: local, engine }
}

async function converge(
  first: { engine: SyncEngine },
  second: { engine: SyncEngine },
): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await first.engine.runCycle()
    await second.engine.runCycle()
  }
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((item) => item.delete()))
})

describe('Sync v1 Local-First contract', () => {
  it('writes a fact and its stable operation to the durable outbox atomically', async () => {
    const local = database('durable')
    await initializeSyncDevice(local, 'device-durable')
    const operation = await commitLocalUpsert(
      'todo',
      todo(),
      '2035-01-01T00:00:00.000Z',
      local,
    )
    assert.equal(operation.operationId, 'device-durable/1')
    assert.equal((await local.todos.get('shared-todo'))?.title, 'Initial title')
    assert.equal((await local.syncOutbox.get(operation.operationId))?.status, 'pending')
    assert.equal((await local.syncReplicas.get(['todo', 'shared-todo']))?.deleted, false)
  })

  it('rolls back the fact, replica, and logical counter if durable outbox persistence fails', async () => {
    const local = database('local-atomic-failure')
    await initializeSyncDevice(local, 'device-local-atomic-failure')
    local.syncOutbox.hook('creating', () => {
      throw new Error('simulated outbox failure')
    })

    await assert.rejects(
      commitLocalCreate('todo', todo(), '2026-09-04T00:00:00.000Z', local),
      /simulated outbox failure/,
    )
    assert.equal(await local.todos.count(), 0)
    assert.equal(await local.syncReplicas.count(), 0)
    assert.equal((await local.syncDeviceState.get('local'))?.logicalCounter, 0)
  })

  it('preserves create collision semantics and can tombstone an already-missing identity', async () => {
    const local = database('create-delete-semantics')
    await initializeSyncDevice(local, 'device-create-delete-semantics')
    await commitLocalCreate('todo', todo(), '2026-09-04T00:00:00.000Z', local)
    await assert.rejects(
      commitLocalCreate('todo', todo(), '2026-09-04T00:01:00.000Z', local),
    )
    assert.equal(await local.syncOutbox.count(), 1)

    const deletion = await commitLocalDelete(
      'todo',
      'missing-on-this-device',
      '2026-09-04T00:02:00.000Z',
      local,
    )
    assert.equal(deletion.kind, 'delete')
    assert.equal(deletion.metadata.tombstone !== null, true)
    assert.equal(
      (await local.syncReplicas.get(['todo', 'missing-on-this-device']))?.deleted,
      true,
    )
  })

  it('bootstraps pre-Sync facts without rewriting legacy Todo rows', async () => {
    const local = database('legacy-bootstrap')
    await initializeSyncDevice(local, 'device-legacy-bootstrap')
    const legacy = clone(todo()) as unknown as Record<string, unknown>
    delete legacy.category
    delete legacy.recurrence
    delete legacy.recurrenceStartDate
    delete legacy.recurrenceEndDate
    delete legacy.completedDates
    await local.todos.add(legacy as unknown as Todo)

    assert.equal(
      await bootstrapLocalFactsForSync(local, '2026-09-04T00:00:00.000Z'),
      1,
    )
    assert.equal(await bootstrapLocalFactsForSync(local, '2099-01-01T00:00:00.000Z'), 0)
    const operation = (await local.syncOutbox.toArray())[0]
    assert.equal((operation?.record as Todo).recurrence, 'none')
    assert.deepEqual((operation?.record as Todo).completedDates, [])
    const raw = await local.table<Record<string, unknown>>('todos').get('shared-todo')
    assert.equal(Object.prototype.hasOwnProperty.call(raw, 'recurrence'), false)
  })

  it('binds one local profile to one authenticated sync user', async () => {
    const local = database('account-binding')
    await initializeSyncDevice(local, 'device-account-binding')
    await ensureSyncAccountBinding(local, 'user-a')
    await ensureSyncAccountBinding(local, 'user-a')
    assert.equal((await local.syncDeviceState.get('local'))?.boundUserId, 'user-a')
    await assert.rejects(
      ensureSyncAccountBinding(local, 'user-b'),
      /already bound to a different sync account/,
    )
  })

  it('syncs all six allowed fact domains without including Action Audit or derived state', async () => {
    const relay = new MemoryRelay()
    const first = await device('all-a', relay)
    const second = await device('all-b', relay)
    const records: Array<[Parameters<typeof commitLocalUpsert>[0], SyncDomainRecord]> = [
      ['todo', todo()],
      ['schedule', schedule()],
      ['mood', {
        id: 'mood-1', date: '2026-09-04', level: 4, tags: ['steady'], note: null,
        createdAt: '2026-09-04T01:00:00.000Z', updatedAt: '2026-09-04T01:00:00.000Z',
      }],
      ['cycle', {
        id: 'period-1', startDate: '2026-09-01', endDate: '2026-09-04', flowLevel: 2,
        symptoms: [], note: null, createdAt: '2026-09-01T01:00:00.000Z', updatedAt: '2026-09-04T01:00:00.000Z',
      }],
      ['health', health()],
      ['continuity', continuity()],
    ]
    for (const [domain, record] of records) {
      await commitLocalUpsert(domain, record, '2026-09-04T02:00:00.000Z', first.database)
    }

    await converge(first, second)
    assert.equal(await second.database.todos.count(), 1)
    assert.equal(await second.database.scheduleEvents.count(), 1)
    assert.equal(await second.database.moodRecords.count(), 1)
    assert.equal(await second.database.periodRecords.count(), 1)
    assert.equal(await second.database.dailyHealthSummaries.count(), 1)
    assert.equal(await second.database.continuityItems.count(), 1)
    assert.equal(await second.database.actionAuditRecords.count(), 0)
    assert.equal(relay.operations.length, 6)
  })
})

describe('Sync v1 deterministic reconciliation', () => {
  it('merges offline Todo fields, recurrence group, and per-occurrence completion without wall-clock LWW', async () => {
    const relay = new MemoryRelay()
    const first = await device('todo-a', relay)
    const second = await device('todo-b', relay)
    await commitLocalUpsert('todo', todo(), '2040-01-01T00:00:00.000Z', first.database)
    await converge(first, second)

    const firstTodo = (await first.database.todos.get('shared-todo'))!
    await commitLocalUpsert('todo', {
      ...firstTodo,
      title: 'Changed on A',
      recurrenceEndDate: '2026-12-31',
      updatedAt: '2040-01-01T00:00:00.000Z',
    }, '2040-01-01T00:00:00.000Z', first.database)
    const secondTodo = (await second.database.todos.get('shared-todo'))!
    await commitLocalUpsert('todo', {
      ...secondTodo,
      priority: 1,
      completedDates: ['2026-09-04'],
      updatedAt: '2020-01-01T00:00:00.000Z',
    }, '2020-01-01T00:00:00.000Z', second.database)

    await converge(first, second)
    const left = await first.database.todos.get('shared-todo')
    const right = await second.database.todos.get('shared-todo')
    assert.deepEqual(left, right)
    assert.equal(left?.title, 'Changed on A')
    assert.equal(left?.priority, 1)
    assert.equal(left?.recurrenceEndDate, '2026-12-31')
    assert.deepEqual(left?.completedDates, ['2026-09-04'])
  })

  it('resolves a same-field conflict by logical stamp/device identity despite opposite clock skew', async () => {
    const relay = new MemoryRelay()
    const first = await device('clock-a', relay)
    const second = await device('clock-b', relay)
    await commitLocalUpsert('todo', todo(), '2035-01-01T00:00:00.000Z', first.database)
    await converge(first, second)
    await commitLocalUpsert('todo', { ...(await first.database.todos.get('shared-todo'))!, title: 'A future clock' }, '2099-01-01T00:00:00.000Z', first.database)
    await commitLocalUpsert('todo', { ...(await second.database.todos.get('shared-todo'))!, title: 'B past clock' }, '2000-01-01T00:00:00.000Z', second.database)

    await converge(first, second)
    assert.equal((await first.database.todos.get('shared-todo'))?.title, 'B past clock')
    assert.deepEqual(await first.database.todos.get('shared-todo'), await second.database.todos.get('shared-todo'))
  })

  it('makes tombstones dominate an offline edit and prevents resurrection on later replay', async () => {
    const relay = new MemoryRelay()
    const first = await device('delete-a', relay)
    const second = await device('delete-b', relay)
    await commitLocalUpsert('todo', todo(), '2026-09-01T00:00:00.000Z', first.database)
    await converge(first, second)

    await commitLocalDelete('todo', 'shared-todo', '2026-09-04T00:00:00.000Z', first.database)
    await commitLocalUpsert('todo', { ...(await second.database.todos.get('shared-todo'))!, title: 'Offline stale edit' }, '2099-01-01T00:00:00.000Z', second.database)
    await converge(first, second)

    const reversedReplay = await device('delete-replay', relay)
    relay.operations.reverse()
    await reversedReplay.engine.runCycle()

    assert.equal(await first.database.todos.get('shared-todo'), undefined)
    assert.equal(await second.database.todos.get('shared-todo'), undefined)
    assert.equal(await reversedReplay.database.todos.get('shared-todo'), undefined)
    assert.equal((await first.database.syncReplicas.get(['todo', 'shared-todo']))?.deleted, true)
    assert.equal((await second.database.syncReplicas.get(['todo', 'shared-todo']))?.deleted, true)
  })

  it('merges Health per metric by normalized provenance/freshness and Continuity as one lifecycle unit', async () => {
    const relay = new MemoryRelay()
    const first = await device('semantic-a', relay)
    const second = await device('semantic-b', relay)
    await commitLocalUpsert('health', health(), '2026-09-01T00:00:00.000Z', first.database)
    await commitLocalUpsert('continuity', continuity(), '2026-09-01T00:00:00.000Z', first.database)
    await converge(first, second)

    const firstHealth = (await first.database.dailyHealthSummaries.get('2026-09-04'))!
    await commitLocalUpsert('health', {
      ...firstHealth,
      sleep: metric({ durationMinutes: 500 }, '2026-09-04T03:00:00.000Z'),
    }, '2099-01-01T00:00:00.000Z', first.database)
    const secondHealth = (await second.database.dailyHealthSummaries.get('2026-09-04'))!
    await commitLocalUpsert('health', {
      ...secondHealth,
      steps: metric({ count: 9000 }, '2026-09-04T04:00:00.000Z'),
    }, '2000-01-01T00:00:00.000Z', second.database)

    const firstContinuity = (await first.database.continuityItems.get('continuity-1'))!
    await commitLocalUpsert('continuity', continuity({
      ...firstContinuity,
      content: 'A lifecycle',
      lifecycle: [...firstContinuity.lifecycle, { type: 'updated', at: '2099-01-01T00:00:00.000Z' }],
      updatedAt: '2099-01-01T00:00:00.000Z',
    }), '2099-01-01T00:00:00.000Z', first.database)
    const secondContinuity = (await second.database.continuityItems.get('continuity-1'))!
    await commitLocalUpsert('continuity', continuity({
      ...secondContinuity,
      content: 'B lifecycle',
      lifecycle: [...secondContinuity.lifecycle, { type: 'updated', at: '2000-01-01T00:00:00.000Z' }],
      updatedAt: '2000-01-01T00:00:00.000Z',
    }), '2000-01-01T00:00:00.000Z', second.database)

    await converge(first, second)
    const mergedHealth = await first.database.dailyHealthSummaries.get('2026-09-04')
    assert.equal(mergedHealth?.sleep.status === 'available' ? mergedHealth.sleep.value.durationMinutes : null, 500)
    assert.equal(mergedHealth?.steps.status === 'available' ? mergedHealth.steps.value.count : null, 9000)
    assert.deepEqual(mergedHealth, await second.database.dailyHealthSummaries.get('2026-09-04'))
    const mergedContinuity = await first.database.continuityItems.get('continuity-1')
    assert.equal(mergedContinuity?.content, 'B lifecycle')
    assert.equal(
      mergedContinuity?.lifecycle[mergedContinuity.lifecycle.length - 1]?.at,
      '2000-01-01T00:00:00.000Z',
    )
    assert.deepEqual(mergedContinuity, await second.database.continuityItems.get('continuity-1'))
  })
})

describe('Sync v1 idempotency and failure recovery', () => {
  it('retries the same operationId after a lost response and the relay stores it once', async () => {
    const relay = new MemoryRelay()
    const local = await device('retry', relay)
    await commitLocalUpsert('todo', todo(), '2026-09-04T00:00:00.000Z', local.database)
    relay.loseNextPushResponse = true
    await assert.rejects(local.engine.pushPending(), /response lost/)
    assert.equal(relay.operations.length, 1)
    assert.equal(await local.engine.pendingCount(), 1)
    assert.equal((await local.database.syncOutbox.toArray())[0]?.attemptCount, 1)

    assert.deepEqual(await local.engine.pushPending(), { pushed: 1, blocked: 0 })
    assert.equal(relay.operations.length, 1)
    assert.equal(await local.engine.pendingCount(), 0)
  })

  it('keeps retryable partial push failures and blocks deterministic rejection without losing accepted work', async () => {
    const relay = new MemoryRelay()
    const local = await device('partial-push', relay)
    await commitLocalUpsert('todo', todo({ id: 'todo-a' }), '2026-09-04T00:00:00.000Z', local.database)
    await commitLocalUpsert('todo', todo({ id: 'todo-b' }), '2026-09-04T00:01:00.000Z', local.database)
    await commitLocalUpsert('todo', todo({ id: 'todo-c' }), '2026-09-04T00:02:00.000Z', local.database)
    relay.pushPolicy = (_operation, index) => index === 0 ? 'accepted' : index === 1 ? 'retry' : 'rejected'

    assert.deepEqual(await local.engine.pushPending(), { pushed: 1, blocked: 1 })
    assert.equal(await local.database.syncOutbox.where('status').equals('pending').count(), 1)
    assert.equal(await local.database.syncOutbox.where('status').equals('blocked').count(), 1)
    assert.equal(relay.operations.length, 1)
  })

  it('deduplicates repeated and out-of-order remote operations', async () => {
    const relay = new MemoryRelay()
    const source = await device('order-source', relay)
    const target = await device('order-target', relay)
    await commitLocalUpsert('todo', todo(), '2026-09-01T00:00:00.000Z', source.database)
    await commitLocalUpsert('todo', todo({ title: 'Second state' }), '2026-09-02T00:00:00.000Z', source.database)
    const entries = await source.database.syncOutbox.orderBy('createdAt').toArray()
    const first = asOperation(entries[0]!)
    const second = asOperation(entries[1]!)

    const result = await target.engine.applyPullPage({
      operations: [second, first, second],
      nextCheckpoint: '3',
      hasMore: false,
    })
    assert.deepEqual(result, { pulled: 2, rejected: 0 })
    assert.equal((await target.database.todos.get('shared-todo'))?.title, 'Second state')
    assert.equal(await target.database.syncAppliedOperations.count(), 2)
  })

  it('advances checkpoints only for committed pages and resumes after pull interruption', async () => {
    const relay = new MemoryRelay()
    relay.pageSize = 1
    const source = await device('pull-source', relay)
    const target = await device('pull-target', relay)
    await commitLocalUpsert('todo', todo({ id: 'todo-1' }), '2026-09-01T00:00:00.000Z', source.database)
    await commitLocalUpsert('schedule', schedule(), '2026-09-01T00:01:00.000Z', source.database)
    await source.engine.pushPending()
    relay.failPullCall = 2

    const interrupted = await target.engine.runCycle()
    assert.equal(interrupted.complete, false)
    assert.equal(interrupted.checkpoint, '1')
    assert.equal(await target.database.todos.count(), 1)
    assert.equal(await target.database.scheduleEvents.count(), 0)

    relay.failPullCall = null
    const resumed = await target.engine.runCycle()
    assert.equal(resumed.complete, true)
    assert.equal(resumed.checkpoint, '2')
    assert.equal(await target.database.scheduleEvents.count(), 1)
  })

  it('commits valid remote records, quarantines invalid ones, and never writes unvalidated data', async () => {
    const relay = new MemoryRelay()
    const source = await device('validation-source', relay)
    const target = await device('validation-target', relay)
    await commitLocalUpsert('todo', todo(), '2026-09-01T00:00:00.000Z', source.database)
    const valid = asOperation((await source.database.syncOutbox.toArray())[0]!)
    const invalid = clone(valid)
    invalid.operationId = 'bad-device/99'
    invalid.deviceId = 'bad-device'
    invalid.sequence = 99
    invalid.entityId = 'malicious-todo'
    invalid.record = { ...(invalid.record as Todo), id: 'malicious-todo', title: '' }

    const result = await target.engine.applyPullPage({
      operations: [valid, invalid],
      nextCheckpoint: '2',
      hasMore: false,
    })
    assert.deepEqual(result, { pulled: 1, rejected: 1 })
    assert.equal(await target.database.todos.get('malicious-todo'), undefined)
    assert.equal(await target.database.syncRejectedOperations.count(), 1)
    assert.equal((await target.database.syncCheckpoints.get(relay.id))?.cursor, '2')
  })

  it('rolls back an entire pull page and its checkpoint when local persistence is interrupted', async () => {
    const relay = new MemoryRelay()
    const source = await device('atomic-source', relay)
    const target = await device('atomic-target', relay)
    await commitLocalUpsert('todo', todo(), '2026-09-01T00:00:00.000Z', source.database)
    await commitLocalUpsert('schedule', schedule(), '2026-09-01T00:01:00.000Z', source.database)
    const operations = (await source.database.syncOutbox.toArray()).map(asOperation)
    target.database.scheduleEvents.hook('creating', () => {
      throw new Error('simulated IndexedDB interruption')
    })

    await assert.rejects(
      target.engine.applyPullPage({ operations, nextCheckpoint: '2', hasMore: false }),
      /simulated IndexedDB interruption/,
    )
    assert.equal(await target.database.todos.count(), 0)
    assert.equal(await target.database.scheduleEvents.count(), 0)
    assert.equal(await target.database.syncAppliedOperations.count(), 0)
    assert.equal(await target.database.syncCheckpoints.get(relay.id), undefined)
  })
})
