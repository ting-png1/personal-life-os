import { db, CURRENT_DATABASE_SCHEMA_VERSION, type AppDatabase } from '../../data/database.ts'
import { automationGovernanceIsValid } from '../automation/services/AutomationGovernance.ts'
import { DEFAULT_AUTOMATION_GOVERNANCE } from '../automation/types.ts'
import { parseDailyHealthSummary } from '../health/importBoundary.ts'
import { normalizeTodo } from '../todo/normalization.ts'
import {
  AI_SETTINGS_STORAGE_KEY,
  AUTOMATION_SETTINGS_STORAGE_KEY,
  NOTIFICATION_SETTINGS_STORAGE_KEY,
} from '../../shared/lib/storageKeys.ts'
import type { ActionAuditEventType, ActionAuditRecord } from '../action/types.ts'
import type { ContinuityEvidence, ContinuityItem, ContinuityLifecycleEvent } from '../continuity/types.ts'
import type { RecurrenceRule, ScheduleEvent, ScheduleOverride } from '../schedule/types.ts'
import type { Todo } from '../todo/types.ts'
import {
  LIFEOS_DATA_PACKAGE_SCHEMA_VERSION,
  type AIBackupPreferences,
  type KeyValueStorage,
  type LifeOSBackupData,
  type LifeOSBackupDataset,
  type LifeOSBackupSettings,
  type LifeOSDataPackageV1,
  type LifeOSRecordCounts,
  type LifeOSRestoreResult,
  type NotificationBackupSettings,
  type PreparedLifeOSRestore,
} from './types.ts'

type UnknownRecord = Record<string, unknown>

const DATASET_KEYS: readonly LifeOSBackupDataset[] = [
  'todos',
  'scheduleEvents',
  'moodRecords',
  'periodRecords',
  'dailyHealthSummaries',
  'continuityItems',
  'actionAuditRecords',
]

const SETTINGS_KEYS = [
  NOTIFICATION_SETTINGS_STORAGE_KEY,
  AI_SETTINGS_STORAGE_KEY,
  AUTOMATION_SETTINGS_STORAGE_KEY,
] as const

const DEFAULT_NOTIFICATION_SETTINGS: NotificationBackupSettings = {
  enabled: true,
  todoReminders: { enabled: true, remindBefore: 15 },
  scheduleReminders: { enabled: true, remindBefore: 10 },
  dailySummary: { enabled: false, time: '21:00' },
  soundEnabled: true,
  vibrateEnabled: true,
}

const DEFAULT_AI_PREFERENCES: AIBackupPreferences = {
  dailyLimit: 3,
  model: 'deepseek-chat',
}

const SETTINGS_INCLUDED = [
  'notification',
  'aiPreferences',
  'automationGovernance',
] as const

const EXCLUDED = [
  'derived-state',
  'credentials',
  'device-permissions',
  'runtime-counters',
  'sync-state',
] as const

export class BackupPackageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupPackageValidationError'
  }
}

export class RestoreVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RestoreVerificationError'
  }
}

export class RestoreRollbackError extends Error {
  readonly cause: unknown
  readonly rollbackCause: unknown

  constructor(cause: unknown, rollbackCause: unknown) {
    super('Restore failed and the previous local state could not be fully recovered')
    this.name = 'RestoreRollbackError'
    this.cause = cause
    this.rollbackCause = rollbackCause
  }
}

function fail(path: string, message: string): never {
  throw new BackupPackageValidationError(`${path}: ${message}`)
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readObject(value: unknown, path: string): UnknownRecord {
  if (!isRecord(value)) return fail(path, 'expected object')
  return value
}

function assertKeys(
  value: UnknownRecord,
  allowed: readonly string[],
  required: readonly string[],
  path: string,
): void {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key))
  if (unexpected) fail(`${path}.${unexpected}`, 'unexpected field')
  const missing = required.find((key) => !Object.prototype.hasOwnProperty.call(value, key))
  if (missing) fail(`${path}.${missing}`, 'missing field')
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function readString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    return fail(path, allowEmpty ? 'expected string' : 'expected non-empty string')
  }
  return value
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null) return null
  return readString(value, path, true)
}

function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') return fail(path, 'expected boolean')
  return value
}

function readFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(path, 'expected finite number')
  }
  return value
}

function readInteger(value: unknown, path: string, minimum?: number): number {
  const result = readFiniteNumber(value, path)
  if (!Number.isInteger(result) || (minimum !== undefined && result < minimum)) {
    return fail(path, `expected integer${minimum === undefined ? '' : ` >= ${minimum}`}`)
  }
  return result
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    return fail(path, `expected one of ${allowed.join(', ')}`)
  }
  return value as T
}

function readIsoTimestamp(value: unknown, path: string): string {
  const result = readString(value, path)
  if (!result.includes('T') || !Number.isFinite(Date.parse(result))) {
    return fail(path, 'expected valid ISO timestamp')
  }
  return result
}

function readDateTime(value: unknown, path: string): string {
  const result = readString(value, path)
  if (!result.includes('T') || !Number.isFinite(Date.parse(result))) {
    return fail(path, 'expected valid date-time')
  }
  return result
}

function readLocalDate(value: unknown, path: string): string {
  const result = readString(value, path)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(result)
  if (!match) return fail(path, 'expected YYYY-MM-DD')
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return fail(path, 'invalid calendar date')
  }
  return result
}

function readNullableLocalDate(value: unknown, path: string): string | null {
  return value === null ? null : readLocalDate(value, path)
}

function readStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return fail(path, 'expected array')
  return value.map((item, index) => readString(item, `${path}[${index}]`, true))
}

function readLocalDateArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return fail(path, 'expected array')
  const dates = value.map((item, index) => readLocalDate(item, `${path}[${index}]`))
  if (new Set(dates).size !== dates.length) fail(path, 'duplicate date')
  return dates
}

function readNullableTimestamp(value: unknown, path: string): string | null {
  return value === null ? null : readIsoTimestamp(value, path)
}

function parseTodo(value: unknown, path: string, legacy: boolean): Todo {
  const item = readObject(value, path)
  const keys = [
    'id', 'title', 'description', 'dueDate', 'recurrenceStartDate',
    'recurrenceEndDate', 'priority', 'category', 'recurrence', 'completedDates',
    'completed', 'completedAt', 'createdAt', 'updatedAt',
  ]
  const legacyOptional = [
    'recurrenceStartDate', 'recurrenceEndDate', 'category', 'recurrence', 'completedDates',
  ]
  assertKeys(item, keys, legacy ? keys.filter((key) => !legacyOptional.includes(key)) : keys, path)
  const normalized = normalizeTodo(item as unknown as Todo)
  const todo: Todo = {
    id: readString(normalized.id, `${path}.id`),
    title: readString(normalized.title, `${path}.title`),
    description: readNullableString(normalized.description, `${path}.description`),
    dueDate: readNullableLocalDate(normalized.dueDate, `${path}.dueDate`),
    recurrenceStartDate: readNullableLocalDate(normalized.recurrenceStartDate, `${path}.recurrenceStartDate`),
    recurrenceEndDate: readNullableLocalDate(normalized.recurrenceEndDate, `${path}.recurrenceEndDate`),
    priority: readInteger(normalized.priority, `${path}.priority`) as 1 | 2 | 3,
    category: readNullableString(normalized.category, `${path}.category`),
    recurrence: readEnum(normalized.recurrence, ['none', 'daily', 'weekly'], `${path}.recurrence`),
    completedDates: readLocalDateArray(normalized.completedDates, `${path}.completedDates`),
    completed: readBoolean(normalized.completed, `${path}.completed`),
    completedAt: readNullableTimestamp(normalized.completedAt, `${path}.completedAt`),
    createdAt: readIsoTimestamp(normalized.createdAt, `${path}.createdAt`),
    updatedAt: readIsoTimestamp(normalized.updatedAt, `${path}.updatedAt`),
  }
  if (![1, 2, 3].includes(todo.priority)) fail(`${path}.priority`, 'expected 1, 2, or 3')
  if (todo.recurrenceEndDate && todo.recurrenceStartDate && todo.recurrenceEndDate < todo.recurrenceStartDate) {
    fail(`${path}.recurrenceEndDate`, 'must not precede recurrenceStartDate')
  }
  return todo
}

function parseScheduleOverride(value: unknown, path: string): ScheduleOverride {
  const item = readObject(value, path)
  const keys = ['startDateTime', 'endDateTime', 'location', 'cancelled']
  assertKeys(item, keys, [], path)
  const override: ScheduleOverride = {}
  if (item.startDateTime !== undefined) override.startDateTime = readDateTime(item.startDateTime, `${path}.startDateTime`)
  if (item.endDateTime !== undefined) override.endDateTime = readDateTime(item.endDateTime, `${path}.endDateTime`)
  if (item.location !== undefined) override.location = readString(item.location, `${path}.location`, true)
  if (item.cancelled !== undefined) override.cancelled = readBoolean(item.cancelled, `${path}.cancelled`)
  if (override.startDateTime && override.endDateTime && Date.parse(override.endDateTime) <= Date.parse(override.startDateTime)) {
    fail(path, 'override endDateTime must be after startDateTime')
  }
  return override
}

function parseRecurrence(value: unknown, path: string): RecurrenceRule | null {
  if (value === null) return null
  const item = readObject(value, path)
  const keys = ['freq', 'daysOfWeek', 'startDate', 'endDate', 'weekParity', 'weekRange', 'excludedDates', 'overrides']
  assertKeys(item, keys, ['freq', 'daysOfWeek', 'startDate', 'endDate'], path)
  if (item.freq !== 'weekly') fail(`${path}.freq`, 'expected weekly')
  if (!Array.isArray(item.daysOfWeek) || item.daysOfWeek.length === 0) fail(`${path}.daysOfWeek`, 'expected non-empty array')
  const daysOfWeek = item.daysOfWeek.map((day, index) => readInteger(day, `${path}.daysOfWeek[${index}]`, 0))
  if (daysOfWeek.some((day) => day > 6) || new Set(daysOfWeek).size !== daysOfWeek.length) {
    fail(`${path}.daysOfWeek`, 'expected unique weekday values from 0 to 6')
  }
  const startDate = readLocalDate(item.startDate, `${path}.startDate`)
  const endDate = readLocalDate(item.endDate, `${path}.endDate`)
  if (endDate < startDate) fail(`${path}.endDate`, 'must not precede startDate')
  const result: RecurrenceRule = { freq: 'weekly', daysOfWeek, startDate, endDate }
  if (item.weekParity !== undefined) result.weekParity = readEnum(item.weekParity, ['all', 'odd', 'even'] as const, `${path}.weekParity`)
  if (item.weekRange !== undefined) {
    if (!Array.isArray(item.weekRange) || item.weekRange.length !== 2) fail(`${path}.weekRange`, 'expected two integers')
    const start = readInteger(item.weekRange[0], `${path}.weekRange[0]`, 1)
    const end = readInteger(item.weekRange[1], `${path}.weekRange[1]`, 1)
    if (end < start) fail(`${path}.weekRange`, 'end must not precede start')
    result.weekRange = [start, end]
  }
  if (item.excludedDates !== undefined) result.excludedDates = readLocalDateArray(item.excludedDates, `${path}.excludedDates`)
  if (item.overrides !== undefined) {
    const overrides = readObject(item.overrides, `${path}.overrides`)
    result.overrides = Object.fromEntries(
      Object.entries(overrides).map(([date, override]) => [
        readLocalDate(date, `${path}.overrides key`),
        parseScheduleOverride(override, `${path}.overrides.${date}`),
      ]),
    )
  }
  return result
}

function parseSchedule(value: unknown, path: string): ScheduleEvent {
  const item = readObject(value, path)
  const keys = ['id', 'title', 'type', 'location', 'note', 'startDateTime', 'endDateTime', 'recurrence', 'createdAt', 'updatedAt']
  assertKeys(item, keys, keys, path)
  const startDateTime = readDateTime(item.startDateTime, `${path}.startDateTime`)
  const endDateTime = readDateTime(item.endDateTime, `${path}.endDateTime`)
  if (Date.parse(endDateTime) <= Date.parse(startDateTime)) fail(`${path}.endDateTime`, 'must be after startDateTime')
  return {
    id: readString(item.id, `${path}.id`),
    title: readString(item.title, `${path}.title`),
    type: readEnum(item.type, ['class', 'personal', 'rest', 'other'], `${path}.type`),
    location: readNullableString(item.location, `${path}.location`),
    note: readNullableString(item.note, `${path}.note`),
    startDateTime,
    endDateTime,
    recurrence: parseRecurrence(item.recurrence, `${path}.recurrence`),
    createdAt: readIsoTimestamp(item.createdAt, `${path}.createdAt`),
    updatedAt: readIsoTimestamp(item.updatedAt, `${path}.updatedAt`),
  }
}

function parseMood(value: unknown, path: string): LifeOSBackupData['moodRecords'][number] {
  const item = readObject(value, path)
  const keys = ['id', 'date', 'level', 'tags', 'note', 'createdAt', 'updatedAt']
  assertKeys(item, keys, keys, path)
  const level = readInteger(item.level, `${path}.level`)
  if (![1, 2, 3, 4, 5].includes(level)) fail(`${path}.level`, 'expected 1 to 5')
  return {
    id: readString(item.id, `${path}.id`),
    date: readLocalDate(item.date, `${path}.date`),
    level: level as 1 | 2 | 3 | 4 | 5,
    tags: readStringArray(item.tags, `${path}.tags`),
    note: readNullableString(item.note, `${path}.note`),
    createdAt: readIsoTimestamp(item.createdAt, `${path}.createdAt`),
    updatedAt: readIsoTimestamp(item.updatedAt, `${path}.updatedAt`),
  }
}

function parsePeriod(value: unknown, path: string): LifeOSBackupData['periodRecords'][number] {
  const item = readObject(value, path)
  const keys = ['id', 'startDate', 'endDate', 'flowLevel', 'symptoms', 'note', 'createdAt', 'updatedAt']
  assertKeys(item, keys, keys, path)
  const startDate = readLocalDate(item.startDate, `${path}.startDate`)
  const endDate = readNullableLocalDate(item.endDate, `${path}.endDate`)
  if (endDate && endDate < startDate) fail(`${path}.endDate`, 'must not precede startDate')
  const flow = item.flowLevel === null ? null : readInteger(item.flowLevel, `${path}.flowLevel`)
  if (flow !== null && ![1, 2, 3].includes(flow)) fail(`${path}.flowLevel`, 'expected 1, 2, 3, or null')
  return {
    id: readString(item.id, `${path}.id`),
    startDate,
    endDate,
    flowLevel: flow as 1 | 2 | 3 | null,
    symptoms: readStringArray(item.symptoms, `${path}.symptoms`),
    note: readNullableString(item.note, `${path}.note`),
    createdAt: readIsoTimestamp(item.createdAt, `${path}.createdAt`),
    updatedAt: readIsoTimestamp(item.updatedAt, `${path}.updatedAt`),
  }
}

function parseEvidence(value: unknown, path: string): ContinuityEvidence {
  const item = readObject(value, path)
  const keys = ['kind', 'reference', 'note', 'observedAt']
  assertKeys(item, keys, keys, path)
  const kind = readEnum(item.kind, ['user-statement', 'lifeos-record', 'external-reference'], `${path}.kind`)
  const reference = readNullableString(item.reference, `${path}.reference`)
  if (kind === 'user-statement' && reference !== null) fail(`${path}.reference`, 'must be null for user-statement')
  if (kind !== 'user-statement' && (reference === null || reference.trim() === '')) fail(`${path}.reference`, 'required for referenced evidence')
  return {
    kind,
    reference,
    note: readNullableString(item.note, `${path}.note`),
    observedAt: readNullableTimestamp(item.observedAt, `${path}.observedAt`),
  } as ContinuityEvidence
}

function parseLifecycleEvent(value: unknown, path: string): ContinuityLifecycleEvent {
  const item = readObject(value, path)
  const type = readEnum(item.type, ['confirmed', 'updated', 'expired', 'superseded'], `${path}.type`)
  const keys = type === 'expired'
    ? ['type', 'at', 'reason']
    : type === 'superseded'
      ? ['type', 'at', 'replacementId']
      : ['type', 'at']
  assertKeys(item, keys, keys, path)
  const at = readIsoTimestamp(item.at, `${path}.at`)
  if (type === 'expired') return { type, at, reason: readNullableString(item.reason, `${path}.reason`) }
  if (type === 'superseded') return { type, at, replacementId: readString(item.replacementId, `${path}.replacementId`) }
  return { type, at }
}

function parseContinuity(value: unknown, path: string): ContinuityItem {
  const item = readObject(value, path)
  const keys = ['id', 'content', 'status', 'confirmation', 'evidence', 'lifecycle', 'supersedesId', 'supersededById', 'expiredAt', 'createdAt', 'updatedAt', 'continuityType', 'relationshipId']
  assertKeys(item, keys, keys, path)
  const type = readEnum(item.continuityType, ['life', 'relationship'], `${path}.continuityType`)
  const status = readEnum(item.status, ['active', 'expired', 'superseded'], `${path}.status`)
  const relationshipId = readNullableString(item.relationshipId, `${path}.relationshipId`)
  if (type === 'life' && relationshipId !== null) fail(`${path}.relationshipId`, 'must be null for Life Continuity')
  if (type === 'relationship' && (relationshipId === null || relationshipId.trim() === '')) fail(`${path}.relationshipId`, 'required for Relationship Continuity')
  const confirmation = readObject(item.confirmation, `${path}.confirmation`)
  assertKeys(confirmation, ['method', 'confirmedAt'], ['method', 'confirmedAt'], `${path}.confirmation`)
  if (confirmation.method !== 'manual') fail(`${path}.confirmation.method`, 'expected manual')
  if (!Array.isArray(item.evidence) || item.evidence.length === 0) fail(`${path}.evidence`, 'expected non-empty array')
  if (!Array.isArray(item.lifecycle) || item.lifecycle.length === 0) fail(`${path}.lifecycle`, 'expected non-empty array')
  const lifecycle = item.lifecycle.map((event, index) => parseLifecycleEvent(event, `${path}.lifecycle[${index}]`))
  if (lifecycle[0]?.type !== 'confirmed') fail(`${path}.lifecycle[0]`, 'must be confirmed')
  const expiredAt = readNullableTimestamp(item.expiredAt, `${path}.expiredAt`)
  const supersededById = readNullableString(item.supersededById, `${path}.supersededById`)
  if (status === 'active' && (expiredAt !== null || supersededById !== null)) fail(path, 'active item has terminal lifecycle fields')
  if (status === 'expired' && expiredAt === null) fail(`${path}.expiredAt`, 'required for expired item')
  if (status === 'superseded' && supersededById === null) fail(`${path}.supersededById`, 'required for superseded item')
  const shared = {
    id: readString(item.id, `${path}.id`),
    content: readString(item.content, `${path}.content`),
    status,
    confirmation: { method: 'manual' as const, confirmedAt: readIsoTimestamp(confirmation.confirmedAt, `${path}.confirmation.confirmedAt`) },
    evidence: item.evidence.map((entry, index) => parseEvidence(entry, `${path}.evidence[${index}]`)),
    lifecycle,
    supersedesId: readNullableString(item.supersedesId, `${path}.supersedesId`),
    supersededById,
    expiredAt,
    createdAt: readIsoTimestamp(item.createdAt, `${path}.createdAt`),
    updatedAt: readIsoTimestamp(item.updatedAt, `${path}.updatedAt`),
  }
  return type === 'life'
    ? { ...shared, continuityType: 'life', relationshipId: null }
    : { ...shared, continuityType: 'relationship', relationshipId: relationshipId! }
}

const ACTION_EVENTS: readonly ActionAuditEventType[] = [
  'started', 'permission-denied', 'confirmation-required', 'validation-failed',
  'executed', 'execution-failed', 'undo-started', 'undone', 'undo-conflict', 'undo-failed',
]

function parseActionAudit(value: unknown, path: string): ActionAuditRecord {
  const item = readObject(value, path)
  const keys = ['executionId', 'proposalId', 'intelligenceRequestId', 'actionClass', 'domain', 'action', 'risk', 'status', 'targetTodoId', 'confirmationRequired', 'confirmedAt', 'executedAt', 'undoneAt', 'events', 'createdAt', 'updatedAt']
  assertKeys(item, keys, keys, path)
  if (item.actionClass !== 'data') fail(`${path}.actionClass`, 'expected data')
  if (item.domain !== 'todo') fail(`${path}.domain`, 'expected todo')
  if (!Array.isArray(item.events) || item.events.length === 0) fail(`${path}.events`, 'expected non-empty array')
  const events = item.events.map((entry, index) => {
    const event = readObject(entry, `${path}.events[${index}]`)
    assertKeys(event, ['type', 'at', 'code'], ['type', 'at', 'code'], `${path}.events[${index}]`)
    return {
      type: readEnum(event.type, ACTION_EVENTS, `${path}.events[${index}].type`),
      at: readIsoTimestamp(event.at, `${path}.events[${index}].at`),
      code: readNullableString(event.code, `${path}.events[${index}].code`),
    }
  })
  const status = readEnum(item.status, ACTION_EVENTS, `${path}.status`)
  if (events[events.length - 1]?.type !== status) fail(`${path}.status`, 'must match final audit event')
  return {
    executionId: readString(item.executionId, `${path}.executionId`),
    proposalId: readString(item.proposalId, `${path}.proposalId`),
    intelligenceRequestId: readString(item.intelligenceRequestId, `${path}.intelligenceRequestId`),
    actionClass: 'data',
    domain: 'todo',
    action: readEnum(item.action, ['todo.create', 'todo.update', 'todo.set-completion'], `${path}.action`),
    risk: readEnum(item.risk, ['low', 'medium'], `${path}.risk`),
    status,
    targetTodoId: readNullableString(item.targetTodoId, `${path}.targetTodoId`),
    confirmationRequired: readBoolean(item.confirmationRequired, `${path}.confirmationRequired`),
    confirmedAt: readNullableTimestamp(item.confirmedAt, `${path}.confirmedAt`),
    executedAt: readNullableTimestamp(item.executedAt, `${path}.executedAt`),
    undoneAt: readNullableTimestamp(item.undoneAt, `${path}.undoneAt`),
    events,
    createdAt: readIsoTimestamp(item.createdAt, `${path}.createdAt`),
    updatedAt: readIsoTimestamp(item.updatedAt, `${path}.updatedAt`),
  }
}

function readArray<T>(value: unknown, path: string, parser: (entry: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) return fail(path, 'expected array')
  return value.map((entry, index) => parser(entry, `${path}[${index}]`))
}

function assertUnique<T>(items: T[], key: (item: T) => string, path: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    const value = key(item)
    if (seen.has(value)) fail(path, `duplicate primary key: ${value}`)
    seen.add(value)
  }
}

function validateContinuityLinks(items: ContinuityItem[]): void {
  const byId = new Map(items.map((item) => [item.id, item]))
  for (const item of items) {
    if (item.supersedesId !== null) {
      const previous = byId.get(item.supersedesId)
      if (!previous || previous.supersededById !== item.id) {
        fail('data.continuityItems', `broken supersedes link for ${item.id}`)
      }
    }
    if (item.supersededById !== null) {
      const replacement = byId.get(item.supersededById)
      if (!replacement || replacement.supersedesId !== item.id) {
        fail('data.continuityItems', `broken supersededBy link for ${item.id}`)
      }
    }
  }
}

function parseData(value: unknown, legacy: boolean): LifeOSBackupData {
  const data = readObject(value, 'data')
  const required = legacy
    ? ['todos', 'scheduleEvents', 'moodRecords', 'periodRecords']
    : [...DATASET_KEYS]
  assertKeys(data, DATASET_KEYS, required, 'data')
  const result: LifeOSBackupData = {
    todos: readArray(data.todos, 'data.todos', (entry, path) => parseTodo(entry, path, legacy)),
    scheduleEvents: readArray(data.scheduleEvents, 'data.scheduleEvents', parseSchedule),
    moodRecords: readArray(data.moodRecords, 'data.moodRecords', parseMood),
    periodRecords: readArray(data.periodRecords, 'data.periodRecords', parsePeriod),
    dailyHealthSummaries: data.dailyHealthSummaries === undefined
      ? []
      : readArray(data.dailyHealthSummaries, 'data.dailyHealthSummaries', (entry) => parseDailyHealthSummary(entry)),
    continuityItems: data.continuityItems === undefined
      ? []
      : readArray(data.continuityItems, 'data.continuityItems', parseContinuity),
    actionAuditRecords: data.actionAuditRecords === undefined
      ? []
      : readArray(data.actionAuditRecords, 'data.actionAuditRecords', parseActionAudit),
  }
  assertUnique(result.todos, (item) => item.id, 'data.todos')
  assertUnique(result.scheduleEvents, (item) => item.id, 'data.scheduleEvents')
  assertUnique(result.moodRecords, (item) => item.id, 'data.moodRecords')
  assertUnique(result.periodRecords, (item) => item.id, 'data.periodRecords')
  assertUnique(result.dailyHealthSummaries, (item) => item.date, 'data.dailyHealthSummaries')
  assertUnique(result.continuityItems, (item) => item.id, 'data.continuityItems')
  assertUnique(result.actionAuditRecords, (item) => item.executionId, 'data.actionAuditRecords')
  validateContinuityLinks(result.continuityItems)
  return result
}

function parseNotificationSettings(value: unknown, path: string): NotificationBackupSettings {
  const item = readObject(value, path)
  const keys = ['enabled', 'todoReminders', 'scheduleReminders', 'dailySummary', 'soundEnabled', 'vibrateEnabled']
  assertKeys(item, keys, keys, path)
  const reminder = (raw: unknown, reminderPath: string) => {
    const rule = readObject(raw, reminderPath)
    assertKeys(rule, ['enabled', 'remindBefore'], ['enabled', 'remindBefore'], reminderPath)
    return {
      enabled: readBoolean(rule.enabled, `${reminderPath}.enabled`),
      remindBefore: readInteger(rule.remindBefore, `${reminderPath}.remindBefore`, 0),
    }
  }
  const summary = readObject(item.dailySummary, `${path}.dailySummary`)
  assertKeys(summary, ['enabled', 'time'], ['enabled', 'time'], `${path}.dailySummary`)
  const time = readString(summary.time, `${path}.dailySummary.time`)
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail(`${path}.dailySummary.time`, 'expected HH:mm')
  return {
    enabled: readBoolean(item.enabled, `${path}.enabled`),
    todoReminders: reminder(item.todoReminders, `${path}.todoReminders`),
    scheduleReminders: reminder(item.scheduleReminders, `${path}.scheduleReminders`),
    dailySummary: { enabled: readBoolean(summary.enabled, `${path}.dailySummary.enabled`), time },
    soundEnabled: readBoolean(item.soundEnabled, `${path}.soundEnabled`),
    vibrateEnabled: readBoolean(item.vibrateEnabled, `${path}.vibrateEnabled`),
  }
}

function parseAIPreferences(value: unknown, path: string): AIBackupPreferences {
  const item = readObject(value, path)
  assertKeys(item, ['dailyLimit', 'model'], ['dailyLimit', 'model'], path)
  return {
    dailyLimit: readInteger(item.dailyLimit, `${path}.dailyLimit`, 1),
    model: readString(item.model, `${path}.model`),
  }
}

function parseSettings(value: unknown): LifeOSBackupSettings {
  const settings = readObject(value, 'settings')
  assertKeys(settings, SETTINGS_INCLUDED, SETTINGS_INCLUDED, 'settings')
  if (!automationGovernanceIsValid(settings.automationGovernance)) {
    fail('settings.automationGovernance', 'invalid governance settings')
  }
  return {
    notification: parseNotificationSettings(settings.notification, 'settings.notification'),
    aiPreferences: parseAIPreferences(settings.aiPreferences, 'settings.aiPreferences'),
    automationGovernance: clone(settings.automationGovernance),
  }
}

function recordCounts(data: LifeOSBackupData): LifeOSRecordCounts {
  return Object.fromEntries(DATASET_KEYS.map((key) => [key, data[key].length])) as LifeOSRecordCounts
}

function assertExactArray(value: unknown, expected: readonly string[], path: string): void {
  if (!Array.isArray(value) || value.length !== expected.length || value.some((entry, index) => entry !== expected[index])) {
    fail(path, `expected ${expected.join(', ')}`)
  }
}

function buildPackage(data: LifeOSBackupData, settings: LifeOSBackupSettings, exportedAt: string): LifeOSDataPackageV1 {
  return {
    format: 'lifeos-data-package',
    schemaVersion: LIFEOS_DATA_PACKAGE_SCHEMA_VERSION,
    exportedAt,
    metadata: {
      app: 'LifeOS',
      packageKind: 'full-local-backup',
      databaseSchemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
      recordCounts: recordCounts(data),
      settingsIncluded: [...SETTINGS_INCLUDED],
      excluded: [...EXCLUDED],
    },
    data,
    settings,
  }
}

function parseCurrentPackage(input: unknown): LifeOSDataPackageV1 {
  const value = readObject(input, 'package')
  const keys = ['format', 'schemaVersion', 'exportedAt', 'metadata', 'data', 'settings']
  assertKeys(value, keys, keys, 'package')
  if (value.format !== 'lifeos-data-package') fail('package.format', 'unexpected package format')
  if (value.schemaVersion !== LIFEOS_DATA_PACKAGE_SCHEMA_VERSION) fail('package.schemaVersion', 'unsupported package schema version')
  const exportedAt = readIsoTimestamp(value.exportedAt, 'package.exportedAt')
  const metadata = readObject(value.metadata, 'package.metadata')
  const metadataKeys = ['app', 'packageKind', 'databaseSchemaVersion', 'recordCounts', 'settingsIncluded', 'excluded']
  assertKeys(metadata, metadataKeys, metadataKeys, 'package.metadata')
  if (metadata.app !== 'LifeOS') fail('package.metadata.app', 'expected LifeOS')
  if (metadata.packageKind !== 'full-local-backup') fail('package.metadata.packageKind', 'unexpected package kind')
  const databaseSchemaVersion = readInteger(metadata.databaseSchemaVersion, 'package.metadata.databaseSchemaVersion', 1)
  if (databaseSchemaVersion > CURRENT_DATABASE_SCHEMA_VERSION) fail('package.metadata.databaseSchemaVersion', 'requires a newer LifeOS database schema')
  assertExactArray(metadata.settingsIncluded, SETTINGS_INCLUDED, 'package.metadata.settingsIncluded')
  assertExactArray(metadata.excluded, EXCLUDED, 'package.metadata.excluded')
  const data = parseData(value.data, false)
  const countsValue = readObject(metadata.recordCounts, 'package.metadata.recordCounts')
  assertKeys(countsValue, DATASET_KEYS, DATASET_KEYS, 'package.metadata.recordCounts')
  const actualCounts = recordCounts(data)
  for (const key of DATASET_KEYS) {
    const declared = readInteger(countsValue[key], `package.metadata.recordCounts.${key}`, 0)
    if (declared !== actualCounts[key]) fail(`package.metadata.recordCounts.${key}`, 'does not match data')
  }
  return {
    format: 'lifeos-data-package',
    schemaVersion: LIFEOS_DATA_PACKAGE_SCHEMA_VERSION,
    exportedAt,
    metadata: {
      app: 'LifeOS',
      packageKind: 'full-local-backup',
      databaseSchemaVersion,
      recordCounts: actualCounts,
      settingsIncluded: [...SETTINGS_INCLUDED],
      excluded: [...EXCLUDED],
    },
    data,
    settings: parseSettings(value.settings),
  }
}

function migrateLegacyPackage(input: UnknownRecord): LifeOSDataPackageV1 {
  assertKeys(input, ['version', 'exportedAt', 'data'], ['version', 'exportedAt', 'data'], 'package')
  if (input.version !== '3.0.0') fail('package.version', 'unsupported legacy package version')
  const exportedAt = readIsoTimestamp(input.exportedAt, 'package.exportedAt')
  const data = parseData(input.data, true)
  return buildPackage(
    data,
    {
      notification: clone(DEFAULT_NOTIFICATION_SETTINGS),
      aiPreferences: clone(DEFAULT_AI_PREFERENCES),
      automationGovernance: clone(DEFAULT_AUTOMATION_GOVERNANCE),
    },
    exportedAt,
  )
}

export function prepareLifeOSRestore(input: unknown): PreparedLifeOSRestore {
  const value = readObject(input, 'package')
  if (value.schemaVersion !== undefined || value.format !== undefined) {
    return { package: parseCurrentPackage(value), source: 'schema-v1', settingsMode: 'replace' }
  }
  if (value.version === '3.0.0') {
    return { package: migrateLegacyPackage(value), source: 'legacy-3.0.0', settingsMode: 'preserve' }
  }
  return fail('package.schemaVersion', 'unknown or unsupported backup package')
}

function parseStoredObject(storage: KeyValueStorage, key: string): UnknownRecord | null {
  const raw = storage.getItem(key)
  if (raw === null) return null
  try {
    return readObject(JSON.parse(raw), `storage.${key}`)
  } catch {
    return null
  }
}

function readPortableSettings(storage: KeyValueStorage): LifeOSBackupSettings {
  const notificationRaw = parseStoredObject(storage, NOTIFICATION_SETTINGS_STORAGE_KEY)
  const notificationCandidate = notificationRaw === null
    ? null
    : Object.fromEntries(Object.entries(notificationRaw).filter(([key]) => key !== 'browserPermission'))
  let notification = clone(DEFAULT_NOTIFICATION_SETTINGS)
  if (notificationCandidate !== null) {
    try {
      notification = parseNotificationSettings(notificationCandidate, 'settings.notification')
    } catch {
      notification = clone(DEFAULT_NOTIFICATION_SETTINGS)
    }
  }

  const aiRaw = parseStoredObject(storage, AI_SETTINGS_STORAGE_KEY)
  let aiPreferences: AIBackupPreferences = {
    dailyLimit: DEFAULT_AI_PREFERENCES.dailyLimit,
    model: DEFAULT_AI_PREFERENCES.model,
  }
  if (aiRaw !== null) {
    try {
      aiPreferences = parseAIPreferences(
        { dailyLimit: aiRaw.dailyLimit, model: aiRaw.model },
        'settings.aiPreferences',
      )
    } catch {
      // Corrupted preferences do not make fact data impossible to back up.
    }
  }

  const automationRaw = parseStoredObject(storage, AUTOMATION_SETTINGS_STORAGE_KEY)
  const automationGovernance = automationGovernanceIsValid(automationRaw)
    ? clone(automationRaw)
    : clone(DEFAULT_AUTOMATION_GOVERNANCE)

  return { notification, aiPreferences, automationGovernance }
}

function browserStorage(): KeyValueStorage {
  if (typeof localStorage === 'undefined') {
    throw new Error('Local storage is unavailable')
  }
  return localStorage
}

function tableList(database: AppDatabase) {
  return [
    database.todos,
    database.scheduleEvents,
    database.moodRecords,
    database.periodRecords,
    database.dailyHealthSummaries,
    database.continuityItems,
    database.actionAuditRecords,
  ]
}

async function readTables(database: AppDatabase): Promise<LifeOSBackupData> {
  const [todos, scheduleEvents, moodRecords, periodRecords, dailyHealthSummaries, continuityItems, actionAuditRecords] = await Promise.all([
    database.todos.toArray(),
    database.scheduleEvents.toArray(),
    database.moodRecords.toArray(),
    database.periodRecords.toArray(),
    database.dailyHealthSummaries.toArray(),
    database.continuityItems.toArray(),
    database.actionAuditRecords.toArray(),
  ])
  return { todos, scheduleEvents, moodRecords, periodRecords, dailyHealthSummaries, continuityItems, actionAuditRecords }
}

async function readConsistentData(database: AppDatabase): Promise<LifeOSBackupData> {
  return database.transaction('r', tableList(database), () => readTables(database))
}

function sortedData(data: LifeOSBackupData): LifeOSBackupData {
  const sort = <T>(items: T[], key: (item: T) => string) => [...items].sort((a, b) => key(a).localeCompare(key(b)))
  return {
    todos: sort(data.todos, (item) => item.id),
    scheduleEvents: sort(data.scheduleEvents, (item) => item.id),
    moodRecords: sort(data.moodRecords, (item) => item.id),
    periodRecords: sort(data.periodRecords, (item) => item.id),
    dailyHealthSummaries: sort(data.dailyHealthSummaries, (item) => item.date),
    continuityItems: sort(data.continuityItems, (item) => item.id),
    actionAuditRecords: sort(data.actionAuditRecords, (item) => item.executionId),
  }
}

function dataMatches(actual: LifeOSBackupData, expected: LifeOSBackupData): boolean {
  return JSON.stringify(sortedData(actual)) === JSON.stringify(sortedData(expected))
}

async function replaceDataInTransaction(database: AppDatabase, data: LifeOSBackupData): Promise<void> {
  await database.transaction('rw', tableList(database), async () => {
    await Promise.all(tableList(database).map((table) => table.clear()))
    const writes = [
      data.todos.length ? database.todos.bulkAdd(data.todos) : Promise.resolve(''),
      data.scheduleEvents.length ? database.scheduleEvents.bulkAdd(data.scheduleEvents) : Promise.resolve(''),
      data.moodRecords.length ? database.moodRecords.bulkAdd(data.moodRecords) : Promise.resolve(''),
      data.periodRecords.length ? database.periodRecords.bulkAdd(data.periodRecords) : Promise.resolve(''),
      data.dailyHealthSummaries.length ? database.dailyHealthSummaries.bulkAdd(data.dailyHealthSummaries) : Promise.resolve(''),
      data.continuityItems.length ? database.continuityItems.bulkAdd(data.continuityItems) : Promise.resolve(''),
      data.actionAuditRecords.length ? database.actionAuditRecords.bulkAdd(data.actionAuditRecords) : Promise.resolve(''),
    ]
    await Promise.all(writes)
    const reread = await readTables(database)
    if (!dataMatches(reread, data)) throw new RestoreVerificationError('Transaction verification did not match the package')
  })
}

type RawSettingsSnapshot = Record<(typeof SETTINGS_KEYS)[number], string | null>

function readRawSettings(storage: KeyValueStorage): RawSettingsSnapshot {
  return Object.fromEntries(SETTINGS_KEYS.map((key) => [key, storage.getItem(key)])) as RawSettingsSnapshot
}

function writeRawSettings(storage: KeyValueStorage, snapshot: RawSettingsSnapshot): void {
  for (const key of SETTINGS_KEYS) {
    const value = snapshot[key]
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  }
}

function restoredSettingsSnapshot(storage: KeyValueStorage, settings: LifeOSBackupSettings): RawSettingsSnapshot {
  const currentNotification = parseStoredObject(storage, NOTIFICATION_SETTINGS_STORAGE_KEY)
  const permission = currentNotification?.browserPermission
  const browserPermission = permission === 'granted' || permission === 'denied' || permission === 'default'
    ? permission
    : 'default'
  const currentAI = parseStoredObject(storage, AI_SETTINGS_STORAGE_KEY)
  const apiKey = typeof currentAI?.apiKey === 'string' ? currentAI.apiKey : ''
  const enabled = currentAI?.enabled === true && apiKey.length > 0
  return {
    [NOTIFICATION_SETTINGS_STORAGE_KEY]: JSON.stringify({ ...settings.notification, browserPermission }),
    [AI_SETTINGS_STORAGE_KEY]: JSON.stringify({ ...settings.aiPreferences, apiKey, enabled }),
    [AUTOMATION_SETTINGS_STORAGE_KEY]: JSON.stringify(settings.automationGovernance),
  }
}

function applySettingsAtomically(storage: KeyValueStorage, settings: LifeOSBackupSettings): RawSettingsSnapshot {
  const before = readRawSettings(storage)
  const after = restoredSettingsSnapshot(storage, settings)
  try {
    writeRawSettings(storage, after)
    const verified = readRawSettings(storage)
    if (JSON.stringify(verified) !== JSON.stringify(after)) throw new RestoreVerificationError('Settings verification failed')
    return before
  } catch (error) {
    try {
      writeRawSettings(storage, before)
    } catch (rollbackError) {
      throw new RestoreRollbackError(error, rollbackError)
    }
    throw error
  }
}

export interface BackupServiceDependencies {
  database?: AppDatabase
  storage?: KeyValueStorage
  now?: () => string
}

export async function exportLifeOSDataPackage(
  dependencies: BackupServiceDependencies = {},
): Promise<LifeOSDataPackageV1> {
  const database = dependencies.database ?? db
  const storage = dependencies.storage ?? browserStorage()
  const exportedAt = readIsoTimestamp((dependencies.now ?? (() => new Date().toISOString()))(), 'exportedAt')
  // Raw IndexedDB may still contain V1 Todo records. Normalize them only in the
  // exported package; do not write compatibility defaults back to the live DB.
  const data = parseData(await readConsistentData(database), true)
  return buildPackage(data, readPortableSettings(storage), exportedAt)
}

function assertPreparedRestore(prepared: PreparedLifeOSRestore): LifeOSDataPackageV1 {
  if (
    (prepared.source === 'schema-v1' && prepared.settingsMode !== 'replace') ||
    (prepared.source === 'legacy-3.0.0' && prepared.settingsMode !== 'preserve')
  ) {
    throw new BackupPackageValidationError('Prepared restore source/settings mode mismatch')
  }
  return parseCurrentPackage(prepared.package)
}

export async function restoreLifeOSDataPackage(
  prepared: PreparedLifeOSRestore,
  dependencies: BackupServiceDependencies = {},
): Promise<LifeOSRestoreResult> {
  const database = dependencies.database ?? db
  const storage = dependencies.storage ?? browserStorage()
  const packageToRestore = assertPreparedRestore(prepared)
  const previousData = await readConsistentData(database)
  let previousSettings: RawSettingsSnapshot | null = null
  let databaseCommitted = false

  try {
    if (prepared.settingsMode === 'replace') {
      previousSettings = applySettingsAtomically(storage, packageToRestore.settings)
    }
    await replaceDataInTransaction(database, packageToRestore.data)
    databaseCommitted = true
    const verifiedData = await readConsistentData(database)
    if (!dataMatches(verifiedData, packageToRestore.data)) {
      throw new RestoreVerificationError('Post-restore database verification did not match the package')
    }
  } catch (error) {
    try {
      if (databaseCommitted) await replaceDataInTransaction(database, previousData)
      if (previousSettings !== null) writeRawSettings(storage, previousSettings)
    } catch (rollbackError) {
      throw new RestoreRollbackError(error, rollbackError)
    }
    throw error
  }

  return {
    source: prepared.source,
    schemaVersion: LIFEOS_DATA_PACKAGE_SCHEMA_VERSION,
    restoredAt: readIsoTimestamp((dependencies.now ?? (() => new Date().toISOString()))(), 'restoredAt'),
    recordCounts: recordCounts(packageToRestore.data),
    settingsMode: prepared.settingsMode,
    verified: true,
  }
}

export function serializeLifeOSDataPackage(packageToSerialize: LifeOSDataPackageV1): string {
  return JSON.stringify(parseCurrentPackage(packageToSerialize), null, 2)
}
