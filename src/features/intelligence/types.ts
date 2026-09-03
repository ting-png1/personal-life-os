import type { PersonalBaseline } from '../baseline/types.ts'
import type {
  LifeContinuityItem,
  RelationshipContinuityItem,
} from '../continuity/types.ts'
import type { LifeState } from '../life-state/types.ts'
import type { LifeTimeline } from '../timeline/types.ts'

export type ContextDomain =
  | 'current-life-state'
  | 'timeline'
  | 'personal-baseline'
  | 'life-continuity'
  | 'relationship-continuity'
  | 'conversation'

export interface ContextAssemblyScope {
  currentLifeState?: true
  timeline?: {
    startDate: string
    endDate: string
  }
  personalBaseline?: {
    anchorDate: string
  }
  lifeContinuity?: true
  relationshipContinuity?: {
    relationshipIds: string[]
  }
  conversation?: true
}

/** Relationship access is deny-by-default and has no wildcard in v0. */
export interface ContextPermission {
  allowedDomains: ContextDomain[]
  allowedRelationshipIds: string[]
}

export type ContextReadResult<T> =
  | {
      readiness: 'not-ready'
      value: null
      sourceUpdatedAt: null
    }
  | {
      readiness: 'ready'
      value: T
      sourceUpdatedAt: string | null
    }

export interface ConversationTurn {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string | null
}

export interface CurrentConversationContext {
  conversationId: string | null
  turns: ConversationTurn[]
}

export interface ContextReaders {
  readCurrentLifeState?: () => Promise<ContextReadResult<LifeState>>
  readTimeline?: (range: {
    startDate: string
    endDate: string
  }) => Promise<ContextReadResult<LifeTimeline>>
  readPersonalBaseline?: (
    anchorDate: string,
  ) => Promise<ContextReadResult<PersonalBaseline>>
  readActiveLifeContinuity?: () => Promise<
    ContextReadResult<LifeContinuityItem[]>
  >
  readActiveRelationshipContinuity?: (
    relationshipId: string,
  ) => Promise<ContextReadResult<RelationshipContinuityItem[]>>
  readConversation?: () => Promise<ContextReadResult<CurrentConversationContext>>
}

export interface ContextProvenance {
  path: string
  classification: 'fact' | 'derived-state' | 'continuity' | 'conversation'
  source: string
}

export interface ContextDateRange {
  startDate: string
  endDate: string
}

interface ContextSectionMetadata {
  provenance: ContextProvenance[]
  temporal: {
    assembledAt: string
    sourceUpdatedAt: string | null
    dateRange: ContextDateRange | null
  }
}

export type AssembledContextSection<T> = ContextSectionMetadata &
  (
    | {
        readiness: 'not-ready'
        value: null
      }
    | {
        readiness: 'ready'
        value: T
      }
  )

export type RelationshipContinuityContextSection =
  AssembledContextSection<RelationshipContinuityItem[]> & {
    relationshipId: string
  }

export interface ContextScopeReference {
  domain: ContextDomain
  relationshipId?: string
}

export interface ContextOmission {
  domain: ContextDomain
  reason: 'not-authorized' | 'reader-unavailable'
}

export interface AssembledLifeOSContext {
  schemaVersion: '1'
  assembledAt: string
  manifest: {
    requested: ContextDomain[]
    included: ContextScopeReference[]
    omitted: ContextOmission[]
  }
  sections: {
    currentLifeState?: AssembledContextSection<LifeState>
    timeline?: AssembledContextSection<LifeTimeline>
    personalBaseline?: AssembledContextSection<PersonalBaseline>
    lifeContinuity?: AssembledContextSection<LifeContinuityItem[]>
    relationshipContinuity?: RelationshipContinuityContextSection[]
    conversation?: AssembledContextSection<CurrentConversationContext>
  }
}

export interface ProviderNeutralIntelligenceRequest {
  schemaVersion: '1'
  requestId: string
  requestedAt: string
  trigger: 'user'
  instruction: string
  context: AssembledLifeOSContext
}

export interface ProviderNeutralIntelligenceResult {
  content: string
  providerRequestId: string | null
}

export interface IntelligenceProvider {
  readonly id: string
  complete(
    request: ProviderNeutralIntelligenceRequest,
  ): Promise<ProviderNeutralIntelligenceResult>
}

export interface IntelligenceResponse {
  requestId: string
  providerId: string
  providerRequestId: string | null
  content: string
  completedAt: string
}
