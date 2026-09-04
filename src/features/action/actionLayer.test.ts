import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { AppDatabase } from '../../data/database.ts'
import { DexieActionAuditRepository } from './auditRepository.ts'
import {
  executeTodoAction,
  undoTodoAction,
} from './services/TodoActionExecutor.ts'
import { buildTodoActionProposal } from './services/TodoActionProposal.ts'
import type {
  ActionAuditEvent,
  ActionAuditRecord,
  ActionAuditUpdate,
  IActionAuditRepository,
  TodoActionPermission,
  TodoActionPort,
  TodoActionProposal,
} from './types.ts'
import type { CreateTodoInput, Todo, UpdateTodoInput } from '../todo/types.ts'

process.env.TZ = 'Asia/Shanghai'
Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

const openedDatabases: AppDatabase[] = []

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    title: 'Original Todo',
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
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

class MemoryTodoPort implements TodoActionPort {
  readonly items = new Map<string, Todo>()
  getCalls = 0
  createCalls = 0
  updateCalls = 0
  readonly updatePatches: UpdateTodoInput[] = []
  removeCalls = 0
  failGet = false
  failCreate = false
  failUpdate = false
  private idIndex = 0
  private timeIndex = 0

  constructor(initial: Todo[] = []) {
    initial.forEach((item) => this.items.set(item.id, clone(item)))
  }

  private timestamp(): string {
    return new Date(Date.UTC(2026, 8, 4, 4, 0, this.timeIndex++)).toISOString()
  }

  async getById(id: string): Promise<Todo | undefined> {
    this.getCalls += 1
    if (this.failGet) throw new Error('read failed')
    const item = this.items.get(id)
    return item ? clone(item) : undefined
  }

  async create(input: CreateTodoInput): Promise<Todo> {
    this.createCalls += 1
    if (this.failCreate) throw new Error('create failed')
    const at = this.timestamp()
    const created: Todo = {
      id: `created-${++this.idIndex}`,
      title: input.title.trim(),
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      recurrenceStartDate: input.recurrenceStartDate ?? null,
      recurrenceEndDate: input.recurrenceEndDate ?? null,
      priority: input.priority ?? 2,
      category: input.category ?? null,
      recurrence: input.recurrence ?? 'none',
      completedDates: [],
      completed: false,
      completedAt: null,
      createdAt: at,
      updatedAt: at,
    }
    this.items.set(created.id, clone(created))
    return clone(created)
  }

  async update(id: string, patch: UpdateTodoInput): Promise<Todo> {
    this.updateCalls += 1
    this.updatePatches.push(clone(patch))
    if (this.failUpdate) throw new Error('update failed')
    const existing = this.items.get(id)
    if (!existing) throw new Error(`Todo not found: ${id}`)
    const updated = {
      ...existing,
      ...clone(patch),
      updatedAt: this.timestamp(),
    }
    this.items.set(id, clone(updated))
    return clone(updated)
  }

  async remove(id: string): Promise<void> {
    this.removeCalls += 1
    this.items.delete(id)
  }
}

class MemoryAuditRepository implements IActionAuditRepository {
  readonly records = new Map<string, ActionAuditRecord>()
  failOnEvent: ActionAuditEvent['type'] | null = null

  async create(record: ActionAuditRecord): Promise<ActionAuditRecord> {
    if (this.records.has(record.executionId)) throw new Error('duplicate audit')
    this.records.set(record.executionId, clone(record))
    return clone(record)
  }

  async appendEvent(
    executionId: string,
    event: ActionAuditEvent,
    update: ActionAuditUpdate,
  ): Promise<ActionAuditRecord> {
    if (this.failOnEvent === event.type) throw new Error('audit append failed')
    const existing = this.records.get(executionId)
    if (!existing) throw new Error('audit missing')
    const updated: ActionAuditRecord = {
      ...existing,
      ...update,
      status: update.status,
      events: [...existing.events, event],
      updatedAt: event.at,
    }
    this.records.set(executionId, clone(updated))
    return clone(updated)
  }

  async getByExecutionId(
    executionId: string,
  ): Promise<ActionAuditRecord | undefined> {
    const record = this.records.get(executionId)
    return record ? clone(record) : undefined
  }

  async getByProposalId(proposalId: string): Promise<ActionAuditRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.proposalId === proposalId)
      .map(clone)
  }
}

function metadata(id = 'proposal-1') {
  return {
    proposalId: id,
    intelligenceRequestId: 'intelligence-request-1',
    proposedAt: '2026-09-04T03:55:00.000Z',
  }
}

function permission(
  proposal: TodoActionProposal,
  todoIds: string[] = [],
): TodoActionPermission {
  return { allowedActions: [proposal.action], allowedTodoIds: todoIds }
}

function dependencies(todoPort: MemoryTodoPort, audit: MemoryAuditRepository) {
  let executionIndex = 0
  let timeIndex = 0
  return {
    todo: todoPort,
    audit,
    now: () =>
      new Date(Date.UTC(2026, 8, 4, 4, 0, timeIndex++)).toISOString(),
    generateExecutionId: () => `execution-${++executionIndex}`,
  }
}

function confirmation(proposal: TodoActionProposal) {
  return {
    proposalId: proposal.proposalId,
    confirmedAt: '2026-09-04T03:59:00.000Z',
  }
}

afterEach(async () => {
  await Promise.all(openedDatabases.splice(0).map((database) => database.delete()))
})

describe('Todo Action proposal governance', () => {
  it('将 untrusted draft 转为 host-owned create proposal 并固定风险与确认规则', () => {
    const proposal = buildTodoActionProposal(
      {
        action: 'todo.create',
        reason: '  User asked to capture this task.  ',
        payload: {
          title: '  Buy groceries  ',
          dueDate: '2026-09-05',
          recurrence: 'none',
        },
      },
      metadata(),
    )

    assert.equal(proposal.trigger, 'user')
    assert.equal(proposal.actionClass, 'data')
    assert.equal(proposal.domain, 'todo')
    assert.equal(proposal.risk, 'medium')
    assert.equal(proposal.confirmationRequired, true)
    assert.equal(proposal.reason, 'User asked to capture this task.')
    assert.equal(proposal.action, 'todo.create')
    if (proposal.action === 'todo.create') {
      assert.equal(proposal.payload.title, 'Buy groceries')
    }
  })

  it('拒绝未知 action 字段、完成字段旁路和非法日期', () => {
    assert.throws(
      () =>
        buildTodoActionProposal(
          {
            action: 'todo.update',
            reason: 'Bypass completion',
            payload: {
              todoId: 'todo-1',
              patch: { completed: true },
            },
          },
          metadata(),
        ),
      /unsupported field: completed/,
    )
    assert.throws(
      () =>
        buildTodoActionProposal(
          {
            action: 'todo.set-completion',
            reason: 'Bad date',
            payload: {
              todoId: 'todo-1',
              date: '2026-02-30',
              completed: true,
            },
          },
          metadata(),
        ),
      /valid local date/,
    )
  })
})

describe('Todo Action execution pipeline', () => {
  it('Permission 与 required Confirmation 都发生在 Todo 读取/写入之前', async () => {
    const proposal = buildTodoActionProposal(
      {
        action: 'todo.update',
        reason: 'Rename Todo',
        payload: { todoId: 'todo-1', patch: { title: 'Renamed' } },
      },
      metadata(),
    )
    const todoPort = new MemoryTodoPort([todo()])
    const audit = new MemoryAuditRepository()
    const deps = dependencies(todoPort, audit)

    const denied = await executeTodoAction(
      proposal,
      { allowedActions: [], allowedTodoIds: [] },
      null,
      deps,
    )
    assert.equal(denied.status, 'permission-denied')
    assert.equal(todoPort.getCalls, 0)
    assert.equal(todoPort.updateCalls, 0)

    const needsConfirmation = await executeTodoAction(
      { ...proposal, proposalId: 'proposal-2' },
      permission(proposal, ['todo-1']),
      null,
      deps,
    )
    assert.equal(needsConfirmation.status, 'confirmation-required')
    assert.equal(todoPort.getCalls, 0)
    assert.equal(todoPort.updateCalls, 0)

    const futureConfirmation = await executeTodoAction(
      { ...proposal, proposalId: 'proposal-3' },
      permission(proposal, ['todo-1']),
      {
        proposalId: 'proposal-3',
        confirmedAt: '2030-01-01T00:00:00.000Z',
      },
      deps,
    )
    assert.equal(futureConfirmation.status, 'confirmation-required')
    assert.equal(todoPort.getCalls, 0)
  })

  it('Create 完成 Proposal→Permission→Confirmation→Execute→Audit→Undo', async () => {
    const proposal = buildTodoActionProposal(
      {
        action: 'todo.create',
        reason: 'Create requested task',
        payload: {
          title: 'Buy groceries',
          dueDate: '2026-09-05',
          priority: 1,
        },
      },
      metadata(),
    )
    const todoPort = new MemoryTodoPort()
    const audit = new MemoryAuditRepository()
    const deps = dependencies(todoPort, audit)

    const executed = await executeTodoAction(
      proposal,
      permission(proposal),
      confirmation(proposal),
      deps,
    )
    assert.equal(executed.status, 'executed')
    if (executed.status !== 'executed') return
    assert.equal(executed.audit.targetTodoId, executed.todo.id)
    assert.deepEqual(executed.audit.events.map((event) => event.type), [
      'started',
      'executed',
    ])

    const undone = await undoTodoAction(
      executed.undoToken,
      permission(proposal, [executed.todo.id]),
      deps,
    )
    assert.equal(undone.status, 'undone')
    assert.equal(await todoPort.getById(executed.todo.id), undefined)
    assert.deepEqual(undone.audit.events.map((event) => event.type), [
      'started',
      'executed',
      'undo-started',
      'undone',
    ])
  })

  it('Update 复用 Todo recurrence validation，并可补偿恢复旧值', async () => {
    const invalid = buildTodoActionProposal(
      {
        action: 'todo.update',
        reason: 'Make recurring without an anchor',
        payload: { todoId: 'todo-1', patch: { recurrence: 'daily' } },
      },
      metadata('proposal-invalid'),
    )
    const todoPort = new MemoryTodoPort([todo()])
    const audit = new MemoryAuditRepository()
    const deps = dependencies(todoPort, audit)
    const invalidResult = await executeTodoAction(
      invalid,
      permission(invalid, ['todo-1']),
      confirmation(invalid),
      deps,
    )
    assert.equal(invalidResult.status, 'validation-failed')
    assert.equal(todoPort.updateCalls, 0)

    const historyTodo = todo({
      id: 'todo-history',
      recurrence: 'daily',
      dueDate: null,
      recurrenceStartDate: '2026-09-01',
      completedDates: ['2026-09-04'],
    })
    const historyPort = new MemoryTodoPort([historyTodo])
    const historyAudit = new MemoryAuditRepository()
    const historyProposal = buildTodoActionProposal(
      {
        action: 'todo.update',
        reason: 'Shorten recurrence range',
        payload: {
          todoId: historyTodo.id,
          patch: { recurrenceEndDate: '2026-09-03' },
        },
      },
      metadata('proposal-history'),
    )
    const historyResult = await executeTodoAction(
      historyProposal,
      permission(historyProposal, [historyTodo.id]),
      confirmation(historyProposal),
      dependencies(historyPort, historyAudit),
    )
    assert.equal(historyResult.status, 'validation-failed')
    assert.equal(historyPort.updateCalls, 0)

    const proposal = buildTodoActionProposal(
      {
        action: 'todo.update',
        reason: 'Rename and reschedule',
        payload: {
          todoId: 'todo-1',
          patch: { title: 'Updated Todo', dueDate: '2026-09-06' },
        },
      },
      metadata('proposal-update'),
    )
    const executed = await executeTodoAction(
      proposal,
      permission(proposal, ['todo-1']),
      confirmation(proposal),
      deps,
    )
    assert.equal(executed.status, 'executed')
    if (executed.status !== 'executed') return
    assert.equal(executed.todo.title, 'Updated Todo')

    const undone = await undoTodoAction(
      executed.undoToken,
      permission(proposal, ['todo-1']),
      deps,
    )
    assert.equal(undone.status, 'undone')
    assert.equal((await todoPort.getById('todo-1'))?.title, 'Original Todo')
    assert.equal((await todoPort.getById('todo-1'))?.dueDate, '2026-09-04')
    assert.deepEqual(
      Object.keys(todoPort.updatePatches[todoPort.updatePatches.length - 1]).sort(),
      ['dueDate', 'title'],
    )
  })

  it('Set Completion 为低风险免二次确认，但仍受 ID 权限、当天与实例校验', async () => {
    const recurring = todo({
      recurrence: 'daily',
      dueDate: null,
      recurrenceStartDate: '2026-09-01',
    })
    const proposal = buildTodoActionProposal(
      {
        action: 'todo.set-completion',
        reason: 'User marked today complete',
        payload: { todoId: recurring.id, date: '2026-09-04', completed: true },
      },
      metadata(),
    )
    const todoPort = new MemoryTodoPort([recurring])
    const audit = new MemoryAuditRepository()
    const deps = dependencies(todoPort, audit)

    const executed = await executeTodoAction(
      proposal,
      permission(proposal, [recurring.id]),
      null,
      deps,
    )
    assert.equal(executed.status, 'executed')
    if (executed.status !== 'executed') return
    assert.deepEqual(executed.todo.completedDates, ['2026-09-04'])

    const undone = await undoTodoAction(
      executed.undoToken,
      permission(proposal, [recurring.id]),
      deps,
    )
    assert.equal(undone.status, 'undone')
    assert.deepEqual((await todoPort.getById(recurring.id))?.completedDates, [])

    const staleProposal = buildTodoActionProposal(
      {
        action: 'todo.set-completion',
        reason: 'Stale proposal',
        payload: { todoId: recurring.id, date: '2026-09-03', completed: true },
      },
      metadata('proposal-stale'),
    )
    const staleResult = await executeTodoAction(
      staleProposal,
      permission(staleProposal, [recurring.id]),
      null,
      deps,
    )
    assert.equal(staleResult.status, 'validation-failed')

    const weekly = todo({
      id: 'todo-weekly',
      recurrence: 'weekly',
      dueDate: null,
      recurrenceStartDate: '2026-09-01',
    })
    const weeklyPort = new MemoryTodoPort([weekly])
    const weeklyAudit = new MemoryAuditRepository()
    const weeklyProposal = buildTodoActionProposal(
      {
        action: 'todo.set-completion',
        reason: 'Invalid weekly occurrence',
        payload: { todoId: weekly.id, date: '2026-09-04', completed: true },
      },
      metadata('proposal-weekly'),
    )
    const weeklyResult = await executeTodoAction(
      weeklyProposal,
      permission(weeklyProposal, [weekly.id]),
      null,
      dependencies(weeklyPort, weeklyAudit),
    )
    assert.equal(weeklyResult.status, 'validation-failed')
    assert.deepEqual((await weeklyPort.getById(weekly.id))?.completedDates, [])
  })

  it('Proactive Action Proposal 即使低风险也必须等待用户确认', async () => {
    const existing = todo()
    const proposal = buildTodoActionProposal(
      {
        action: 'todo.set-completion',
        reason: 'Proactive suggestion only',
        payload: { todoId: existing.id, date: '2026-09-04', completed: true },
      },
      { ...metadata('proposal-proactive'), trigger: 'proactive' },
    )
    assert.equal(proposal.trigger, 'proactive')
    assert.equal(proposal.confirmationRequired, true)

    const todoPort = new MemoryTodoPort([existing])
    const result = await executeTodoAction(
      proposal,
      permission(proposal, [existing.id]),
      null,
      dependencies(todoPort, new MemoryAuditRepository()),
    )

    assert.equal(result.status, 'confirmation-required')
    assert.equal(todoPort.getCalls, 0)
    assert.equal(todoPort.updateCalls, 0)
  })

  it('Undo 检测 Action 后的 Todo 变化，不覆盖用户新修改', async () => {
    const proposal = buildTodoActionProposal(
      {
        action: 'todo.update',
        reason: 'Rename Todo',
        payload: { todoId: 'todo-1', patch: { title: 'Action title' } },
      },
      metadata(),
    )
    const todoPort = new MemoryTodoPort([todo()])
    const audit = new MemoryAuditRepository()
    const deps = dependencies(todoPort, audit)
    const executed = await executeTodoAction(
      proposal,
      permission(proposal, ['todo-1']),
      confirmation(proposal),
      deps,
    )
    assert.equal(executed.status, 'executed')
    if (executed.status !== 'executed') return

    await todoPort.update('todo-1', { title: 'User changed this later' })
    const undo = await undoTodoAction(
      executed.undoToken,
      permission(proposal, ['todo-1']),
      deps,
    )

    assert.equal(undo.status, 'undo-conflict')
    assert.equal((await todoPort.getById('todo-1'))?.title, 'User changed this later')
  })

  it('Undo 读取失败时留下明确失败审计', async () => {
    const proposal = buildTodoActionProposal(
      {
        action: 'todo.update',
        reason: 'Rename Todo',
        payload: { todoId: 'todo-1', patch: { title: 'Action title' } },
      },
      metadata(),
    )
    const todoPort = new MemoryTodoPort([todo()])
    const audit = new MemoryAuditRepository()
    const deps = dependencies(todoPort, audit)
    const executed = await executeTodoAction(
      proposal,
      permission(proposal, ['todo-1']),
      confirmation(proposal),
      deps,
    )
    assert.equal(executed.status, 'executed')
    if (executed.status !== 'executed') return

    todoPort.failGet = true
    const undone = await undoTodoAction(
      executed.undoToken,
      permission(proposal, ['todo-1']),
      deps,
    )

    assert.equal(undone.status, 'undo-failed')
    assert.equal(undone.audit.status, 'undo-failed')
    assert.equal(
      undone.audit.events[undone.audit.events.length - 1]?.code,
      'todo-read-failed',
    )
  })

  it('Todo execution 失败会留下失败审计，audit finalization 失败则自动补偿', async () => {
    const proposal = buildTodoActionProposal(
      {
        action: 'todo.create',
        reason: 'Create Todo',
        payload: { title: 'Action Todo' },
      },
      metadata(),
    )
    const failedPort = new MemoryTodoPort()
    failedPort.failCreate = true
    const failedAudit = new MemoryAuditRepository()
    const failed = await executeTodoAction(
      proposal,
      permission(proposal),
      confirmation(proposal),
      dependencies(failedPort, failedAudit),
    )
    assert.equal(failed.status, 'execution-failed')
    assert.equal(failed.audit.status, 'execution-failed')

    const compensatedPort = new MemoryTodoPort()
    const unavailableAudit = new MemoryAuditRepository()
    unavailableAudit.failOnEvent = 'executed'
    await assert.rejects(
      executeTodoAction(
        proposal,
        permission(proposal),
        confirmation(proposal),
        dependencies(compensatedPort, unavailableAudit),
      ),
      /mutation was compensated/,
    )
    assert.equal(compensatedPort.items.size, 0)
    assert.equal(
      [...unavailableAudit.records.values()][0].status,
      'started',
    )
  })
})

describe('Action Audit Local-First persistence', () => {
  it('v4 → v5 migration 保留既有数据并支持 append-only lifecycle events', async () => {
    const name = `lifeos-action-${Date.now()}-${Math.random()}`
    const legacy = new Dexie(name)
    legacy.version(1).stores({
      todos: 'id, dueDate, completed, priority, createdAt',
      scheduleEvents: 'id, type, startDateTime, createdAt',
      moodRecords: 'id, date, createdAt',
    })
    legacy.version(2).stores({ periodRecords: 'id, startDate, endDate, createdAt' })
    legacy.version(3).stores({ dailyHealthSummaries: 'date' })
    legacy.version(4).stores({
      continuityItems:
        'id, continuityType, status, relationshipId, createdAt, updatedAt, supersedesId, supersededById, [continuityType+status], [relationshipId+status]',
    })
    await legacy.open()
    await legacy.table('todos').put({ id: 'todo-v1', createdAt: '2026-09-01' })
    await legacy.table('continuityItems').put({
      id: 'continuity-v4',
      continuityType: 'life',
      status: 'active',
    })
    legacy.close()

    const database = new AppDatabase(name)
    openedDatabases.push(database)
    await database.open()
    assert.equal((await database.todos.get('todo-v1'))?.id, 'todo-v1')
    assert.equal(
      (await database.continuityItems.get('continuity-v4'))?.id,
      'continuity-v4',
    )

    const repository = new DexieActionAuditRepository(database)
    const started: ActionAuditRecord = {
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
      events: [{ type: 'started', at: '2026-09-04T04:00:00.000Z', code: null }],
      createdAt: '2026-09-04T04:00:00.000Z',
      updatedAt: '2026-09-04T04:00:00.000Z',
    }
    await repository.create(started)
    const executed = await repository.appendEvent(
      started.executionId,
      { type: 'executed', at: '2026-09-04T04:01:00.000Z', code: null },
      {
        status: 'executed',
        targetTodoId: 'created-1',
        executedAt: '2026-09-04T04:01:00.000Z',
      },
    )

    assert.deepEqual(executed.events.map((event) => event.type), [
      'started',
      'executed',
    ])
    assert.equal((await repository.getByProposalId('proposal-1')).length, 1)
    assert.equal(JSON.stringify(executed).includes('Action Todo'), false)
  })
})
