import { parseLifeOSSyncableFact } from '../../backup/BackupService.ts'
import type { DailyHealthMetric, DailyHealthSummary } from '../../health/types.ts'
import type { Todo } from '../../todo/types.ts'
import {
  SYNC_PROTOCOL_VERSION,
  type SyncDomain,
  type SyncDomainRecord,
  type SyncLogicalStamp,
  type SyncOperation,
  type SyncReplicaMetadata,
  type SyncReplicaState,
  type TodoCompletionRegister,
} from './types.ts'

type UnknownRecord = Record<string, unknown>

const DOMAIN_GROUPS: Record<SyncDomain, Record<string, readonly string[]>> = {
  todo: {
    title: ['title'],
    description: ['description'],
    scheduling: ['dueDate', 'recurrenceStartDate', 'recurrenceEndDate', 'recurrence'],
    priority: ['priority'],
    category: ['category'],
    singleCompletion: ['completed', 'completedAt'],
    createdAt: ['createdAt'],
    updatedAt: ['updatedAt'],
  },
  schedule: {
    title: ['title'],
    type: ['type'],
    location: ['location'],
    note: ['note'],
    timingAndRecurrence: ['startDateTime', 'endDateTime', 'recurrence'],
    createdAt: ['createdAt'],
    updatedAt: ['updatedAt'],
  },
  mood: {
    date: ['date'],
    level: ['level'],
    tags: ['tags'],
    note: ['note'],
    createdAt: ['createdAt'],
    updatedAt: ['updatedAt'],
  },
  cycle: {
    dateRange: ['startDate', 'endDate'],
    flowLevel: ['flowLevel'],
    symptoms: ['symptoms'],
    note: ['note'],
    createdAt: ['createdAt'],
    updatedAt: ['updatedAt'],
  },
  health: {
    sleep: ['sleep'],
    restingHeartRate: ['restingHeartRate'],
    heartRateVariability: ['heartRateVariability'],
    steps: ['steps'],
    activity: ['activity'],
  },
  // A Continuity lifecycle is an atomic domain unit. Field-wise mixing can
  // create broken supersede/expire relationships inside one item.
  continuity: {
    lifecycleRecord: [
      'content', 'status', 'confirmation', 'evidence', 'lifecycle',
      'supersedesId', 'supersededById', 'expiredAt', 'createdAt', 'updatedAt',
      'continuityType', 'relationshipId',
    ],
  },
}

export class SyncProtocolValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SyncProtocolValidationError'
  }
}

function fail(path: string, message: string): never {
  throw new SyncProtocolValidationError(`${path}: ${message}`)
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function assertExactKeys(value: UnknownRecord, keys: readonly string[], path: string): void {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (canonical(actual) !== canonical(expected)) fail(path, `expected keys ${expected.join(', ')}`)
}

function readText(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') return fail(path, 'expected non-empty string')
  return value
}

function readTimestamp(value: unknown, path: string): string {
  const timestamp = readText(value, path)
  if (!timestamp.includes('T') || !Number.isFinite(Date.parse(timestamp))) return fail(path, 'expected ISO timestamp')
  return timestamp
}

function readPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return fail(path, 'expected positive integer')
  return value
}

function readStamp(value: unknown, path: string): SyncLogicalStamp {
  if (!isRecord(value)) return fail(path, 'expected stamp')
  assertExactKeys(value, ['counter', 'deviceId'], path)
  return {
    counter: readPositiveInteger(value.counter, `${path}.counter`),
    deviceId: readText(value.deviceId, `${path}.deviceId`),
  }
}

function compareStamp(left: SyncLogicalStamp, right: SyncLogicalStamp): number {
  return left.counter - right.counter || left.deviceId.localeCompare(right.deviceId)
}

function laterStamp(
  left: SyncLogicalStamp | null,
  right: SyncLogicalStamp | null,
): SyncLogicalStamp | null {
  if (left === null) return right === null ? null : clone(right)
  if (right === null) return clone(left)
  return clone(compareStamp(left, right) >= 0 ? left : right)
}

function groupsFor(domain: SyncDomain): Record<string, readonly string[]> {
  return DOMAIN_GROUPS[domain]
}

function parseMetadata(
  domain: SyncDomain,
  value: unknown,
  path: string,
): SyncReplicaMetadata {
  if (!isRecord(value)) return fail(path, 'expected metadata object')
  assertExactKeys(value, ['fieldVersions', 'todoCompletionDates', 'tombstone'], path)
  if (!isRecord(value.fieldVersions)) return fail(`${path}.fieldVersions`, 'expected object')
  assertExactKeys(value.fieldVersions, Object.keys(groupsFor(domain)), `${path}.fieldVersions`)
  const fieldVersions = Object.fromEntries(
    Object.entries(value.fieldVersions).map(([group, stamp]) => [
      group,
      readStamp(stamp, `${path}.fieldVersions.${group}`),
    ]),
  )
  let todoCompletionDates: Record<string, TodoCompletionRegister> | null = null
  if (domain === 'todo') {
    if (!isRecord(value.todoCompletionDates)) return fail(`${path}.todoCompletionDates`, 'expected object for Todo')
    todoCompletionDates = Object.fromEntries(
      Object.entries(value.todoCompletionDates).map(([date, raw]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`${path}.todoCompletionDates`, 'invalid local date key')
        if (!isRecord(raw)) return fail(`${path}.todoCompletionDates.${date}`, 'expected register')
        assertExactKeys(raw, ['completed', 'stamp'], `${path}.todoCompletionDates.${date}`)
        if (typeof raw.completed !== 'boolean') fail(`${path}.todoCompletionDates.${date}.completed`, 'expected boolean')
        return [date, { completed: raw.completed, stamp: readStamp(raw.stamp, `${path}.todoCompletionDates.${date}.stamp`) }]
      }),
    )
  } else if (value.todoCompletionDates !== null) {
    fail(`${path}.todoCompletionDates`, 'must be null outside Todo')
  }
  return {
    fieldVersions,
    todoCompletionDates,
    tombstone: value.tombstone === null ? null : readStamp(value.tombstone, `${path}.tombstone`),
  }
}

function recordId(domain: SyncDomain, record: SyncDomainRecord): string {
  return domain === 'health'
    ? (record as DailyHealthSummary).date
    : (record as Exclude<SyncDomainRecord, DailyHealthSummary>).id
}

export function operationId(deviceId: string, sequence: number): string {
  return `${deviceId}/${sequence}`
}

export function parseSyncOperation(input: unknown): SyncOperation {
  if (!isRecord(input)) return fail('operation', 'expected object')
  const keys = ['protocolVersion', 'operationId', 'deviceId', 'sequence', 'domain', 'entityId', 'kind', 'occurredAt', 'record', 'metadata']
  assertExactKeys(input, keys, 'operation')
  if (input.protocolVersion !== SYNC_PROTOCOL_VERSION) fail('operation.protocolVersion', 'unsupported version')
  const deviceId = readText(input.deviceId, 'operation.deviceId')
  const sequence = readPositiveInteger(input.sequence, 'operation.sequence')
  const id = readText(input.operationId, 'operation.operationId')
  if (id !== operationId(deviceId, sequence)) fail('operation.operationId', 'must be stable deviceId/sequence')
  const domain = input.domain
  if (!['todo', 'schedule', 'mood', 'cycle', 'health', 'continuity'].includes(String(domain))) {
    return fail('operation.domain', 'unsupported sync domain')
  }
  const typedDomain = domain as SyncDomain
  const entityId = readText(input.entityId, 'operation.entityId')
  const kind = input.kind
  if (kind !== 'upsert' && kind !== 'delete') fail('operation.kind', 'expected upsert or delete')
  const metadata = parseMetadata(typedDomain, input.metadata, 'operation.metadata')
  let record: SyncDomainRecord | null = null
  if (kind === 'upsert') {
    if (metadata.tombstone !== null) fail('operation.metadata.tombstone', 'upsert cannot carry a tombstone')
    record = parseLifeOSSyncableFact(typedDomain, input.record)
    if (recordId(typedDomain, record) !== entityId) fail('operation.entityId', 'does not match record primary key')
  } else {
    if (input.record !== null) fail('operation.record', 'delete record must be null')
    if (metadata.tombstone === null) fail('operation.metadata.tombstone', 'delete requires tombstone')
  }
  return {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    operationId: id,
    deviceId,
    sequence,
    domain: typedDomain,
    entityId,
    kind,
    occurredAt: readTimestamp(input.occurredAt, 'operation.occurredAt'),
    record,
    metadata,
  }
}

function groupValue(record: SyncDomainRecord, fields: readonly string[]): UnknownRecord {
  const source = record as unknown as UnknownRecord
  return Object.fromEntries(fields.map((field) => [field, clone(source[field])]))
}

function assignGroup(target: UnknownRecord, source: SyncDomainRecord, fields: readonly string[]): void {
  const sourceObject = source as unknown as UnknownRecord
  for (const field of fields) target[field] = clone(sourceObject[field])
}

function legacyMetadata(domain: SyncDomain, record: SyncDomainRecord): SyncReplicaMetadata {
  const stamp = { counter: 1, deviceId: 'legacy-local' }
  return createInitialMetadata(domain, record, stamp)
}

function replicaMetadata(value: SyncReplicaMetadata): SyncReplicaMetadata {
  return {
    fieldVersions: clone(value.fieldVersions),
    todoCompletionDates: clone(value.todoCompletionDates),
    tombstone: clone(value.tombstone),
  }
}

export function createInitialMetadata(
  domain: SyncDomain,
  record: SyncDomainRecord,
  stamp: SyncLogicalStamp,
): SyncReplicaMetadata {
  const fieldVersions = Object.fromEntries(
    Object.keys(groupsFor(domain)).map((group) => [group, clone(stamp)]),
  )
  const todoCompletionDates = domain === 'todo'
    ? Object.fromEntries(
        (record as Todo).completedDates.map((date) => [
          date,
          { completed: true, stamp: clone(stamp) },
        ]),
      )
    : null
  return { fieldVersions, todoCompletionDates, tombstone: null }
}

export function createEmptyMetadata(
  domain: SyncDomain,
  stamp: SyncLogicalStamp,
): SyncReplicaMetadata {
  return {
    fieldVersions: Object.fromEntries(
      Object.keys(groupsFor(domain)).map((group) => [group, clone(stamp)]),
    ),
    todoCompletionDates: domain === 'todo' ? {} : null,
    tombstone: null,
  }
}

export function evolveMetadata(
  domain: SyncDomain,
  before: SyncDomainRecord | null,
  after: SyncDomainRecord,
  existing: SyncReplicaMetadata | null,
  stamp: SyncLogicalStamp,
): SyncReplicaMetadata {
  if (before === null) return createInitialMetadata(domain, after, stamp)
  // Existing rows are SyncReplicaState objects at runtime. Copy only protocol
  // metadata so local-only replica fields can never leak into cloud envelopes.
  const base = existing === null ? legacyMetadata(domain, before) : replicaMetadata(existing)
  if (base.tombstone !== null) throw new Error('A tombstoned identity cannot be recreated')
  for (const [group, fields] of Object.entries(groupsFor(domain))) {
    if (canonical(groupValue(before, fields)) !== canonical(groupValue(after, fields))) {
      base.fieldVersions[group] = clone(stamp)
    }
  }
  if (domain === 'todo') {
    const beforeDates = new Set((before as Todo).completedDates)
    const afterDates = new Set((after as Todo).completedDates)
    const registers = base.todoCompletionDates ?? {}
    for (const date of new Set([...beforeDates, ...afterDates])) {
      if (beforeDates.has(date) !== afterDates.has(date)) {
        registers[date] = { completed: afterDates.has(date), stamp: clone(stamp) }
      }
    }
    base.todoCompletionDates = registers
  }
  return base
}

function mergeRegisters(
  left: Record<string, TodoCompletionRegister> | null,
  right: Record<string, TodoCompletionRegister> | null,
): Record<string, TodoCompletionRegister> | null {
  if (left === null && right === null) return null
  const result: Record<string, TodoCompletionRegister> = {}
  for (const date of new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])) {
    const leftValue = left?.[date]
    const rightValue = right?.[date]
    if (!leftValue) result[date] = clone(rightValue!)
    else if (!rightValue) result[date] = clone(leftValue)
    else {
      const comparison = compareStamp(leftValue.stamp, rightValue.stamp)
      result[date] = clone(
        comparison > 0
          ? leftValue
          : comparison < 0
            ? rightValue
            : leftValue.completed === rightValue.completed
              ? leftValue
              : leftValue.completed
                ? leftValue
                : rightValue,
      )
    }
  }
  return result
}

function mergeFieldVersions(
  domain: SyncDomain,
  left: SyncReplicaMetadata,
  right: SyncReplicaMetadata,
): Record<string, SyncLogicalStamp> {
  return Object.fromEntries(
    Object.keys(groupsFor(domain)).map((group) => [
      group,
      laterStamp(left.fieldVersions[group]!, right.fieldVersions[group]!)!,
    ]),
  )
}

function selectHealthMetric(
  left: DailyHealthMetric<unknown>,
  right: DailyHealthMetric<unknown>,
  leftStamp: SyncLogicalStamp,
  rightStamp: SyncLogicalStamp,
): 'left' | 'right' {
  const leftHasValue = left.status === 'available' || left.status === 'stale'
  const rightHasValue = right.status === 'available' || right.status === 'stale'
  if (leftHasValue !== rightHasValue) return leftHasValue ? 'left' : 'right'
  if (leftHasValue && rightHasValue && left.collectedAt !== right.collectedAt) {
    return left.collectedAt > right.collectedAt ? 'left' : 'right'
  }
  // updatedAt and occurredAt may come from skewed device clocks. Once source
  // collection freshness ties, use the protocol's logical ordering instead.
  const stamp = compareStamp(leftStamp, rightStamp)
  if (stamp !== 0) return stamp > 0 ? 'left' : 'right'
  return canonical(left) >= canonical(right) ? 'left' : 'right'
}

export interface ReconciliationResult {
  record: SyncDomainRecord | null
  replica: SyncReplicaState
}

export function reconcileSyncState(input: {
  domain: SyncDomain
  entityId: string
  localRecord: SyncDomainRecord | null
  localReplica: SyncReplicaState | null
  remote: SyncOperation
  mergedAt: string
}): ReconciliationResult {
  const { domain, entityId, remote } = input
  if (remote.domain !== domain || remote.entityId !== entityId) {
    throw new Error('Remote operation identity does not match reconciliation target')
  }
  const localMetadata = input.localReplica ?? (
    input.localRecord === null
      ? null
      : {
          domain,
          entityId,
          deleted: false,
          updatedAt: input.mergedAt,
          ...legacyMetadata(domain, input.localRecord),
        }
  )
  const remoteMetadata = remote.metadata
  const tombstone = laterStamp(localMetadata?.tombstone ?? null, remoteMetadata.tombstone)
  const leftMetadata = localMetadata ?? remoteMetadata
  const fieldVersions = mergeFieldVersions(domain, leftMetadata, remoteMetadata)
  const todoCompletionDates = mergeRegisters(
    localMetadata?.todoCompletionDates ?? null,
    remoteMetadata.todoCompletionDates,
  )
  if (tombstone !== null) {
    return {
      record: null,
      replica: { domain, entityId, deleted: true, fieldVersions, todoCompletionDates, tombstone, updatedAt: input.mergedAt },
    }
  }
  if (remote.record === null) throw new Error('Non-tombstone reconciliation requires remote record')
  if (input.localRecord === null || localMetadata === null) {
    return {
      record: clone(remote.record),
      replica: { domain, entityId, deleted: false, ...clone(remoteMetadata), updatedAt: input.mergedAt },
    }
  }

  const merged = clone(input.localRecord) as unknown as UnknownRecord
  for (const [group, fields] of Object.entries(groupsFor(domain))) {
    let selectRemote = compareStamp(
      remoteMetadata.fieldVersions[group]!,
      localMetadata.fieldVersions[group]!,
    ) > 0
    if (domain === 'health') {
      const field = fields[0]!
      selectRemote = selectHealthMetric(
        (input.localRecord as unknown as UnknownRecord)[field] as DailyHealthMetric<unknown>,
        (remote.record as unknown as UnknownRecord)[field] as DailyHealthMetric<unknown>,
        localMetadata.fieldVersions[group]!,
        remoteMetadata.fieldVersions[group]!,
      ) === 'right'
      fieldVersions[group] = clone(selectRemote
        ? remoteMetadata.fieldVersions[group]!
        : localMetadata.fieldVersions[group]!)
    } else if (
      compareStamp(remoteMetadata.fieldVersions[group]!, localMetadata.fieldVersions[group]!) === 0
    ) {
      selectRemote = canonical(groupValue(remote.record, fields)) > canonical(groupValue(input.localRecord, fields))
    }
    if (selectRemote) assignGroup(merged, remote.record, fields)
  }
  if (domain === 'todo') {
    merged.completedDates = Object.entries(todoCompletionDates ?? {})
      .filter(([, register]) => register.completed)
      .map(([date]) => date)
      .sort()
  }
  const validated = parseLifeOSSyncableFact(domain, merged)
  return {
    record: validated,
    replica: { domain, entityId, deleted: false, fieldVersions, todoCompletionDates, tombstone: null, updatedAt: input.mergedAt },
  }
}

export function maximumCounter(operation: SyncOperation): number {
  const stamps = [
    ...Object.values(operation.metadata.fieldVersions),
    ...Object.values(operation.metadata.todoCompletionDates ?? {}).map((entry) => entry.stamp),
    ...(operation.metadata.tombstone ? [operation.metadata.tombstone] : []),
  ]
  return Math.max(operation.sequence, ...stamps.map((stamp) => stamp.counter))
}
