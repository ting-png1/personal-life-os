import type { TodoActionPermission, TodoActionProposal } from '../action/types.ts'
import type { ContinuityCandidate } from '../continuity/candidateTypes.ts'
import type {
  ContextAssemblyScope,
  ContextPermission,
  IntelligenceResponse,
  ProviderNeutralIntelligenceRequest,
} from '../intelligence/types.ts'

export interface DeterministicAutomationSettings {
  /** Missing rule means the user has not enabled it. */
  todoOccurrenceReminder: {
    localTime: string
  } | null
  scheduleUpcomingReminder: {
    leadMinutes: number
  } | null
}

export interface DeterministicAutomationInput {
  window: {
    startAt: string
    endAt: string
  }
  settings: DeterministicAutomationSettings
}

export type DeterministicTrigger =
  | {
      id: string
      kind: 'todo-occurrence-reminder'
      triggerAt: string
      fact: {
        domain: 'todo'
        id: string
        occurrenceDate: string
        sourceUpdatedAt: string
      }
    }
  | {
      id: string
      kind: 'schedule-upcoming-reminder'
      triggerAt: string
      fact: {
        domain: 'schedule'
        id: string
        occurrenceDate: string
        sourceUpdatedAt: string
      }
    }

export type ProactiveCapabilityId = 'daily-review'
export type ProactiveOutputKind =
  | 'suggestion'
  | 'continuity-candidate'
  | 'todo-action-proposal'

export interface ProactiveDailyReviewGrant {
  capability: 'daily-review'
  enabled: true
  purpose: string
  contextScope: ContextAssemblyScope
  contextPermission: ContextPermission
  allowedOutputs: ProactiveOutputKind[]
  todoProposalPermission: TodoActionPermission
  trigger: {
    localTime: string
  }
  quietHours: {
    start: string
    end: string
  }
  minimumIntervalMinutes: number
  budget: {
    maxCallsPerLocalDay: number
    maxContextCharacters: number
    maxOutputTokensPerCall: number
    maxGovernedOutputsPerRun: number
  }
}

export interface AutomationGovernanceSettings {
  schemaVersion: '1'
  deterministic: DeterministicAutomationSettings
  proactive: {
    dailyReview: ProactiveDailyReviewGrant | null
  }
}

export const DEFAULT_AUTOMATION_GOVERNANCE: AutomationGovernanceSettings = {
  schemaVersion: '1',
  deterministic: {
    todoOccurrenceReminder: null,
    scheduleUpcomingReminder: null,
  },
  proactive: {
    dailyReview: null,
  },
}

export interface ProactiveTrigger {
  id: string
  capability: 'daily-review'
  kind: 'scheduled-review'
  localDate: string
  occurredAt: string
}

export interface ProactiveUsageSnapshot {
  capability: ProactiveCapabilityId
  localDate: string
  attemptCount: number
  lastAttemptAt: string | null
}

export type ProactiveReservationResult =
  | {
      allowed: true
      usage: ProactiveUsageSnapshot
    }
  | {
      allowed: false
      reason: 'frequency-limit' | 'daily-call-budget'
      usage: ProactiveUsageSnapshot
    }

export interface ProactiveUsageLedger {
  reserve(input: {
    capability: ProactiveCapabilityId
    localDate: string
    attemptedAt: string
    minimumIntervalMinutes: number
    maxCallsPerLocalDay: number
  }): Promise<ProactiveReservationResult>
}

export interface ProactiveIntelligenceRequest
  extends ProviderNeutralIntelligenceRequest {
  trigger: 'proactive'
  proactive: {
    capability: ProactiveCapabilityId
    triggerId: string
    purpose: string
    allowedOutputs: ProactiveOutputKind[]
  }
}

export type ProactiveGovernedOutput =
  | {
      kind: 'suggestion'
      requestId: string
      title: string
      body: string
    }
  | {
      kind: 'continuity-candidate'
      candidate: ContinuityCandidate
    }
  | {
      kind: 'todo-action-proposal'
      proposal: TodoActionProposal
    }

export interface ProactiveOutputRejection {
  index: number
  code:
    | 'invalid-output'
    | 'output-not-authorized'
    | 'candidate-rejected'
    | 'proposal-rejected'
    | 'output-limit'
}

export type ProactiveAutomationResult =
  | {
      status: 'skipped'
      reason:
        | 'not-opted-in'
        | 'invalid-governance'
        | 'quiet-hours'
        | 'invalid-trigger'
        | 'context-not-ready'
        | 'context-cost-budget'
        | 'frequency-limit'
        | 'daily-call-budget'
    }
  | {
      status: 'degraded'
      reason:
        | 'context-unavailable'
        | 'governance-state-unavailable'
        | 'provider-unavailable'
    }
  | {
      status: 'completed'
      request: ProactiveIntelligenceRequest
      response: IntelligenceResponse
      outputs: ProactiveGovernedOutput[]
      rejectedOutputs: ProactiveOutputRejection[]
    }
