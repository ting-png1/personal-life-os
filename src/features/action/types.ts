import type { CreateTodoInput, Todo, TodoRecurrence, UpdateTodoInput } from '../todo/types.ts'
import type { IntelligenceTrigger } from '../intelligence/types.ts'

export type ActionClass = 'data' | 'expression'
export type TodoActionKind = 'todo.create' | 'todo.update' | 'todo.set-completion'
export type ActionRisk = 'low' | 'medium'

export type TodoEditablePatch = Partial<
  Pick<
    Todo,
    | 'title'
    | 'description'
    | 'dueDate'
    | 'recurrenceStartDate'
    | 'recurrenceEndDate'
    | 'priority'
    | 'category'
    | 'recurrence'
  >
>

interface TodoActionProposalBase {
  schemaVersion: '1'
  proposalId: string
  intelligenceRequestId: string
  proposedAt: string
  trigger: IntelligenceTrigger
  actionClass: 'data'
  domain: 'todo'
  reason: string
  risk: ActionRisk
  confirmationRequired: boolean
}

export interface CreateTodoActionProposal extends TodoActionProposalBase {
  action: 'todo.create'
  risk: 'medium'
  confirmationRequired: true
  payload: CreateTodoInput
}

export interface UpdateTodoActionProposal extends TodoActionProposalBase {
  action: 'todo.update'
  risk: 'medium'
  confirmationRequired: true
  payload: {
    todoId: string
    patch: TodoEditablePatch
  }
}

export interface SetTodoCompletionActionProposal extends TodoActionProposalBase {
  action: 'todo.set-completion'
  risk: 'low'
  confirmationRequired: boolean
  payload: {
    todoId: string
    date: string
    completed: boolean
  }
}

export type TodoActionProposal =
  | CreateTodoActionProposal
  | UpdateTodoActionProposal
  | SetTodoCompletionActionProposal

export interface BuildTodoActionProposalMetadata {
  proposalId: string
  intelligenceRequestId: string
  proposedAt: string
  trigger?: IntelligenceTrigger
}

export interface TodoActionPermission {
  allowedActions: TodoActionKind[]
  /** Exact allow-list for actions targeting existing Todos; no wildcard in v0. */
  allowedTodoIds: string[]
}

export interface ActionConfirmation {
  proposalId: string
  confirmedAt: string
}

export type ActionAuditEventType =
  | 'started'
  | 'permission-denied'
  | 'confirmation-required'
  | 'validation-failed'
  | 'executed'
  | 'execution-failed'
  | 'undo-started'
  | 'undone'
  | 'undo-conflict'
  | 'undo-failed'

export interface ActionAuditEvent {
  type: ActionAuditEventType
  at: string
  code: string | null
}

export interface ActionAuditRecord {
  executionId: string
  proposalId: string
  intelligenceRequestId: string
  actionClass: 'data'
  domain: 'todo'
  action: TodoActionKind
  risk: ActionRisk
  status: ActionAuditEventType
  targetTodoId: string | null
  confirmationRequired: boolean
  confirmedAt: string | null
  executedAt: string | null
  undoneAt: string | null
  events: ActionAuditEvent[]
  createdAt: string
  updatedAt: string
}

export interface ActionAuditUpdate {
  status: ActionAuditEventType
  targetTodoId?: string | null
  confirmedAt?: string | null
  executedAt?: string | null
  undoneAt?: string | null
}

export interface IActionAuditRepository {
  create(record: ActionAuditRecord): Promise<ActionAuditRecord>
  appendEvent(
    executionId: string,
    event: ActionAuditEvent,
    update: ActionAuditUpdate,
  ): Promise<ActionAuditRecord>
  getByExecutionId(executionId: string): Promise<ActionAuditRecord | undefined>
  getByProposalId(proposalId: string): Promise<ActionAuditRecord[]>
}

export interface TodoActionPort {
  getById(id: string): Promise<Todo | undefined>
  create(input: CreateTodoInput): Promise<Todo>
  update(id: string, patch: UpdateTodoInput): Promise<Todo>
  remove(id: string): Promise<void>
}

interface TodoUndoTokenBase {
  executionId: string
  proposalId: string
  action: TodoActionKind
  todoId: string
}

export type TodoActionUndoToken =
  | (TodoUndoTokenBase & {
      compensation: 'remove-created'
      expectedAfter: Todo
    })
  | (TodoUndoTokenBase & {
      compensation: 'restore-todo'
      before: Todo
      expectedAfter: Todo
    })

export type TodoActionExecutionResult =
  | {
      status: 'permission-denied' | 'confirmation-required' | 'validation-failed'
      audit: ActionAuditRecord
    }
  | {
      status: 'execution-failed'
      audit: ActionAuditRecord
    }
  | {
      status: 'executed'
      todo: Todo
      audit: ActionAuditRecord
      undoToken: TodoActionUndoToken
    }

export type TodoActionUndoResult =
  | {
      status: 'undone'
      todo: Todo | null
      audit: ActionAuditRecord
    }
  | {
      status: 'undo-conflict' | 'undo-failed'
      audit: ActionAuditRecord
    }

export const TODO_RECURRENCES: readonly TodoRecurrence[] = [
  'none',
  'daily',
  'weekly',
]
