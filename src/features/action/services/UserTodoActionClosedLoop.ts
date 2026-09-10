import type {
  ProviderNeutralIntelligenceRequest,
  StructuredIntelligenceResult,
} from '../../intelligence/types.ts'
import type {
  ActionConfirmation,
  TodoActionExecutionResult,
  TodoActionPermission,
  TodoActionProposal,
  TodoActionUndoResult,
  TodoActionUndoToken,
} from '../types.ts'
import {
  executeTodoAction,
  type TodoActionExecutorDependencies,
  undoTodoAction,
} from './TodoActionExecutor.ts'
import { buildTodoActionProposal } from './TodoActionProposal.ts'

export interface RejectedTodoActionDraft {
  index: number
  code: 'invalid-draft' | 'not-authorized' | 'output-limit'
}

export interface PreparedTodoActionSet {
  proposals: TodoActionProposal[]
  rejected: RejectedTodoActionDraft[]
}

const MAX_USER_TODO_ACTION_DRAFTS = 3

function isAllowed(
  proposal: TodoActionProposal,
  permission: TodoActionPermission,
): boolean {
  if (!permission.allowedActions.includes(proposal.action)) return false
  return proposal.action === 'todo.create' ||
    permission.allowedTodoIds.includes(proposal.payload.todoId)
}

/** Converts untrusted model drafts into bounded, host-owned Todo proposals. */
export function prepareUserTodoActions(input: {
  result: StructuredIntelligenceResult
  request: ProviderNeutralIntelligenceRequest
  permission: TodoActionPermission
  proposedAt: string
  generateProposalId: () => string
}): PreparedTodoActionSet {
  const proposals: TodoActionProposal[] = []
  const rejected: RejectedTodoActionDraft[] = []

  for (const [index, output] of (input.result.todoActionDrafts ?? []).entries()) {
    if (index >= MAX_USER_TODO_ACTION_DRAFTS) {
      rejected.push({ index, code: 'output-limit' })
      continue
    }
    try {
      const proposal = buildTodoActionProposal(output.draft, {
        proposalId: input.generateProposalId(),
        intelligenceRequestId: input.request.requestId,
        proposedAt: input.proposedAt,
        trigger: 'user',
      })
      if (!isAllowed(proposal, input.permission)) {
        rejected.push({ index, code: 'not-authorized' })
      } else {
        proposals.push(proposal)
      }
    } catch {
      rejected.push({ index, code: 'invalid-draft' })
    }
  }

  return { proposals, rejected }
}

/** Execution remains entirely owned by the established Todo Action boundary. */
export function executePreparedUserTodoAction(input: {
  proposal: TodoActionProposal
  permission: TodoActionPermission
  confirmation: ActionConfirmation | null
  dependencies: TodoActionExecutorDependencies
}): Promise<TodoActionExecutionResult> {
  return executeTodoAction(
    input.proposal,
    input.permission,
    input.confirmation,
    input.dependencies,
  )
}

export function undoExecutedUserTodoAction(input: {
  token: TodoActionUndoToken
  permission: TodoActionPermission
  dependencies: Omit<TodoActionExecutorDependencies, 'generateExecutionId'>
}): Promise<TodoActionUndoResult> {
  return undoTodoAction(input.token, input.permission, input.dependencies)
}
