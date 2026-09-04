import {
  formatLocalDate,
  parseLocalDate,
} from '../../../shared/lib/date.ts'
import { getCanonicalTodoScheduleFields } from '../../todo/services/todoServices.ts'
import type { CreateTodoInput } from '../../todo/types.ts'
import type {
  BuildTodoActionProposalMetadata,
  TodoActionKind,
  TodoActionProposal,
  TodoEditablePatch,
} from '../types.ts'
import { TODO_RECURRENCES } from '../types.ts'

type UnknownRecord = Record<string, unknown>

const TODO_ACTIONS: readonly TodoActionKind[] = [
  'todo.create',
  'todo.update',
  'todo.set-completion',
]

const EDITABLE_FIELDS = [
  'title',
  'description',
  'dueDate',
  'recurrenceStartDate',
  'recurrenceEndDate',
  'priority',
  'category',
  'recurrence',
] as const

function record(value: unknown, field: string): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`)
  }
  return value as UnknownRecord
}

function allowOnlyKeys(
  value: UnknownRecord,
  allowed: readonly string[],
  field: string,
): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key))
  if (extra) throw new Error(`${field} contains unsupported field: ${extra}`)
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value.trim()
}

function optionalText(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') throw new Error(`${field} must be a string or null`)
  const normalized = value.trim()
  return normalized.length === 0 ? null : normalized
}

function dateOnly(value: unknown, field: string): string | null | undefined {
  const normalized = optionalText(value, field)
  if (normalized === null || normalized === undefined) return normalized

  try {
    if (formatLocalDate(parseLocalDate(normalized)) !== normalized) {
      throw new Error('date does not round-trip')
    }
  } catch {
    throw new Error(`${field} must be a valid local date in YYYY-MM-DD format`)
  }
  return normalized
}

function priority(value: unknown, field: string): 1 | 2 | 3 | undefined {
  if (value === undefined) return undefined
  if (value !== 1 && value !== 2 && value !== 3) {
    throw new Error(`${field} must be 1, 2, or 3`)
  }
  return value
}

function recurrence(value: unknown, field: string): 'none' | 'daily' | 'weekly' | undefined {
  if (value === undefined) return undefined
  if (
    typeof value !== 'string' ||
    !TODO_RECURRENCES.includes(value as (typeof TODO_RECURRENCES)[number])
  ) {
    throw new Error(`${field} must be none, daily, or weekly`)
  }
  return value as 'none' | 'daily' | 'weekly'
}

function createPayload(value: unknown): CreateTodoInput {
  const payload = record(value, 'payload')
  allowOnlyKeys(payload, EDITABLE_FIELDS, 'payload')
  const todoRecurrence = recurrence(payload.recurrence, 'payload.recurrence') ?? 'none'
  const schedule = getCanonicalTodoScheduleFields(
    todoRecurrence,
    dateOnly(payload.dueDate, 'payload.dueDate'),
    dateOnly(payload.recurrenceStartDate, 'payload.recurrenceStartDate'),
    dateOnly(payload.recurrenceEndDate, 'payload.recurrenceEndDate'),
  )

  return {
    title: requiredText(payload.title, 'payload.title'),
    description: optionalText(payload.description, 'payload.description'),
    ...schedule,
    priority: priority(payload.priority, 'payload.priority'),
    category: optionalText(payload.category, 'payload.category'),
    recurrence: todoRecurrence,
  }
}

function updatePatch(value: unknown): TodoEditablePatch {
  const patch = record(value, 'payload.patch')
  allowOnlyKeys(patch, EDITABLE_FIELDS, 'payload.patch')
  if (Object.keys(patch).length === 0) {
    throw new Error('payload.patch must contain at least one editable field')
  }

  const normalized: TodoEditablePatch = {}
  if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
    normalized.title = requiredText(patch.title, 'payload.patch.title')
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'description')) {
    normalized.description = optionalText(
      patch.description,
      'payload.patch.description',
    ) ?? null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'dueDate')) {
    normalized.dueDate = dateOnly(patch.dueDate, 'payload.patch.dueDate') ?? null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'recurrenceStartDate')) {
    normalized.recurrenceStartDate =
      dateOnly(
        patch.recurrenceStartDate,
        'payload.patch.recurrenceStartDate',
      ) ?? null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'recurrenceEndDate')) {
    normalized.recurrenceEndDate =
      dateOnly(patch.recurrenceEndDate, 'payload.patch.recurrenceEndDate') ?? null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'priority')) {
    const normalizedPriority = priority(patch.priority, 'payload.patch.priority')
    if (normalizedPriority === undefined) {
      throw new Error('payload.patch.priority must be 1, 2, or 3')
    }
    normalized.priority = normalizedPriority
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'category')) {
    normalized.category = optionalText(patch.category, 'payload.patch.category') ?? null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'recurrence')) {
    const normalizedRecurrence = recurrence(
      patch.recurrence,
      'payload.patch.recurrence',
    )
    if (normalizedRecurrence === undefined) {
      throw new Error('payload.patch.recurrence must be none, daily, or weekly')
    }
    normalized.recurrence = normalizedRecurrence
  }
  return normalized
}

function assertTimestamp(value: string, field: string): void {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${field} must be a valid timestamp`)
  }
}

/** Converts an untrusted intelligence draft into a host-owned, governed proposal. */
export function buildTodoActionProposal(
  draftValue: unknown,
  metadata: BuildTodoActionProposalMetadata,
): TodoActionProposal {
  const draft = record(draftValue, 'draft')
  allowOnlyKeys(draft, ['action', 'reason', 'payload'], 'draft')
  const action = requiredText(draft.action, 'draft.action')
  if (!TODO_ACTIONS.includes(action as TodoActionKind)) {
    throw new Error(`Unsupported Todo action: ${action}`)
  }

  const proposalId = requiredText(metadata.proposalId, 'proposalId')
  const intelligenceRequestId = requiredText(
    metadata.intelligenceRequestId,
    'intelligenceRequestId',
  )
  assertTimestamp(metadata.proposedAt, 'proposedAt')
  const trigger = metadata.trigger ?? 'user'
  if (trigger !== 'user' && trigger !== 'proactive') {
    throw new Error('trigger must be user or proactive')
  }
  const shared = {
    schemaVersion: '1' as const,
    proposalId,
    intelligenceRequestId,
    proposedAt: metadata.proposedAt,
    trigger,
    actionClass: 'data' as const,
    domain: 'todo' as const,
    reason: requiredText(draft.reason, 'draft.reason'),
  }

  if (action === 'todo.create') {
    return {
      ...shared,
      action,
      risk: 'medium',
      confirmationRequired: true,
      payload: createPayload(draft.payload),
    }
  }

  const payload = record(draft.payload, 'payload')
  if (action === 'todo.update') {
    allowOnlyKeys(payload, ['todoId', 'patch'], 'payload')
    return {
      ...shared,
      action,
      risk: 'medium',
      confirmationRequired: true,
      payload: {
        todoId: requiredText(payload.todoId, 'payload.todoId'),
        patch: updatePatch(payload.patch),
      },
    }
  }

  allowOnlyKeys(payload, ['todoId', 'date', 'completed'], 'payload')
  if (typeof payload.completed !== 'boolean') {
    throw new Error('payload.completed must be a boolean')
  }
  const targetDate = dateOnly(payload.date, 'payload.date')
  if (!targetDate) {
    throw new Error('payload.date is required')
  }
  return {
    ...shared,
    action: 'todo.set-completion',
    risk: 'low',
    confirmationRequired: trigger === 'proactive',
    payload: {
      todoId: requiredText(payload.todoId, 'payload.todoId'),
      date: targetDate,
      completed: payload.completed,
    },
  }
}
