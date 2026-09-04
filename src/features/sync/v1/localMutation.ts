import type { Table } from 'dexie'
import { type AppDatabase, db } from '../../../data/database.ts'
import { generateId } from '../../../shared/lib/id.ts'
import { parseLifeOSSyncableFact } from '../../backup/BackupService.ts'
import { normalizeTodo } from '../../todo/normalization.ts'
import {
  createEmptyMetadata,
  createInitialMetadata,
  evolveMetadata,
  operationId,
} from './reconciliation.ts'
import type {
  SyncDeviceState,
  SyncDomain,
  SyncDomainRecord,
  SyncLogicalStamp,
  SyncOperation,
  SyncOutboxEntry,
  SyncReplicaMetadata,
  SyncReplicaState,
} from './types.ts'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function syncRuntimeTables(database: AppDatabase): Table[] {
  return [
    database.syncOutbox,
    database.syncReplicas,
    database.syncCheckpoints,
    database.syncAppliedOperations,
    database.syncRejectedOperations,
    database.syncDeviceState,
  ]
}

export function tableForDomain(
  database: AppDatabase,
  domain: SyncDomain,
): Table<SyncDomainRecord, string> {
  switch (domain) {
    case 'todo': return database.todos as unknown as Table<SyncDomainRecord, string>
    case 'schedule': return database.scheduleEvents as unknown as Table<SyncDomainRecord, string>
    case 'mood': return database.moodRecords as unknown as Table<SyncDomainRecord, string>
    case 'cycle': return database.periodRecords as unknown as Table<SyncDomainRecord, string>
    case 'health': return database.dailyHealthSummaries as unknown as Table<SyncDomainRecord, string>
    case 'continuity': return database.continuityItems as unknown as Table<SyncDomainRecord, string>
  }
}

const SYNC_DOMAINS: readonly SyncDomain[] = [
  'todo',
  'schedule',
  'mood',
  'cycle',
  'health',
  'continuity',
]

export async function initializeSyncDevice(
  database: AppDatabase,
  deviceId: string,
): Promise<SyncDeviceState> {
  const normalized = deviceId.trim()
  if (normalized === '') throw new Error('Sync deviceId must not be empty')
  return database.transaction('rw', database.syncDeviceState, async () => {
    const existing = await database.syncDeviceState.get('local')
    if (existing) {
      if (existing.deviceId !== normalized) throw new Error('Sync device identity is already initialized')
      return existing
    }
    const state: SyncDeviceState = {
      id: 'local',
      deviceId: normalized,
      logicalCounter: 0,
      boundUserId: null,
    }
    await database.syncDeviceState.add(state)
    return state
  })
}

export class SyncAccountBindingError extends Error {
  constructor() {
    super('This local LifeOS profile is already bound to a different sync account')
    this.name = 'SyncAccountBindingError'
  }
}

export async function ensureSyncAccountBinding(
  database: AppDatabase,
  userId: string,
): Promise<void> {
  const normalized = userId.trim()
  if (normalized === '') throw new Error('Sync userId must not be empty')
  await database.transaction('rw', database.syncDeviceState, async () => {
    const existing = await database.syncDeviceState.get('local')
    if (existing?.boundUserId && existing.boundUserId !== normalized) {
      throw new SyncAccountBindingError()
    }
    await database.syncDeviceState.put({
      id: 'local',
      deviceId: existing?.deviceId ?? generateId(),
      logicalCounter: existing?.logicalCounter ?? 0,
      boundUserId: normalized,
    })
  })
}

/**
 * Creates durable initial operations for facts that predate Sync v1. The
 * existing fact rows are not rewritten; legacy Todo defaults are normalized
 * only inside the protocol envelope.
 */
export async function bootstrapLocalFactsForSync(
  database: AppDatabase,
  occurredAt: string,
): Promise<number> {
  const factTables = SYNC_DOMAINS.map((domain) => tableForDomain(database, domain))
  return database.transaction(
    'rw',
    [...factTables, ...syncRuntimeTables(database)],
    async () => {
      let bootstrapped = 0
      for (const domain of SYNC_DOMAINS) {
        const table = tableForDomain(database, domain)
        for (const rawRecord of await table.toArray()) {
          const record = domain === 'todo'
            ? normalizeTodo(rawRecord as Parameters<typeof normalizeTodo>[0])
            : rawRecord
          const entityId = entityIdFor(domain, record)
          if (await database.syncReplicas.get([domain, entityId])) continue
          await recordLocalUpsertInTransaction(
            database,
            domain,
            null,
            record,
            occurredAt,
          )
          bootstrapped += 1
        }
      }
      return bootstrapped
    },
  )
}

async function nextStamp(database: AppDatabase): Promise<SyncLogicalStamp> {
  let state = await database.syncDeviceState.get('local')
  if (!state) {
    state = {
      id: 'local',
      deviceId: generateId(),
      logicalCounter: 0,
      boundUserId: null,
    }
  }
  const updated: SyncDeviceState = { ...state, logicalCounter: state.logicalCounter + 1 }
  await database.syncDeviceState.put(updated)
  return { counter: updated.logicalCounter, deviceId: updated.deviceId }
}

function entityIdFor(domain: SyncDomain, record: SyncDomainRecord): string {
  return domain === 'health'
    ? String((record as unknown as { date: string }).date)
    : String((record as unknown as { id: string }).id)
}

async function enqueue(
  database: AppDatabase,
  domain: SyncDomain,
  entityId: string,
  kind: SyncOperation['kind'],
  record: SyncDomainRecord | null,
  metadata: SyncReplicaMetadata,
  stamp: SyncLogicalStamp,
  occurredAt: string,
): Promise<SyncOperation> {
  const operation: SyncOperation = {
    protocolVersion: 1,
    operationId: operationId(stamp.deviceId, stamp.counter),
    deviceId: stamp.deviceId,
    sequence: stamp.counter,
    domain,
    entityId,
    kind,
    occurredAt,
    record: record === null ? null : clone(record),
    metadata: clone(metadata),
  }
  const entry: SyncOutboxEntry = {
    ...operation,
    status: 'pending',
    attemptCount: 0,
    lastAttemptAt: null,
    lastErrorCode: null,
    createdAt: occurredAt,
  }
  const replica: SyncReplicaState = {
    domain,
    entityId,
    deleted: kind === 'delete',
    ...clone(metadata),
    updatedAt: occurredAt,
  }
  await database.syncReplicas.put(replica)
  await database.syncOutbox.add(entry)
  return operation
}

/** Must run inside a transaction that includes syncRuntimeTables and the fact table. */
export async function recordLocalUpsertInTransaction(
  database: AppDatabase,
  domain: SyncDomain,
  before: SyncDomainRecord | null,
  afterInput: SyncDomainRecord,
  occurredAt: string,
): Promise<SyncOperation> {
  const after = parseLifeOSSyncableFact(domain, afterInput)
  const entityId = entityIdFor(domain, after)
  if (before !== null && entityIdFor(domain, before) !== entityId) {
    throw new Error('A sync mutation cannot change record identity')
  }
  const existing = await database.syncReplicas.get([domain, entityId])
  const stamp = await nextStamp(database)
  const metadata = evolveMetadata(domain, before, after, existing ?? null, stamp)
  return enqueue(database, domain, entityId, 'upsert', after, metadata, stamp, occurredAt)
}

/** Must run inside a transaction that includes syncRuntimeTables and the fact table. */
export async function recordLocalDeleteInTransaction(
  database: AppDatabase,
  domain: SyncDomain,
  entityId: string,
  before: SyncDomainRecord | null,
  occurredAt: string,
): Promise<SyncOperation> {
  const existing = await database.syncReplicas.get([domain, entityId])
  const stamp = await nextStamp(database)
  const metadata = existing
    ? {
        fieldVersions: clone(existing.fieldVersions),
        todoCompletionDates: clone(existing.todoCompletionDates),
        tombstone: existing.tombstone === null ? null : clone(existing.tombstone),
      }
    : before
      ? createInitialMetadata(domain, before, { counter: 1, deviceId: 'legacy-local' })
      : createEmptyMetadata(domain, stamp)
  metadata.tombstone = stamp
  return enqueue(database, domain, entityId, 'delete', null, metadata, stamp, occurredAt)
}

export async function commitLocalUpsert(
  domain: SyncDomain,
  recordInput: SyncDomainRecord,
  occurredAt: string,
  database: AppDatabase = db,
): Promise<SyncOperation> {
  return commitLocalWrite(domain, recordInput, occurredAt, database, 'put')
}

export async function commitLocalCreate(
  domain: SyncDomain,
  recordInput: SyncDomainRecord,
  occurredAt: string,
  database: AppDatabase = db,
): Promise<SyncOperation> {
  return commitLocalWrite(domain, recordInput, occurredAt, database, 'add')
}

async function commitLocalWrite(
  domain: SyncDomain,
  recordInput: SyncDomainRecord,
  occurredAt: string,
  database: AppDatabase,
  mode: 'add' | 'put',
): Promise<SyncOperation> {
  const record = parseLifeOSSyncableFact(domain, recordInput)
  const entityId = entityIdFor(domain, record)
  const table = tableForDomain(database, domain)
  return database.transaction(
    'rw',
    [table, ...syncRuntimeTables(database)],
    async () => {
      const before = (await table.get(entityId)) ?? null
      if (mode === 'add') await table.add(record)
      else await table.put(record)
      return recordLocalUpsertInTransaction(database, domain, before, record, occurredAt)
    },
  )
}

export async function commitLocalDelete(
  domain: SyncDomain,
  entityId: string,
  occurredAt: string,
  database: AppDatabase = db,
): Promise<SyncOperation> {
  const table = tableForDomain(database, domain)
  return database.transaction(
    'rw',
    [table, ...syncRuntimeTables(database)],
    async () => {
      const before = (await table.get(entityId)) ?? null
      await table.delete(entityId)
      return recordLocalDeleteInTransaction(database, domain, entityId, before, occurredAt)
    },
  )
}
