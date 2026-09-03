import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { AppDatabase } from '../../data/database.ts'
import { DexieContinuityRepository } from './repository.ts'
import type {
  ContinuityEvidence,
  CreateConfirmedContinuityInput,
} from './types.ts'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

const openedDatabases: AppDatabase[] = []

function databaseName(testName: string): string {
  return `lifeos-continuity-${testName}-${Date.now()}-${Math.random()}`
}

function evidence(note: string): ContinuityEvidence {
  return {
    kind: 'user-statement',
    reference: null,
    note,
    observedAt: null,
  }
}

function lifeInput(content: string): CreateConfirmedContinuityInput {
  return {
    continuityType: 'life',
    content,
    evidence: [evidence('User confirmed this information')],
  }
}

function relationshipInput(
  relationshipId: string,
  content: string,
): CreateConfirmedContinuityInput {
  return {
    continuityType: 'relationship',
    relationshipId,
    content,
    evidence: [evidence('User confirmed this relationship information')],
  }
}

function repositoryFor(database: AppDatabase): DexieContinuityRepository {
  let timestampIndex = 0
  let idIndex = 0
  return new DexieContinuityRepository(database, {
    now: () =>
      new Date(Date.UTC(2026, 8, 3, 0, 0, timestampIndex++)).toISOString(),
    generateId: () => `continuity-${++idIndex}`,
  })
}

afterEach(async () => {
  await Promise.all(openedDatabases.splice(0).map((database) => database.delete()))
})

describe('Continuity Dexie migration', () => {
  it('从 v3 升级到 v4 时保留 V1-V3 数据并仅新增 Continuity 表', async () => {
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
    legacy.version(3).stores({
      dailyHealthSummaries: 'date',
    })
    await legacy.open()
    await legacy.table('todos').put({ id: 'todo-v1', createdAt: '2026-09-01' })
    await legacy.table('periodRecords').put({
      id: 'period-v2',
      startDate: '2026-09-01',
      endDate: null,
      createdAt: '2026-09-01',
    })
    await legacy.table('dailyHealthSummaries').put({ date: '2026-09-01' })
    legacy.close()

    const upgraded = new AppDatabase(name)
    openedDatabases.push(upgraded)
    await upgraded.open()

    assert.equal((await upgraded.todos.get('todo-v1'))?.id, 'todo-v1')
    assert.equal((await upgraded.periodRecords.get('period-v2'))?.id, 'period-v2')
    assert.equal(
      (await upgraded.dailyHealthSummaries.get('2026-09-01'))?.date,
      '2026-09-01',
    )
    assert.equal(upgraded.continuityItems.schema.primKey.keyPath, 'id')
    assert.equal(await upgraded.continuityItems.count(), 0)
  })
})

describe('Continuity Repository', () => {
  it('只创建人工确认项，并以结构化边界分别读取 Life 与 Relationship', async () => {
    const database = new AppDatabase(databaseName('create-and-read'))
    openedDatabases.push(database)
    const repository = repositoryFor(database)

    const life = await repository.createConfirmed(
      lifeInput('  I prefer quiet mornings.  '),
    )
    const relationship = await repository.createConfirmed(
      relationshipInput('person-alex', 'Alex prefers messages before calls.'),
    )
    const newerLife = await repository.createConfirmed(
      lifeInput('I take a walk after lunch.'),
    )

    assert.equal(life.continuityType, 'life')
    assert.equal(life.relationshipId, null)
    assert.equal(life.content, 'I prefer quiet mornings.')
    assert.equal(life.confirmation.method, 'manual')
    assert.equal(life.status, 'active')
    assert.deepEqual(life.lifecycle.map((event) => event.type), ['confirmed'])

    assert.deepEqual(
      (await repository.getActiveLife()).map((item) => item.id),
      [newerLife.id, life.id],
    )
    assert.deepEqual(
      (await repository.getActiveRelationship('person-alex')).map(
        (item) => item.id,
      ),
      [relationship.id],
    )
    assert.deepEqual(await repository.getActiveRelationship('person-other'), [])
  })

  it('更新只作用于 active 项，并追加可追溯的生命周期事件', async () => {
    const database = new AppDatabase(databaseName('update'))
    openedDatabases.push(database)
    const repository = repositoryFor(database)
    const created = await repository.createConfirmed(lifeInput('Original text'))

    const updated = await repository.update(created.id, {
      content: '  Corrected text  ',
    })

    assert.equal(updated.content, 'Corrected text')
    assert.notEqual(updated.updatedAt, updated.createdAt)
    assert.deepEqual(updated.lifecycle.map((event) => event.type), [
      'confirmed',
      'updated',
    ])
    assert.deepEqual(updated.evidence, created.evidence)
  })

  it('过期与删除语义分离：保留原记录、原因与生命周期痕迹', async () => {
    const database = new AppDatabase(databaseName('expire'))
    openedDatabases.push(database)
    const repository = repositoryFor(database)
    const created = await repository.createConfirmed(lifeInput('Temporary fact'))

    const expired = await repository.expire(created.id, '  No longer current  ')

    assert.equal(expired.status, 'expired')
    assert.ok(expired.expiredAt)
    assert.deepEqual(expired.lifecycle[expired.lifecycle.length - 1], {
      type: 'expired',
      at: expired.expiredAt,
      reason: 'No longer current',
    })
    assert.equal((await repository.getById(created.id))?.content, 'Temporary fact')
    assert.deepEqual(await repository.getActiveLife(), [])
    assert.deepEqual(
      (await repository.getByStatus('life', 'expired')).map((item) => item.id),
      [created.id],
    )
    await assert.rejects(
      repository.update(created.id, { content: 'Should fail' }),
      /is not active/,
    )
  })

  it('supersede 原子创建替代项、保留双向关系并可读取完整链', async () => {
    const database = new AppDatabase(databaseName('supersede'))
    openedDatabases.push(database)
    const repository = repositoryFor(database)
    const first = await repository.createConfirmed(
      relationshipInput('person-alex', 'Alex lives in Shanghai.'),
    )

    const result = await repository.supersede(
      first.id,
      relationshipInput('person-alex', 'Alex lives in Hangzhou.'),
    )

    assert.equal(result.previous.status, 'superseded')
    assert.equal(result.previous.supersededById, result.replacement.id)
    assert.equal(result.replacement.supersedesId, result.previous.id)
    assert.equal(result.replacement.status, 'active')
    assert.deepEqual(
      (await repository.getLifecycleChain(result.replacement.id)).map(
        (item) => item.id,
      ),
      [result.previous.id, result.replacement.id],
    )
    assert.deepEqual(
      (await repository.getActiveRelationship('person-alex')).map(
        (item) => item.id,
      ),
      [result.replacement.id],
    )
  })

  it('禁止跨 Life/Relationship 或跨 relationshipId 替代，失败时不写半成品', async () => {
    const database = new AppDatabase(databaseName('boundary'))
    openedDatabases.push(database)
    const repository = repositoryFor(database)
    const original = await repository.createConfirmed(
      relationshipInput('person-alex', 'Original relationship fact'),
    )

    await assert.rejects(
      repository.supersede(original.id, lifeInput('Wrong domain')),
      /same Continuity type/,
    )
    await assert.rejects(
      repository.supersede(
        original.id,
        relationshipInput('person-sam', 'Wrong relationship'),
      ),
      /same relationshipId/,
    )

    assert.equal(await database.continuityItems.count(), 1)
    assert.equal((await repository.getById(original.id))?.status, 'active')
  })

  it('替代项 ID 冲突时整笔事务回滚，不覆盖旧 Continuity', async () => {
    const database = new AppDatabase(databaseName('id-collision'))
    openedDatabases.push(database)
    const ids = ['original-id', 'occupied-id', 'occupied-id']
    const repository = new DexieContinuityRepository(database, {
      now: () => '2026-09-03T00:00:00.000Z',
      generateId: () => ids.shift()!,
    })
    const original = await repository.createConfirmed(lifeInput('Original'))
    const occupied = await repository.createConfirmed(lifeInput('Occupied'))

    await assert.rejects(
      repository.supersede(original.id, lifeInput('Replacement')),
    )

    assert.equal(await database.continuityItems.count(), 2)
    assert.equal((await repository.getById(original.id))?.status, 'active')
    assert.equal((await repository.getById(occupied.id))?.content, 'Occupied')
  })
})
