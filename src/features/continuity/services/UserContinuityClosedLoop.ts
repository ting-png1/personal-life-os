import type {
  ProviderNeutralIntelligenceRequest,
  StructuredIntelligenceResult,
} from '../../intelligence/types.ts'
import type {
  ContinuityCandidate,
  ContinuityCandidateConfirmation,
  ContinuityCandidateConfirmationResult,
  ContinuityCandidateRejectionCode,
} from '../candidateTypes.ts'
import {
  confirmContinuityCandidate,
  type ConfirmContinuityCandidateDependencies,
  validateContinuityCandidateDraft,
} from './ContinuityCandidate.ts'

export interface RejectedContinuityCandidateDraft {
  index: number
  code: ContinuityCandidateRejectionCode | 'output-limit'
}

export interface PreparedContinuityCandidateSet {
  candidates: ContinuityCandidate[]
  rejected: RejectedContinuityCandidateDraft[]
}

const MAX_USER_CONTINUITY_CANDIDATES = 3

/** Converts bounded untrusted model drafts into host-validated Candidates. */
export function prepareUserContinuityCandidates(input: {
  result: StructuredIntelligenceResult
  request: ProviderNeutralIntelligenceRequest
  proposedAt: string
  generateCandidateId: () => string
}): PreparedContinuityCandidateSet {
  const candidates: ContinuityCandidate[] = []
  const rejected: RejectedContinuityCandidateDraft[] = []

  for (const [index, output] of (
    input.result.continuityCandidateDrafts ?? []
  ).entries()) {
    if (index >= MAX_USER_CONTINUITY_CANDIDATES) {
      rejected.push({ index, code: 'output-limit' })
      continue
    }
    const validation = validateContinuityCandidateDraft(output.draft, {
      candidateId: input.generateCandidateId(),
      proposedAt: input.proposedAt,
      request: input.request,
    })
    if (validation.status === 'rejected') {
      rejected.push({ index, code: validation.code })
    } else {
      candidates.push(validation.candidate)
    }
  }

  return { candidates, rejected }
}

/** The existing manual confirmation path remains the only persistence path. */
export function confirmPreparedUserContinuityCandidate(input: {
  candidate: ContinuityCandidate
  request: ProviderNeutralIntelligenceRequest
  confirmation: ContinuityCandidateConfirmation | null
  dependencies: ConfirmContinuityCandidateDependencies
}): Promise<ContinuityCandidateConfirmationResult> {
  return confirmContinuityCandidate(
    input.candidate,
    input.request,
    input.confirmation,
    input.dependencies,
  )
}
