import { formatTime, toDateStr } from '../../../shared/lib/date.ts'
import { buildTodoActionProposal } from '../../action/services/TodoActionProposal.ts'
import type {
  TodoActionPermission,
  TodoActionProposal,
} from '../../action/types.ts'
import { validateContinuityCandidateDraft } from '../../continuity/services/ContinuityCandidate.ts'
import { assembleLifeOSContext } from '../../intelligence/services/ContextAssembler.ts'
import { sendToIntelligenceProvider } from '../../intelligence/services/IntelligenceBridge.ts'
import type {
  ContextReaders,
  IntelligenceProvider,
} from '../../intelligence/types.ts'
import type {
  AutomationGovernanceSettings,
  ProactiveAutomationResult,
  ProactiveDailyReviewGrant,
  ProactiveGovernedOutput,
  ProactiveIntelligenceRequest,
  ProactiveOutputKind,
  ProactiveOutputRejection,
  ProactiveTrigger,
  ProactiveUsageLedger,
} from '../types.ts'
import { automationGovernanceIsValid } from './AutomationGovernance.ts'
import { proactiveTriggerId } from './ProactiveTriggerPlanner.ts'

type UnknownRecord = Record<string, unknown>

const OUTPUT_KINDS: readonly ProactiveOutputKind[] = [
  'suggestion',
  'continuity-candidate',
  'todo-action-proposal',
]

export interface RunProactiveAutomationInput {
  trigger: ProactiveTrigger
  settings: AutomationGovernanceSettings
  readers: ContextReaders
  provider: IntelligenceProvider
  usage: ProactiveUsageLedger
  now: () => string
  generateId: () => string
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function isQuietTime(now: string, grant: ProactiveDailyReviewGrant): boolean {
  const date = new Date(now)
  const localTime = `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
  const { start, end } = grant.quietHours
  return start < end
    ? localTime >= start && localTime < end
    : localTime >= start || localTime < end
}

function hasReadyContext(context: ProactiveIntelligenceRequest['context']): boolean {
  return Boolean(
    context.sections.currentLifeState?.readiness === 'ready' ||
      context.sections.timeline?.readiness === 'ready' ||
      context.sections.personalBaseline?.readiness === 'ready' ||
      context.sections.lifeContinuity?.readiness === 'ready' ||
      context.sections.relationshipContinuity?.some(
        (section) => section.readiness === 'ready',
      ) ||
      context.sections.conversation?.readiness === 'ready',
  )
}

function proposalIsAllowed(
  proposal: TodoActionProposal,
  permission: TodoActionPermission,
): boolean {
  if (!permission.allowedActions.includes(proposal.action)) return false
  if (proposal.action === 'todo.create') return true
  return permission.allowedTodoIds.includes(proposal.payload.todoId)
}

function buildSuggestion(
  raw: UnknownRecord,
  requestId: string,
): ProactiveGovernedOutput | null {
  if (!hasOnlyKeys(raw, ['kind', 'title', 'body'])) return null
  const title = text(raw.title)
  const body = text(raw.body)
  return title && body
    ? { kind: 'suggestion', requestId, title, body }
    : null
}

function governOutputs(
  rawOutputs: unknown[],
  request: ProactiveIntelligenceRequest,
  grant: ProactiveDailyReviewGrant,
  generateId: () => string,
): { outputs: ProactiveGovernedOutput[]; rejected: ProactiveOutputRejection[] } {
  const outputs: ProactiveGovernedOutput[] = []
  const rejected: ProactiveOutputRejection[] = []

  rawOutputs.forEach((rawValue, index) => {
    if (index >= grant.budget.maxGovernedOutputsPerRun) {
      rejected.push({ index, code: 'output-limit' })
      return
    }
    if (!isRecord(rawValue) || typeof rawValue.kind !== 'string') {
      rejected.push({ index, code: 'invalid-output' })
      return
    }
    const kind = rawValue.kind as ProactiveOutputKind
    if (!OUTPUT_KINDS.includes(kind)) {
      rejected.push({ index, code: 'invalid-output' })
      return
    }
    if (!grant.allowedOutputs.includes(kind)) {
      rejected.push({ index, code: 'output-not-authorized' })
      return
    }

    if (kind === 'suggestion') {
      const suggestion = buildSuggestion(rawValue, request.requestId)
      if (!suggestion) {
        rejected.push({ index, code: 'invalid-output' })
      } else {
        outputs.push(suggestion)
      }
      return
    }

    if (!hasOnlyKeys(rawValue, ['kind', 'draft'])) {
      rejected.push({ index, code: 'invalid-output' })
      return
    }
    if (kind === 'continuity-candidate') {
      const candidate = validateContinuityCandidateDraft(rawValue.draft, {
        candidateId: generateId(),
        proposedAt: request.requestedAt,
        request,
      })
      if (candidate.status === 'rejected') {
        rejected.push({ index, code: 'candidate-rejected' })
      } else {
        outputs.push({ kind, candidate: candidate.candidate })
      }
      return
    }

    try {
      const proposal = buildTodoActionProposal(rawValue.draft, {
        proposalId: generateId(),
        intelligenceRequestId: request.requestId,
        proposedAt: request.requestedAt,
        trigger: 'proactive',
      })
      if (!proposalIsAllowed(proposal, grant.todoProposalPermission)) {
        rejected.push({ index, code: 'output-not-authorized' })
      } else {
        outputs.push({ kind, proposal })
      }
    } catch {
      rejected.push({ index, code: 'proposal-rejected' })
    }
  })

  return { outputs, rejected }
}

/** Runs one host-triggered proactive review; it never executes or persists outputs. */
export async function runProactiveAutomation(
  input: RunProactiveAutomationInput,
): Promise<ProactiveAutomationResult> {
  if (!automationGovernanceIsValid(input.settings)) {
    return { status: 'skipped', reason: 'invalid-governance' }
  }
  const grant = input.settings.proactive.dailyReview
  if (!grant) return { status: 'skipped', reason: 'not-opted-in' }

  const now = input.now()
  if (
    input.trigger.capability !== 'daily-review' ||
    input.trigger.kind !== 'scheduled-review' ||
    !text(input.trigger.id) ||
    !Number.isFinite(Date.parse(input.trigger.occurredAt)) ||
    !Number.isFinite(Date.parse(now)) ||
    Date.parse(input.trigger.occurredAt) > Date.parse(now) ||
    toDateStr(input.trigger.occurredAt) !== input.trigger.localDate ||
    formatTime(input.trigger.occurredAt) !== grant.trigger.localTime ||
    input.trigger.id !==
      proactiveTriggerId(input.trigger.localDate, grant.trigger.localTime)
  ) {
    return { status: 'skipped', reason: 'invalid-trigger' }
  }
  if (isQuietTime(now, grant)) {
    return { status: 'skipped', reason: 'quiet-hours' }
  }

  let context: ProactiveIntelligenceRequest['context']
  try {
    context = await assembleLifeOSContext({
      scope: grant.contextScope,
      permission: grant.contextPermission,
      readers: input.readers,
      assembledAt: now,
    })
  } catch {
    return { status: 'degraded', reason: 'context-unavailable' }
  }
  if (!hasReadyContext(context)) {
    return { status: 'skipped', reason: 'context-not-ready' }
  }
  let contextCharacters: number
  try {
    contextCharacters = JSON.stringify(context).length
  } catch {
    return { status: 'degraded', reason: 'context-unavailable' }
  }
  if (contextCharacters > grant.budget.maxContextCharacters) {
    return { status: 'skipped', reason: 'context-cost-budget' }
  }

  let reservation
  try {
    reservation = await input.usage.reserve({
      capability: grant.capability,
      localDate: toDateStr(now),
      attemptedAt: now,
      minimumIntervalMinutes: grant.minimumIntervalMinutes,
      maxCallsPerLocalDay: grant.budget.maxCallsPerLocalDay,
    })
  } catch {
    return { status: 'degraded', reason: 'governance-state-unavailable' }
  }
  if (!reservation.allowed) {
    return { status: 'skipped', reason: reservation.reason }
  }

  const request: ProactiveIntelligenceRequest = {
    schemaVersion: '1',
    requestId: input.generateId(),
    requestedAt: now,
    trigger: 'proactive',
    instruction: `Purpose: ${grant.purpose.trim()}. Return only the authorized governed output kinds. Do not execute actions or write facts.`,
    context,
    limits: { maxOutputTokens: grant.budget.maxOutputTokensPerCall },
    proactive: {
      capability: grant.capability,
      triggerId: input.trigger.id,
      purpose: grant.purpose.trim(),
      allowedOutputs: [...grant.allowedOutputs],
    },
  }

  let response
  try {
    response = await sendToIntelligenceProvider(input.provider, request, input.now)
  } catch {
    return { status: 'degraded', reason: 'provider-unavailable' }
  }
  const governed = governOutputs(
    response.structuredOutputs ?? [],
    request,
    grant,
    input.generateId,
  )
  return {
    status: 'completed',
    request,
    response,
    outputs: governed.outputs,
    rejectedOutputs: governed.rejected,
  }
}
