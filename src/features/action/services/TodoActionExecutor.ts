import { toDateStr } from '../../../shared/lib/date.ts'
import {
  buildTodoCompletionPatch,
  getCanonicalTodoScheduleFields,
  isTodoOnDate,
} from '../../todo/services/todoServices.ts'
import type { Todo, UpdateTodoInput } from '../../todo/types.ts'
import type {
  ActionAuditEventType,
  ActionAuditRecord,
  ActionConfirmation,
  ActionRisk,
  IActionAuditRepository,
  TodoActionExecutionResult,
  TodoActionKind,
  TodoActionPermission,
  TodoActionPort,
  TodoActionProposal,
  TodoActionUndoResult,
  TodoActionUndoToken,
  TodoEditablePatch,
} from '../types.ts'

export interface TodoActionExecutorDependencies {
  todo: TodoActionPort
  audit: IActionAuditRepository
  now: () => string
  generateExecutionId: () => string
}

class ActionFinalizationError extends Error {}

function riskFor(action: TodoActionKind): ActionRisk {
  return action === 'todo.set-completion' ? 'low' : 'medium'
}

function requiresConfirmation(
  action: TodoActionKind,
  trigger: TodoActionProposal['trigger'],
): boolean {
  return trigger === 'proactive' || action === 'todo.create' || action === 'todo.update'
}

function targetTodoId(proposal: TodoActionProposal): string | null {
  return proposal.action === 'todo.create' ? null : proposal.payload.todoId
}

function hasPermission(
  proposal: TodoActionProposal,
  permission: TodoActionPermission,
): boolean {
  if (!permission.allowedActions.includes(proposal.action)) return false
  const todoId = targetTodoId(proposal)
  return todoId === null || permission.allowedTodoIds.includes(todoId)
}

function hasValidConfirmation(
  proposal: TodoActionProposal,
  confirmation: ActionConfirmation | null,
  executionStartedAt: string,
): confirmation is ActionConfirmation {
  if (!confirmation || confirmation.proposalId !== proposal.proposalId) return false
  const confirmedAt = Date.parse(confirmation.confirmedAt)
  return (
    Number.isFinite(confirmedAt) &&
    confirmedAt >= Date.parse(proposal.proposedAt) &&
    confirmedAt <= Date.parse(executionStartedAt)
  )
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function canonicalUpdatePatch(
  existing: Todo,
  patch: TodoEditablePatch,
): UpdateTodoInput {
  const schedulingChanged =
    hasOwn(patch, 'recurrence') ||
    hasOwn(patch, 'dueDate') ||
    hasOwn(patch, 'recurrenceStartDate') ||
    hasOwn(patch, 'recurrenceEndDate')

  if (!schedulingChanged) return patch

  const recurrence = patch.recurrence ?? existing.recurrence
  const dueDate = hasOwn(patch, 'dueDate') ? patch.dueDate : existing.dueDate
  const recurrenceStartDate = hasOwn(patch, 'recurrenceStartDate')
    ? patch.recurrenceStartDate
    : existing.recurrenceStartDate
  const recurrenceEndDate = hasOwn(patch, 'recurrenceEndDate')
    ? patch.recurrenceEndDate
    : existing.recurrenceEndDate

  const canonicalPatch: UpdateTodoInput = {
    ...patch,
    ...getCanonicalTodoScheduleFields(
      recurrence,
      dueDate,
      recurrenceStartDate,
      recurrenceEndDate,
    ),
  }

  const candidate: Todo = { ...existing, ...canonicalPatch }
  if (
    existing.recurrence === 'none' &&
    candidate.recurrence !== 'none' &&
    existing.completed
  ) {
    throw new Error('completed non-recurring Todo cannot become recurring')
  }
  if (
    existing.recurrence !== 'none' &&
    candidate.recurrence === 'none' &&
    existing.completedDates.length > 0
  ) {
    throw new Error('recurring Todo with completion history cannot become non-recurring')
  }
  if (
    candidate.recurrence !== 'none' &&
    existing.completedDates.some((date) => !isTodoOnDate(candidate, date))
  ) {
    throw new Error('recurrence update would invalidate completion history')
  }

  return canonicalPatch
}

function compensationPatch(before: Todo, after: Todo): UpdateTodoInput {
  const patch: UpdateTodoInput = {}
  const scalarFields = [
    'title',
    'description',
    'dueDate',
    'recurrenceStartDate',
    'recurrenceEndDate',
    'priority',
    'category',
    'recurrence',
    'completed',
    'completedAt',
  ] as const

  for (const field of scalarFields) {
    if (before[field] !== after[field]) {
      Object.assign(patch, { [field]: before[field] })
    }
  }
  if (
    before.completedDates.length !== after.completedDates.length ||
    before.completedDates.some(
      (date, index) => date !== after.completedDates[index],
    )
  ) {
    patch.completedDates = [...before.completedDates]
  }
  return patch
}

function todosEqual(a: Todo, b: Todo): boolean {
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.description === b.description &&
    a.dueDate === b.dueDate &&
    a.recurrenceStartDate === b.recurrenceStartDate &&
    a.recurrenceEndDate === b.recurrenceEndDate &&
    a.priority === b.priority &&
    a.category === b.category &&
    a.recurrence === b.recurrence &&
    a.completed === b.completed &&
    a.completedAt === b.completedAt &&
    a.createdAt === b.createdAt &&
    a.updatedAt === b.updatedAt &&
    a.completedDates.length === b.completedDates.length &&
    a.completedDates.every((date, index) => date === b.completedDates[index])
  )
}

function createStartedAudit(
  proposal: TodoActionProposal,
  executionId: string,
  at: string,
): ActionAuditRecord {
  const confirmationRequired = requiresConfirmation(proposal.action, proposal.trigger)
  return {
    executionId,
    proposalId: proposal.proposalId,
    intelligenceRequestId: proposal.intelligenceRequestId,
    actionClass: 'data',
    domain: 'todo',
    action: proposal.action,
    risk: riskFor(proposal.action),
    status: 'started',
    targetTodoId: targetTodoId(proposal),
    confirmationRequired,
    confirmedAt: null,
    executedAt: null,
    undoneAt: null,
    events: [{ type: 'started', at, code: null }],
    createdAt: at,
    updatedAt: at,
  }
}

async function recordStatus(
  auditRepository: IActionAuditRepository,
  audit: ActionAuditRecord,
  type: ActionAuditEventType,
  at: string,
  code: string | null,
  update: {
    targetTodoId?: string | null
    confirmedAt?: string | null
    executedAt?: string | null
    undoneAt?: string | null
  } = {},
): Promise<ActionAuditRecord> {
  return auditRepository.appendEvent(
    audit.executionId,
    { type, at, code },
    { status: type, ...update },
  )
}

function assertProposalEnvelope(proposal: TodoActionProposal): void {
  if (
    proposal.schemaVersion !== '1' ||
    (proposal.trigger !== 'user' && proposal.trigger !== 'proactive') ||
    proposal.actionClass !== 'data' ||
    proposal.domain !== 'todo'
  ) {
    throw new Error('Invalid governed Todo Action proposal envelope')
  }
}

export async function executeTodoAction(
  proposal: TodoActionProposal,
  permission: TodoActionPermission,
  confirmation: ActionConfirmation | null,
  dependencies: TodoActionExecutorDependencies,
): Promise<TodoActionExecutionResult> {
  assertProposalEnvelope(proposal)
  const previousAttempts = await dependencies.audit.getByProposalId(
    proposal.proposalId,
  )
  const hasBlockingAttempt = previousAttempts.some(
    (audit) =>
      audit.status !== 'permission-denied' &&
      audit.status !== 'confirmation-required',
  )
  if (hasBlockingAttempt) {
    throw new Error(
      `Todo Action proposal already has a terminal or in-flight attempt: ${proposal.proposalId}`,
    )
  }
  const startedAt = dependencies.now()
  let audit = createStartedAudit(
    proposal,
    dependencies.generateExecutionId(),
    startedAt,
  )
  audit = await dependencies.audit.create(audit)

  if (!hasPermission(proposal, permission)) {
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'permission-denied',
      dependencies.now(),
      'permission-denied',
    )
    return { status: 'permission-denied', audit }
  }

  const confirmationRequired = requiresConfirmation(proposal.action, proposal.trigger)
  if (
    confirmationRequired &&
    !hasValidConfirmation(proposal, confirmation, startedAt)
  ) {
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'confirmation-required',
      dependencies.now(),
      'confirmation-required',
    )
    return { status: 'confirmation-required', audit }
  }

  const confirmedAt = hasValidConfirmation(proposal, confirmation, startedAt)
    ? confirmation.confirmedAt
    : null
  let before: Todo | null = null
  let updatePatch: UpdateTodoInput | null = null

  if (proposal.action !== 'todo.create') {
    try {
      before = (await dependencies.todo.getById(proposal.payload.todoId)) ?? null
    } catch {
      audit = await recordStatus(
        dependencies.audit,
        audit,
        'execution-failed',
        dependencies.now(),
        'todo-read-failed',
        { confirmedAt },
      )
      return { status: 'execution-failed', audit }
    }
  }

  try {
    if (proposal.action !== 'todo.create' && !before) {
      throw new Error('target-todo-not-found')
    }

    if (proposal.action === 'todo.update') {
      updatePatch = canonicalUpdatePatch(before!, proposal.payload.patch)
    } else if (proposal.action === 'todo.set-completion') {
      if (proposal.payload.date !== toDateStr(startedAt)) {
        throw new Error('completion-date-must-be-today')
      }
      updatePatch = buildTodoCompletionPatch(
        before!,
        proposal.payload.date,
        proposal.payload.completed,
        startedAt,
      )
    }
  } catch {
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'validation-failed',
      dependencies.now(),
      'domain-validation-failed',
      { confirmedAt },
    )
    return { status: 'validation-failed', audit }
  }

  try {
    const todo =
      proposal.action === 'todo.create'
        ? await dependencies.todo.create(proposal.payload)
        : await dependencies.todo.update(proposal.payload.todoId, updatePatch!)
    const undoToken: TodoActionUndoToken =
      proposal.action === 'todo.create'
        ? {
            executionId: audit.executionId,
            proposalId: proposal.proposalId,
            action: proposal.action,
            todoId: todo.id,
            compensation: 'remove-created',
            expectedAfter: todo,
          }
        : {
            executionId: audit.executionId,
            proposalId: proposal.proposalId,
            action: proposal.action,
            todoId: todo.id,
            compensation: 'restore-todo',
            before: before!,
            expectedAfter: todo,
          }

    try {
      const executedAt = dependencies.now()
      audit = await recordStatus(
        dependencies.audit,
        audit,
        'executed',
        executedAt,
        null,
        { confirmedAt, executedAt, targetTodoId: todo.id },
      )
    } catch (auditError) {
      try {
        const current = await dependencies.todo.getById(undoToken.todoId)
        if (undoToken.compensation === 'remove-created') {
          if (current && !todosEqual(current, undoToken.expectedAfter)) {
            throw new Error('Todo changed before automatic compensation')
          }
          if (current) await dependencies.todo.remove(undoToken.todoId)
        } else {
          if (!current || !todosEqual(current, undoToken.expectedAfter)) {
            throw new Error('Todo changed before automatic compensation')
          }
          await dependencies.todo.update(
            undoToken.todoId,
            compensationPatch(undoToken.before, undoToken.expectedAfter),
          )
        }
      } catch {
        throw new ActionFinalizationError(
          `Action audit finalization and automatic compensation both failed: ${String(auditError)}`,
        )
      }
      throw new ActionFinalizationError(
        'Action audit finalization failed; Todo mutation was compensated',
      )
    }

    return { status: 'executed', todo, audit, undoToken }
  } catch (error) {
    if (error instanceof ActionFinalizationError) {
      throw error
    }
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'execution-failed',
      dependencies.now(),
      'todo-execution-failed',
      { confirmedAt },
    )
    return { status: 'execution-failed', audit }
  }
}

export async function undoTodoAction(
  token: TodoActionUndoToken,
  permission: TodoActionPermission,
  dependencies: Omit<TodoActionExecutorDependencies, 'generateExecutionId'>,
): Promise<TodoActionUndoResult> {
  let audit = await dependencies.audit.getByExecutionId(token.executionId)
  if (
    !audit ||
    audit.proposalId !== token.proposalId ||
    audit.action !== token.action ||
    audit.status !== 'executed'
  ) {
    throw new Error('Undo token does not match an executed Action audit')
  }

  if (
    !permission.allowedActions.includes(token.action) ||
    !permission.allowedTodoIds.includes(token.todoId)
  ) {
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'undo-failed',
      dependencies.now(),
      'undo-permission-denied',
    )
    return { status: 'undo-failed', audit }
  }

  audit = await recordStatus(
    dependencies.audit,
    audit,
    'undo-started',
    dependencies.now(),
    null,
  )
  let current: Todo | undefined
  try {
    current = await dependencies.todo.getById(token.todoId)
  } catch {
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'undo-failed',
      dependencies.now(),
      'todo-read-failed',
    )
    return { status: 'undo-failed', audit }
  }

  if (current && !todosEqual(current, token.expectedAfter)) {
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'undo-conflict',
      dependencies.now(),
      'todo-changed-after-action',
    )
    return { status: 'undo-conflict', audit }
  }
  if (!current && token.compensation === 'restore-todo') {
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'undo-conflict',
      dependencies.now(),
      'todo-missing-after-action',
    )
    return { status: 'undo-conflict', audit }
  }

  try {
    let todo: Todo | null = null
    if (token.compensation === 'remove-created') {
      if (current) await dependencies.todo.remove(token.todoId)
    } else {
      todo = await dependencies.todo.update(
        token.todoId,
        compensationPatch(token.before, token.expectedAfter),
      )
    }
    const undoneAt = dependencies.now()
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'undone',
      undoneAt,
      null,
      { undoneAt },
    )
    return { status: 'undone', todo, audit }
  } catch {
    audit = await recordStatus(
      dependencies.audit,
      audit,
      'undo-failed',
      dependencies.now(),
      'todo-compensation-failed',
    )
    return { status: 'undo-failed', audit }
  }
}
