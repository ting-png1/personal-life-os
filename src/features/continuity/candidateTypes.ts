import type { ContextDomain } from '../intelligence/types.ts'
import type { ContinuityItem } from './types.ts'

type NonRelationshipContextDomain = Exclude<
  ContextDomain,
  'relationship-continuity'
>

export type ContinuityCandidateSource =
  | {
      domain: NonRelationshipContextDomain
    }
  | {
      domain: 'relationship-continuity'
      relationshipId: string
    }

interface ContinuityCandidateBase {
  schemaVersion: '1'
  candidateId: string
  intelligenceRequestId: string
  proposedAt: string
  trigger: 'user'
  status: 'awaiting-confirmation'
  content: string
  sources: [ContinuityCandidateSource, ...ContinuityCandidateSource[]]
}

export type ContinuityCandidate =
  | (ContinuityCandidateBase & {
      continuityType: 'life'
      relationshipId: null
    })
  | (ContinuityCandidateBase & {
      continuityType: 'relationship'
      relationshipId: string
    })

export type ContinuityCandidateRejectionCode =
  | 'invalid-input'
  | 'invalid-context'
  | 'source-not-authorized'
  | 'source-not-ready'
  | 'continuity-boundary-violation'

export type ContinuityCandidateValidationResult =
  | {
      status: 'awaiting-confirmation'
      candidate: ContinuityCandidate
    }
  | {
      status: 'rejected'
      candidate: null
      code: ContinuityCandidateRejectionCode
    }

export interface ContinuityCandidateConfirmation {
  candidateId: string
  decision: 'confirm'
  confirmedAt: string
}

type WithConfirmedState<Candidate extends ContinuityCandidate> =
  Candidate extends ContinuityCandidate
    ? Omit<Candidate, 'status'> & {
        status: 'confirmed'
        confirmedAt: string
        continuityItemId: string
      }
    : never

export type ConfirmedContinuityCandidate =
  WithConfirmedState<ContinuityCandidate>

export type ContinuityCandidateConfirmationResult =
  | {
      status: 'confirmation-required'
      candidate: ContinuityCandidate
    }
  | {
      status: 'validation-failed'
      candidate: ContinuityCandidate
      code: ContinuityCandidateRejectionCode | 'invalid-confirmation'
    }
  | {
      status: 'persistence-failed'
      candidate: ContinuityCandidate
    }
  | {
      status: 'confirmed'
      candidate: ConfirmedContinuityCandidate
      continuity: ContinuityItem
    }
