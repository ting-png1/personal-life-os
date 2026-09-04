import type {
  AssembledLifeOSContext,
  ContextDomain,
  ContextScopeReference,
  ProviderNeutralIntelligenceRequest,
} from '../../intelligence/types.ts'
import type { IContinuityRepository } from '../repository.ts'
import type {
  ConfirmedContinuityCandidate,
  ContinuityCandidate,
  ContinuityCandidateConfirmation,
  ContinuityCandidateConfirmationResult,
  ContinuityCandidateRejectionCode,
  ContinuityCandidateSource,
  ContinuityCandidateValidationResult,
} from '../candidateTypes.ts'
import type {
  ContinuityEvidence,
  CreateConfirmedContinuityInput,
} from '../types.ts'

type UnknownRecord = Record<string, unknown>

const CONTEXT_DOMAINS: readonly ContextDomain[] = [
  'current-life-state',
  'timeline',
  'personal-baseline',
  'life-continuity',
  'relationship-continuity',
  'conversation',
]

export interface ValidateContinuityCandidateInput {
  candidateId: string
  proposedAt: string
  request: ProviderNeutralIntelligenceRequest
}

export interface ConfirmContinuityCandidateDependencies {
  continuity: Pick<IContinuityRepository, 'createConfirmed'>
  now: () => string
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

function normalizedRequiredText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function reject(
  code: ContinuityCandidateRejectionCode,
): ContinuityCandidateValidationResult {
  return { status: 'rejected', candidate: null, code }
}

function sameScope(
  left: ContextScopeReference,
  right: ContinuityCandidateSource,
): boolean {
  return (
    left.domain === right.domain &&
    (right.domain !== 'relationship-continuity' ||
      left.relationshipId === right.relationshipId)
  )
}

function readSourceMetadata(
  context: AssembledLifeOSContext,
  source: ContinuityCandidateSource,
): { readiness: 'ready' | 'not-ready'; sourceUpdatedAt: string | null } | null {
  let section:
    | {
        readiness: 'ready' | 'not-ready'
        temporal: { sourceUpdatedAt: string | null }
      }
    | undefined
  switch (source.domain) {
    case 'current-life-state':
      section = context.sections.currentLifeState
      break
    case 'timeline':
      section = context.sections.timeline
      break
    case 'personal-baseline':
      section = context.sections.personalBaseline
      break
    case 'life-continuity':
      section = context.sections.lifeContinuity
      break
    case 'conversation':
      section = context.sections.conversation
      break
    case 'relationship-continuity':
      section = context.sections.relationshipContinuity?.find(
        (candidate) => candidate.relationshipId === source.relationshipId,
      )
      break
  }
  if (!section) return null
  return {
    readiness: section.readiness,
    sourceUpdatedAt: section.temporal.sourceUpdatedAt,
  }
}

function normalizeSource(value: unknown): ContinuityCandidateSource | null {
  if (!isRecord(value)) return null
  const domain = normalizedRequiredText(value.domain)
  if (!domain || !CONTEXT_DOMAINS.includes(domain as ContextDomain)) return null

  if (domain === 'relationship-continuity') {
    if (!hasOnlyKeys(value, ['domain', 'relationshipId'])) return null
    const relationshipId = normalizedRequiredText(value.relationshipId)
    return relationshipId
      ? { domain: 'relationship-continuity', relationshipId }
      : null
  }

  if (!hasOnlyKeys(value, ['domain'])) return null
  return { domain: domain as Exclude<ContextDomain, 'relationship-continuity'> }
}

function normalizeSources(value: unknown): ContinuityCandidateSource[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const sources = value.map(normalizeSource)
  if (sources.some((source) => source === null)) return null

  const normalized = sources as ContinuityCandidateSource[]
  const keys = normalized.map((source) =>
    source.domain === 'relationship-continuity'
      ? `${source.domain}:${source.relationshipId}`
      : source.domain,
  )
  return new Set(keys).size === keys.length ? normalized : null
}

function requestIsValid(request: ProviderNeutralIntelligenceRequest): boolean {
  return (
    request.schemaVersion === '1' &&
    request.trigger === 'user' &&
    normalizedRequiredText(request.requestId) !== null &&
    validTimestamp(request.requestedAt) &&
    request.context.schemaVersion === '1' &&
    validTimestamp(request.context.assembledAt)
  )
}

/** Converts an untrusted provider draft into a short-lived, host-governed candidate. */
export function validateContinuityCandidateDraft(
  draftValue: unknown,
  input: ValidateContinuityCandidateInput,
): ContinuityCandidateValidationResult {
  const candidateId = normalizedRequiredText(input.candidateId)
  if (!candidateId || !validTimestamp(input.proposedAt) || !requestIsValid(input.request)) {
    return reject('invalid-context')
  }
  if (Date.parse(input.proposedAt) < Date.parse(input.request.requestedAt)) {
    return reject('invalid-context')
  }
  if (!isRecord(draftValue)) return reject('invalid-input')
  if (
    !hasOnlyKeys(draftValue, [
      'continuityType',
      'relationshipId',
      'content',
      'sources',
    ])
  ) {
    return reject('invalid-input')
  }

  const continuityType = normalizedRequiredText(draftValue.continuityType)
  const content = normalizedRequiredText(draftValue.content)
  const sources = normalizeSources(draftValue.sources)
  if (
    (continuityType !== 'life' && continuityType !== 'relationship') ||
    !content ||
    !sources
  ) {
    return reject('invalid-input')
  }

  let relationshipId: string | null = null
  if (continuityType === 'life') {
    if (Object.prototype.hasOwnProperty.call(draftValue, 'relationshipId')) {
      return reject('continuity-boundary-violation')
    }
    if (sources.some((source) => source.domain === 'relationship-continuity')) {
      return reject('continuity-boundary-violation')
    }
  } else {
    relationshipId = normalizedRequiredText(draftValue.relationshipId)
    if (!relationshipId) return reject('continuity-boundary-violation')
    const relationshipAuthorized = input.request.context.manifest.included.some(
      (scope) =>
        scope.domain === 'relationship-continuity' &&
        scope.relationshipId === relationshipId,
    )
    if (!relationshipAuthorized) return reject('source-not-authorized')
    if (
      sources.some(
        (source) =>
          source.domain === 'relationship-continuity' &&
          source.relationshipId !== relationshipId,
      )
    ) {
      return reject('continuity-boundary-violation')
    }
  }

  for (const source of sources) {
    if (!input.request.context.manifest.included.some((scope) => sameScope(scope, source))) {
      return reject('source-not-authorized')
    }
    const metadata = readSourceMetadata(input.request.context, source)
    if (!metadata || metadata.readiness !== 'ready') {
      return reject('source-not-ready')
    }
    if (metadata.sourceUpdatedAt !== null && !validTimestamp(metadata.sourceUpdatedAt)) {
      return reject('invalid-context')
    }
  }

  const shared = {
    schemaVersion: '1' as const,
    candidateId,
    intelligenceRequestId: input.request.requestId,
    proposedAt: input.proposedAt,
    trigger: 'user' as const,
    status: 'awaiting-confirmation' as const,
    content,
    sources: sources as [
      ContinuityCandidateSource,
      ...ContinuityCandidateSource[],
    ],
  }
  const candidate: ContinuityCandidate =
    continuityType === 'life'
      ? { ...shared, continuityType: 'life', relationshipId: null }
      : {
          ...shared,
          continuityType: 'relationship',
          relationshipId: relationshipId!,
        }
  return { status: 'awaiting-confirmation', candidate }
}

function revalidateCandidate(
  candidate: ContinuityCandidate,
  request: ProviderNeutralIntelligenceRequest,
): ContinuityCandidateValidationResult {
  if (
    candidate.schemaVersion !== '1' ||
    candidate.trigger !== 'user' ||
    candidate.status !== 'awaiting-confirmation' ||
    candidate.intelligenceRequestId !== request.requestId
  ) {
    return reject('invalid-context')
  }

  const draft =
    candidate.continuityType === 'life'
      ? {
          continuityType: candidate.continuityType,
          content: candidate.content,
          sources: candidate.sources,
        }
      : {
          continuityType: candidate.continuityType,
          relationshipId: candidate.relationshipId,
          content: candidate.content,
          sources: candidate.sources,
        }
  return validateContinuityCandidateDraft(draft, {
    candidateId: candidate.candidateId,
    proposedAt: candidate.proposedAt,
    request,
  })
}

function evidenceReference(
  requestId: string,
  source: ContinuityCandidateSource,
): string {
  const scope =
    source.domain === 'relationship-continuity'
      ? `${source.domain}:${encodeURIComponent(source.relationshipId)}`
      : source.domain
  return `intelligence-context:${requestId}:${scope}`
}

function buildConfirmedInput(
  candidate: ContinuityCandidate,
  request: ProviderNeutralIntelligenceRequest,
): CreateConfirmedContinuityInput {
  const evidence = candidate.sources.map((source): ContinuityEvidence => {
    const metadata = readSourceMetadata(request.context, source)!
    return {
      kind: 'lifeos-record',
      reference: evidenceReference(request.requestId, source),
      note: 'User-confirmed Intelligence Continuity candidate',
      observedAt: metadata.sourceUpdatedAt,
    }
  }) as [ContinuityEvidence, ...ContinuityEvidence[]]

  return candidate.continuityType === 'life'
    ? {
        continuityType: 'life',
        content: candidate.content,
        evidence,
      }
    : {
        continuityType: 'relationship',
        relationshipId: candidate.relationshipId,
        content: candidate.content,
        evidence,
      }
}

/** Confirmation is the only path from a Candidate into the existing Continuity owner. */
export async function confirmContinuityCandidate(
  candidate: ContinuityCandidate,
  request: ProviderNeutralIntelligenceRequest,
  confirmation: ContinuityCandidateConfirmation | null,
  dependencies: ConfirmContinuityCandidateDependencies,
): Promise<ContinuityCandidateConfirmationResult> {
  const validated = revalidateCandidate(candidate, request)
  if (validated.status === 'rejected') {
    return { status: 'validation-failed', candidate, code: validated.code }
  }

  if (!confirmation) {
    return { status: 'confirmation-required', candidate: validated.candidate }
  }
  const now = dependencies.now()
  const confirmedAt = Date.parse(confirmation.confirmedAt)
  if (
    confirmation.decision !== 'confirm' ||
    confirmation.candidateId !== validated.candidate.candidateId ||
    !Number.isFinite(confirmedAt) ||
    !validTimestamp(now) ||
    confirmedAt < Date.parse(validated.candidate.proposedAt) ||
    confirmedAt > Date.parse(now)
  ) {
    return {
      status: 'validation-failed',
      candidate: validated.candidate,
      code: 'invalid-confirmation',
    }
  }

  try {
    const continuity = await dependencies.continuity.createConfirmed(
      buildConfirmedInput(validated.candidate, request),
    )
    const confirmedCandidate: ConfirmedContinuityCandidate = {
      ...validated.candidate,
      status: 'confirmed',
      confirmedAt: continuity.confirmation.confirmedAt,
      continuityItemId: continuity.id,
    }
    return { status: 'confirmed', candidate: confirmedCandidate, continuity }
  } catch {
    return { status: 'persistence-failed', candidate: validated.candidate }
  }
}
