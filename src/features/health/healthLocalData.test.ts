import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { AppDatabase } from '../../data/database.ts'
import {
  HealthImportValidationError,
  importDailyHealthSummary,
  parseDailyHealthSummary,
} from './importBoundary.ts'
import { DexieHealthRepository } from './repository.ts'
import type { DailyHealthSummary } from './types.ts'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

const openedDatabases: AppDatabase[] = []

function databaseName(testName: string): string {
  return `lifeos-health-${testName}-${Date.now()}-${Math.random()}`
}

function makeSummary(date: string, steps = 6840): DailyHealthSummary {
  const source = { id: 'native-health-provider', label: 'Native health provider' }
  const updatedAt = `${date}T12:00:00+08:00`
  return {
    date,
    sleep: {
      status: 'available',
      value: { durationMinutes: 455 },
      source,
      collectedAt: `${date}T08:00:00+08:00`,
      updatedAt,
    },
    restingHeartRate: {
      status: 'no-data',
      value: null,
      source,
      collectedAt: null,
      updatedAt,
    },
    heartRateVariability: {
      status: 'stale',
      value: { milliseconds: 42 },
      source,
      collectedAt: `${date}T07:30:00+08:00`,
      updatedAt,
    },
    steps: {
      status: 'available',
      value: { count: steps },
      source,
      collectedAt: `${date}T11:45:00+08:00`,
      updatedAt,
    },
    activity: {
      status: 'unavailable',
      value: null,
      source: null,
      collectedAt: null,
      updatedAt,
    },
  }
}

afterEach(async () => {
  await Promise.all(openedDatabases.splice(0).map((database) => database.delete()))
})

describe('Health Dexie migration', () => {
  it('从 v2 升级到 v3 时保留 V1/V2 数据并新增 Health 表', async () => {
    const name = databaseName('migration')
    const legacy = new Dexie(name)
    legacy.version(1).stores({
      todos: 'id, dueDate, completed, priority, createdAt',
      scheduleEvents: 'id, type, startDateTime, createdAt',
      moodRecords: 'id, date, createdAt',
    })
    legacy.version(2).stores({
      periodRecords: 'id, startDate, endDate, createdAt',
    })
    await legacy.open()
    await legacy.table('todos').put({ id: 'todo-v1', createdAt: '2026-09-01' })
    await legacy.table('periodRecords').put({
      id: 'period-v2',
      startDate: '2026-09-01',
      endDate: null,
      createdAt: '2026-09-01',
    })
    legacy.close()

    const upgraded = new AppDatabase(name)
    openedDatabases.push(upgraded)
    await upgraded.open()

    assert.equal((await upgraded.todos.get('todo-v1'))?.id, 'todo-v1')
    assert.equal((await upgraded.periodRecords.get('period-v2'))?.id, 'period-v2')
    assert.equal(upgraded.dailyHealthSummaries.schema.primKey.keyPath, 'date')
  })
})

describe('Health Repository and import boundary', () => {
  it('同日导入安全 upsert，并支持日期与闭区间读取', async () => {
    const database = new AppDatabase(databaseName('repository'))
    openedDatabases.push(database)
    const repository = new DexieHealthRepository(database)

    await importDailyHealthSummary(makeSummary('2026-09-01', 1000), repository)
    await importDailyHealthSummary(makeSummary('2026-09-02', 2000), repository)
    await importDailyHealthSummary(makeSummary('2026-09-03', 3000), repository)
    await importDailyHealthSummary(makeSummary('2026-09-02', 2500), repository)

    assert.equal(await database.dailyHealthSummaries.count(), 3)
    const replaced = await repository.getByDate('2026-09-02')
    assert.equal(replaced?.steps.value?.count, 2500)
    assert.deepEqual(
      (await repository.getByDateRange('2026-09-02', '2026-09-03')).map(
        (summary) => summary.date
      ),
      ['2026-09-02', '2026-09-03']
    )
  })

  it('外部输入先严格校验，拒绝 raw samples 和状态/值不一致', () => {
    const withRawSamples = {
      ...makeSummary('2026-09-03'),
      rawSamples: [{ value: 1 }],
    }
    assert.throws(
      () => parseDailyHealthSummary(withRawSamples),
      HealthImportValidationError
    )

    const invalidNoData = makeSummary('2026-09-03') as unknown as Record<string, unknown>
    invalidNoData.sleep = {
      status: 'no-data',
      value: { durationMinutes: 400 },
      source: { id: 'provider', label: null },
      collectedAt: null,
      updatedAt: '2026-09-03T12:00:00+08:00',
    }
    assert.throws(
      () => parseDailyHealthSummary(invalidNoData),
      HealthImportValidationError
    )
  })

  it('拒绝倒置的日期范围', async () => {
    const database = new AppDatabase(databaseName('range'))
    openedDatabases.push(database)
    const repository = new DexieHealthRepository(database)

    await assert.rejects(
      repository.getByDateRange('2026-09-03', '2026-09-01'),
      /start must not be after end/
    )
  })
})
