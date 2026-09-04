import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import {
  AppDatabase,
  CURRENT_DATABASE_SCHEMA_VERSION,
  DatabaseMigrationError,
  openAppDatabase,
} from './database.ts'
import {
  HISTORICAL_MIGRATION_FIXTURES,
  HISTORICAL_TABLE_INTRODUCED_AT,
  currentProbeRow,
  defineHistoricalSchema,
  historicalRowsForVersion,
  type HistoricalMigrationFixture,
  type HistoricalTableName,
} from './migration-fixtures/historicalLifeOS.ts'
import {
  exportLifeOSDataPackage,
  prepareLifeOSRestore,
  restoreLifeOSDataPackage,
} from '../features/backup/BackupService.ts'
import type { KeyValueStorage, LifeOSBackupData } from '../features/backup/types.ts'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

const CURRENT_TABLES = Object.keys(HISTORICAL_TABLE_INTRODUCED_AT) as HistoricalTableName[]
const databaseNames: string[] = []
const openHandles: Dexie[] = []

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function databaseName(label: string): string {
  const name = `lifeos-migration-gate-${label}-${Date.now()}-${Math.random()}`
  databaseNames.push(name)
  return name
}

function track<T extends Dexie>(database: T): T {
  openHandles.push(database)
  return database
}

async function seedHistoricalDatabase(
  database: Dexie,
  fixture: HistoricalMigrationFixture,
): Promise<void> {
  const rows = historicalRowsForVersion(fixture.version)
  await database.transaction(
    'rw',
    Object.keys(rows).map((tableName) => database.table(tableName)),
    async () => {
      for (const [tableName, entries] of Object.entries(rows)) {
        if (entries && entries.length > 0) {
          await database.table(tableName).bulkAdd(entries)
        }
      }
    },
  )
}

function primaryKeyFor(
  tableName: HistoricalTableName,
  row: Record<string, unknown>,
): string {
  if (tableName === 'dailyHealthSummaries') return String(row.date)
  if (tableName === 'actionAuditRecords') return String(row.executionId)
  return String(row.id)
}

async function readRows(
  database: Dexie,
  tableNames: readonly HistoricalTableName[],
): Promise<Partial<Record<HistoricalTableName, Record<string, unknown>[]>>> {
  const result: Partial<Record<HistoricalTableName, Record<string, unknown>[]>> = {}
  for (const tableName of tableNames) {
    const rows = await database.table<Record<string, unknown>>(tableName).toArray()
    result[tableName] = rows.sort((left, right) =>
      primaryKeyFor(tableName, left).localeCompare(primaryKeyFor(tableName, right)),
    )
  }
  return result
}

async function assertCurrentTablesUsable(
  database: AppDatabase,
  fixture: HistoricalMigrationFixture,
): Promise<void> {
  const suffix = String(fixture.version).padStart(2, '0')
  for (const tableName of CURRENT_TABLES) {
    const row = currentProbeRow(tableName, suffix)
    const key = primaryKeyFor(tableName, row)
    const table = database.table<Record<string, unknown>, string>(tableName)
    await table.add(row)
    assert.equal(primaryKeyFor(tableName, (await table.get(key))!), key)
    await table.delete(key)
    assert.equal(await table.get(key), undefined)
  }
}

function dataRows(
  data: LifeOSBackupData,
): Record<HistoricalTableName, Record<string, unknown>[]> {
  return {
    todos: data.todos as unknown as Record<string, unknown>[],
    scheduleEvents: data.scheduleEvents as unknown as Record<string, unknown>[],
    moodRecords: data.moodRecords as unknown as Record<string, unknown>[],
    periodRecords: data.periodRecords as unknown as Record<string, unknown>[],
    dailyHealthSummaries: data.dailyHealthSummaries as unknown as Record<string, unknown>[],
    continuityItems: data.continuityItems as unknown as Record<string, unknown>[],
    actionAuditRecords: data.actionAuditRecords as unknown as Record<string, unknown>[],
  }
}

afterEach(async () => {
  for (const handle of openHandles.splice(0)) handle.close()
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)))
})

describe('Historical LifeOS migration matrix', () => {
  for (const fixture of HISTORICAL_MIGRATION_FIXTURES) {
    it(`${fixture.label} upgrades to v${CURRENT_DATABASE_SCHEMA_VERSION}, reopens idempotently, and survives Backup → Restore`, async () => {
      const name = databaseName(`v${fixture.version}`)
      const legacy = track(new Dexie(name))
      defineHistoricalSchema(legacy, fixture.version)
      await legacy.open()
      await seedHistoricalDatabase(legacy, fixture)
      const historicalTables = CURRENT_TABLES.filter(
        (tableName) => HISTORICAL_TABLE_INTRODUCED_AT[tableName] <= fixture.version,
      )
      const beforeUpgrade = await readRows(legacy, historicalTables)
      legacy.close()

      const upgraded = track(new AppDatabase(name))
      const status = await openAppDatabase(upgraded)
      assert.deepEqual(status, {
        databaseName: name,
        schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
        ready: true,
      })
      assert.deepEqual(await readRows(upgraded, historicalTables), beforeUpgrade)
      assert.deepEqual(
        upgraded.tables.map((table) => table.name).sort(),
        [...CURRENT_TABLES].sort(),
      )
      await assertCurrentTablesUsable(upgraded, fixture)
      const afterFirstOpen = await readRows(upgraded, CURRENT_TABLES)
      upgraded.close()

      const reopened = track(new AppDatabase(name))
      await openAppDatabase(reopened)
      assert.deepEqual(await readRows(reopened, CURRENT_TABLES), afterFirstOpen)

      const storage = new MemoryStorage()
      const dataPackage = await exportLifeOSDataPackage({ database: reopened, storage })
      const recovery = track(new AppDatabase(databaseName(`v${fixture.version}-recovery`)))
      const restoreResult = await restoreLifeOSDataPackage(
        prepareLifeOSRestore(dataPackage),
        { database: recovery, storage: new MemoryStorage() },
      )
      assert.equal(restoreResult.verified, true)
      assert.deepEqual(
        await readRows(recovery, CURRENT_TABLES),
        Object.fromEntries(
          Object.entries(dataRows(dataPackage.data)).map(([tableName, rows]) => [
            tableName,
            [...rows].sort((left, right) =>
              primaryKeyFor(tableName as HistoricalTableName, left).localeCompare(
                primaryKeyFor(tableName as HistoricalTableName, right),
              ),
            ),
          ]),
        ),
      )
    })
  }
})

describe('Migration failure atomicity and diagnostics', () => {
  it('rejects READY, reports the failed target, leaves v4 intact, and permits a clean retry', async () => {
    const name = databaseName('failure')
    const legacy = track(new Dexie(name))
    defineHistoricalSchema(legacy, 4)
    await legacy.open()
    await seedHistoricalDatabase(legacy, { version: 4, label: 'failure fixture' })
    const beforeFailure = await readRows(
      legacy,
      CURRENT_TABLES.filter((tableName) => HISTORICAL_TABLE_INTRODUCED_AT[tableName] <= 4),
    )
    legacy.close()

    const failingUpgrade = track(new Dexie(name))
    defineHistoricalSchema(failingUpgrade, 5, true)
    await assert.rejects(openAppDatabase(failingUpgrade), (error: unknown) => {
      assert.ok(error instanceof DatabaseMigrationError)
      assert.equal(error.targetSchemaVersion, 5)
      assert.equal(error.databaseName, name)
      assert.match(error.causeMessage, /simulated v5 migration failure/)
      return true
    })

    const v4Inspector = track(new Dexie(name))
    defineHistoricalSchema(v4Inspector, 4)
    await v4Inspector.open()
    assert.equal(v4Inspector.verno, 4)
    assert.equal(v4Inspector.tables.some((table) => table.name === 'actionAuditRecords'), false)
    assert.deepEqual(await readRows(v4Inspector, Object.keys(beforeFailure) as HistoricalTableName[]), beforeFailure)
    v4Inspector.close()

    const retry = track(new AppDatabase(name))
    const retryStatus = await openAppDatabase(retry)
    assert.equal(retryStatus.ready, true)
    assert.equal(retry.verno, 5)
    assert.deepEqual(await readRows(retry, Object.keys(beforeFailure) as HistoricalTableName[]), beforeFailure)
    assert.equal(retry.tables.some((table) => table.name === 'actionAuditRecords'), true)
    assert.equal(await retry.actionAuditRecords.count(), 0)
  })
})
