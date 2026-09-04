import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { AppDatabase } from '../../data/database.ts'
import { DEFAULT_AUTOMATION_GOVERNANCE } from '../automation/types.ts'
import {
  AI_SETTINGS_STORAGE_KEY,
  AUTOMATION_SETTINGS_STORAGE_KEY,
  NOTIFICATION_SETTINGS_STORAGE_KEY,
} from '../../shared/lib/storageKeys.ts'
import type { ActionAuditRecord } from '../action/types.ts'
import type { ContinuityItem } from '../continuity/types.ts'
import type { DailyHealthSummary, DailyHealthMetric } from '../health/types.ts'
import type { ScheduleEvent } from '../schedule/types.ts'
import type { Todo } from '../todo/types.ts'
import {
  BackupPackageValidationError,
  exportLifeOSDataPackage,
  prepareLifeOSRestore,
  restoreLifeOSDataPackage,
  serializeLifeOSDataPackage,
} from './BackupService.ts'
import type { KeyValueStorage } from './types.ts'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

const openedDatabases: AppDatabase[] = []

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>()
  failNextSetFor: string | null = null

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.failNextSetFor === key) {
      this.failNextSetFor = null
      throw new Error(`storage write failed: ${key}`)
    }
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function database(testName: string): AppDatabase {
  const instance = new AppDatabase(`lifeos-backup-${testName}-${Date.now()}-${Math.random()}`)
  openedDatabases.push(instance)
  return instance
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function metric<T>(value: T): DailyHealthMetric<T> {
  return {
    status: 'available',
    value,
    source: { id: 'native-health', label: 'Health' },
    collectedAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T01:00:00.000Z',
  }
}

function todo(id = 'todo-1'): Todo {
  return {
    id,
    title: 'Prepare recovery drill',
    description: null,
    dueDate: '2026-09-04',
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    priority: 1,
    category: 'LifeOS',
    recurrence: 'none',
    completedDates: [],
    completed: false,
    completedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
  }
}

function schedule(): ScheduleEvent {
  return {
    id: 'schedule-1',
    title: 'Recovery review',
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

function health(): DailyHealthSummary {
  return {
    date: '2026-09-04',
    sleep: metric({ durationMinutes: 480 }),
    restingHeartRate: metric({ beatsPerMinute: 58 }),
    heartRateVariability: metric({ milliseconds: 43 }),
    steps: metric({ count: 8000 }),
    activity: metric({ activeMinutes: 45 }),
  }
}

function continuity(): ContinuityItem {
  return {
    id: 'continuity-1',
    continuityType: 'life',
    relationshipId: null,
    content: 'Backups are user-controlled.',
    status: 'active',
    confirmation: { method: 'manual', confirmedAt: '2026-09-04T00:00:00.000Z' },
    evidence: [{ kind: 'user-statement', reference: null, note: null, observedAt: null }],
    lifecycle: [{ type: 'confirmed', at: '2026-09-04T00:00:00.000Z' }],
    supersedesId: null,
    supersededById: null,
    expiredAt: null,
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
  }
}

function audit(): ActionAuditRecord {
  return {
    executionId: 'execution-1',
    proposalId: 'proposal-1',
    intelligenceRequestId: 'request-1',
    actionClass: 'data',
    domain: 'todo',
    action: 'todo.create',
    risk: 'medium',
    status: 'started',
    targetTodoId: null,
    confirmationRequired: true,
    confirmedAt: null,
    executedAt: null,
    undoneAt: null,
    events: [{ type: 'started', at: '2026-09-04T00:00:00.000Z', code: null }],
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
  }
}

async function seedFacts(target: AppDatabase): Promise<void> {
  await target.todos.add(todo())
  await target.scheduleEvents.add(schedule())
  await target.moodRecords.add({
    id: 'mood-1', date: '2026-09-04', level: 4, tags: ['calm'], note: null,
    createdAt: '2026-09-04T02:00:00.000Z', updatedAt: '2026-09-04T02:00:00.000Z',
  })
  await target.periodRecords.add({
    id: 'period-1', startDate: '2026-09-01', endDate: '2026-09-04', flowLevel: 2,
    symptoms: [], note: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-04T00:00:00.000Z',
  })
  await target.dailyHealthSummaries.add(health())
  await target.continuityItems.add(continuity())
  await target.actionAuditRecords.add(audit())
}

function seedSettings(storage: MemoryStorage, apiKey = 'secret-key'): void {
  storage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify({
    enabled: false,
    browserPermission: 'granted',
    todoReminders: { enabled: true, remindBefore: 30 },
    scheduleReminders: { enabled: false, remindBefore: 15 },
    dailySummary: { enabled: true, time: '20:30' },
    soundEnabled: false,
    vibrateEnabled: true,
  }))
  storage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify({
    apiKey,
    dailyLimit: 8,
    model: 'local-preference-model',
    enabled: true,
  }))
  storage.setItem(AUTOMATION_SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_AUTOMATION_GOVERNANCE))
}

afterEach(async () => {
  await Promise.all(openedDatabases.splice(0).map((instance) => instance.delete()))
})

describe('LifeOS Data Package export and validation', () => {
  it('exports every fact table with counts while excluding derived state, credentials, and runtime state', async () => {
    const source = database('export')
    const storage = new MemoryStorage()
    seedSettings(storage)
    await seedFacts(source)

    const packageV1 = await exportLifeOSDataPackage({
      database: source,
      storage,
      now: () => '2026-09-04T08:00:00.000Z',
    })
    const serialized = serializeLifeOSDataPackage(packageV1)

    assert.equal(packageV1.schemaVersion, 1)
    assert.equal(packageV1.metadata.databaseSchemaVersion, 5)
    assert.deepEqual(packageV1.metadata.recordCounts, {
      todos: 1,
      scheduleEvents: 1,
      moodRecords: 1,
      periodRecords: 1,
      dailyHealthSummaries: 1,
      continuityItems: 1,
      actionAuditRecords: 1,
    })
    assert.equal(serialized.includes('secret-key'), false)
    assert.equal(serialized.includes('browserPermission'), false)
    assert.equal(serialized.includes('lifeState'), false)
    assert.equal(prepareLifeOSRestore(JSON.parse(serialized)).source, 'schema-v1')
  })

  it('rejects corruption, duplicate primary keys, count mismatch, and future package versions before any write', async () => {
    const source = database('invalid-package')
    const storage = new MemoryStorage()
    await seedFacts(source)
    const valid = await exportLifeOSDataPackage({ database: source, storage })

    const countMismatch = clone(valid) as unknown as { metadata: { recordCounts: { todos: number } } }
    countMismatch.metadata.recordCounts.todos = 99
    assert.throws(() => prepareLifeOSRestore(countMismatch), BackupPackageValidationError)

    const duplicate = clone(valid)
    duplicate.data.todos.push(clone(duplicate.data.todos[0]!))
    duplicate.metadata.recordCounts.todos = 2
    assert.throws(() => prepareLifeOSRestore(duplicate), /duplicate primary key/)

    const corruptedHealth = clone(valid) as unknown as { data: { dailyHealthSummaries: Array<{ steps: { value: { count: number } } }> } }
    corruptedHealth.data.dailyHealthSummaries[0]!.steps.value.count = -1
    assert.throws(() => prepareLifeOSRestore(corruptedHealth), /non-negative/)

    const future = clone(valid) as unknown as { schemaVersion: number }
    future.schemaVersion = 2
    assert.throws(() => prepareLifeOSRestore(future), /unsupported package schema version/)
  })

  it('migrates the real legacy 3.0.0 export shape and preserves settings absent from that format', () => {
    const legacyTodo = clone(todo()) as unknown as Record<string, unknown>
    delete legacyTodo.category
    delete legacyTodo.recurrence
    delete legacyTodo.recurrenceStartDate
    delete legacyTodo.recurrenceEndDate
    delete legacyTodo.completedDates
    const prepared = prepareLifeOSRestore({
      version: '3.0.0',
      exportedAt: '2026-09-04T08:00:00.000Z',
      data: {
        todos: [legacyTodo],
        scheduleEvents: [],
        moodRecords: [],
        periodRecords: [],
      },
    })

    assert.equal(prepared.source, 'legacy-3.0.0')
    assert.equal(prepared.settingsMode, 'preserve')
    assert.equal(prepared.package.data.todos[0]?.recurrence, 'none')
    assert.deepEqual(prepared.package.data.todos[0]?.completedDates, [])
    assert.equal(prepared.package.metadata.recordCounts.dailyHealthSummaries, 0)
  })

  it('normalizes legacy Todo rows during export without writing the defaults back to IndexedDB', async () => {
    const source = database('legacy-row-export')
    const storage = new MemoryStorage()
    const legacyTodo = clone(todo('legacy-row')) as unknown as Record<string, unknown>
    delete legacyTodo.category
    delete legacyTodo.recurrence
    delete legacyTodo.recurrenceStartDate
    delete legacyTodo.recurrenceEndDate
    delete legacyTodo.completedDates
    await source.todos.add(legacyTodo as unknown as Todo)

    const packageV1 = await exportLifeOSDataPackage({ database: source, storage })

    assert.equal(packageV1.data.todos[0]?.recurrence, 'none')
    assert.deepEqual(packageV1.data.todos[0]?.completedDates, [])
    const rawRow = await source.table<Record<string, unknown>>('todos').get('legacy-row')
    assert.equal(Object.prototype.hasOwnProperty.call(rawRow, 'recurrence'), false)
  })
})

describe('LifeOS disaster recovery', () => {
  it('performs Data → Export → independent environment → Restore → reread Verify', async () => {
    const source = database('source')
    const sourceStorage = new MemoryStorage()
    seedSettings(sourceStorage, 'source-secret')
    await seedFacts(source)
    const exported = await exportLifeOSDataPackage({ database: source, storage: sourceStorage })

    const recovery = database('recovery')
    const recoveryStorage = new MemoryStorage()
    seedSettings(recoveryStorage, 'recovery-device-secret')
    await recovery.todos.add(todo('obsolete-local-todo'))

    const result = await restoreLifeOSDataPackage(
      prepareLifeOSRestore(JSON.parse(serializeLifeOSDataPackage(exported))),
      { database: recovery, storage: recoveryStorage, now: () => '2026-09-04T09:00:00.000Z' },
    )

    assert.equal(result.verified, true)
    assert.deepEqual(result.recordCounts, exported.metadata.recordCounts)
    assert.equal(await recovery.todos.get('obsolete-local-todo'), undefined)
    assert.deepEqual(await recovery.todos.toArray(), exported.data.todos)
    assert.deepEqual(await recovery.scheduleEvents.toArray(), exported.data.scheduleEvents)
    assert.deepEqual(await recovery.moodRecords.toArray(), exported.data.moodRecords)
    assert.deepEqual(await recovery.periodRecords.toArray(), exported.data.periodRecords)
    assert.deepEqual(await recovery.dailyHealthSummaries.toArray(), exported.data.dailyHealthSummaries)
    assert.deepEqual(await recovery.continuityItems.toArray(), exported.data.continuityItems)
    assert.deepEqual(await recovery.actionAuditRecords.toArray(), exported.data.actionAuditRecords)
    const restoredAI = JSON.parse(recoveryStorage.getItem(AI_SETTINGS_STORAGE_KEY)!) as Record<string, unknown>
    assert.equal(restoredAI.apiKey, 'recovery-device-secret')
    assert.equal(restoredAI.dailyLimit, 8)
    const restoredNotification = JSON.parse(recoveryStorage.getItem(NOTIFICATION_SETTINGS_STORAGE_KEY)!) as Record<string, unknown>
    assert.equal(restoredNotification.browserPermission, 'granted')
  })

  it('rolls settings back and leaves all existing data intact when the Dexie restore transaction fails', async () => {
    const source = database('failure-source')
    const sourceStorage = new MemoryStorage()
    seedSettings(sourceStorage)
    await seedFacts(source)
    const prepared = prepareLifeOSRestore(await exportLifeOSDataPackage({ database: source, storage: sourceStorage }))

    const target = database('failure-target')
    const targetStorage = new MemoryStorage()
    seedSettings(targetStorage, 'target-secret')
    await target.todos.add(todo('keep-me'))
    const settingsBefore = new Map(targetStorage.values)
    target.scheduleEvents.hook('creating', () => {
      throw new Error('simulated restore write failure')
    })

    await assert.rejects(
      restoreLifeOSDataPackage(prepared, { database: target, storage: targetStorage }),
      /simulated restore write failure/,
    )
    assert.deepEqual((await target.todos.toArray()).map((item) => item.id), ['keep-me'])
    assert.equal(await target.scheduleEvents.count(), 0)
    assert.deepEqual(targetStorage.values, settingsBefore)
  })

  it('does not touch IndexedDB and compensates partial localStorage writes when settings restore fails', async () => {
    const source = database('settings-source')
    const sourceStorage = new MemoryStorage()
    seedSettings(sourceStorage)
    await seedFacts(source)
    const prepared = prepareLifeOSRestore(await exportLifeOSDataPackage({ database: source, storage: sourceStorage }))

    const target = database('settings-target')
    const targetStorage = new MemoryStorage()
    seedSettings(targetStorage, 'keep-secret')
    await target.todos.add(todo('keep-me'))
    const settingsBefore = new Map(targetStorage.values)
    targetStorage.failNextSetFor = AUTOMATION_SETTINGS_STORAGE_KEY

    await assert.rejects(
      restoreLifeOSDataPackage(prepared, { database: target, storage: targetStorage }),
      /storage write failed/,
    )
    assert.deepEqual((await target.todos.toArray()).map((item) => item.id), ['keep-me'])
    assert.deepEqual(targetStorage.values, settingsBefore)
  })

  it('revalidates a prepared plan immediately before restore so later mutation cannot reach storage', async () => {
    const source = database('mutation-source')
    const sourceStorage = new MemoryStorage()
    await seedFacts(source)
    const prepared = prepareLifeOSRestore(await exportLifeOSDataPackage({ database: source, storage: sourceStorage }))
    prepared.package.data.todos[0]!.title = ''

    const target = database('mutation-target')
    const targetStorage = new MemoryStorage()
    await target.todos.add(todo('keep-me'))
    await assert.rejects(
      restoreLifeOSDataPackage(prepared, { database: target, storage: targetStorage }),
      BackupPackageValidationError,
    )
    assert.deepEqual((await target.todos.toArray()).map((item) => item.id), ['keep-me'])
  })

  it('restores a migrated legacy package without overwriting current user settings', async () => {
    const target = database('legacy-restore')
    const storage = new MemoryStorage()
    seedSettings(storage, 'keep-secret')
    const settingsBefore = new Map(storage.values)
    const prepared = prepareLifeOSRestore({
      version: '3.0.0',
      exportedAt: '2026-09-04T08:00:00.000Z',
      data: {
        todos: [todo('legacy-todo')],
        scheduleEvents: [],
        moodRecords: [],
        periodRecords: [],
        dailyHealthSummaries: [],
        continuityItems: [],
        actionAuditRecords: [],
      },
    })

    const result = await restoreLifeOSDataPackage(prepared, { database: target, storage })
    assert.equal(result.source, 'legacy-3.0.0')
    assert.equal((await target.todos.toArray())[0]?.id, 'legacy-todo')
    assert.deepEqual(storage.values, settingsBefore)
  })
})
