import type {
  AssembledLifeOSContext,
  ContextAssemblyScope,
  ContextDomain,
  ContextPermission,
  ContextReaders,
  ContextScopeReference,
  IntelligenceProvider,
  IntelligenceProviderAttempt,
  IntelligenceResultClassification,
  IntelligenceResponse,
  StructuredIntelligenceResult,
  UserIntelligenceRuntimeResult,
} from '../types.ts'
import { assembleLifeOSContext } from './ContextAssembler.ts'
import {
  buildIntelligenceRequest,
  IntelligenceProviderResponseError,
  sendToIntelligenceProvider,
} from './IntelligenceBridge.ts'

type UnknownRecord = Record<string, unknown>

const CONTEXT_DOMAINS: readonly ContextDomain[] = [
  'current-life-state',
  'timeline',
  'personal-baseline',
  'life-continuity',
  'relationship-continuity',
  'conversation',
]

export interface IntelligenceProviderRoute {
  /** Application composition assigns the concrete provider serving Riven here. */
  primary: IntelligenceProvider
  /** Fallback is always denied Relationship Continuity in this runtime version. */
  fallback?: IntelligenceProvider
}

export interface RunUserIntelligenceInput {
  instruction: string
  scope: ContextAssemblyScope
  permission: ContextPermission
  readers: ContextReaders
  providers: IntelligenceProviderRoute
  now: () => string
  generateId: () => string
}

class StructuredIntelligenceResultError extends Error {}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: UnknownRecord, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new StructuredIntelligenceResultError(`${field} must be non-empty text`)
  }
  return value.trim()
}

function parseContextReference(value: unknown): ContextScopeReference {
  if (!isRecord(value) || !hasOnlyKeys(value, ['domain', 'relationshipId'])) {
    throw new StructuredIntelligenceResultError('basedOn contains an invalid reference')
  }
  if (
    typeof value.domain !== 'string' ||
    !CONTEXT_DOMAINS.includes(value.domain as ContextDomain)
  ) {
    throw new StructuredIntelligenceResultError('basedOn contains an unknown domain')
  }

  const domain = value.domain as ContextDomain
  if (domain === 'relationship-continuity') {
    return {
      domain,
      relationshipId: requiredText(value.relationshipId, 'relationshipId'),
    }
  }
  if (Object.prototype.hasOwnProperty.call(value, 'relationshipId')) {
    throw new StructuredIntelligenceResultError(
      'relationshipId is only valid for Relationship Continuity',
    )
  }
  return { domain }
}

function referenceIsIncluded(
  reference: ContextScopeReference,
  context: AssembledLifeOSContext,
): boolean {
  return context.manifest.included.some((included) =>
    included.domain === reference.domain &&
    (reference.domain !== 'relationship-continuity' ||
      included.relationshipId === reference.relationshipId),
  )
}

function parseStructuredResult(
  response: IntelligenceResponse,
  context: AssembledLifeOSContext,
): StructuredIntelligenceResult {
  if (response.structuredOutputs?.length !== 1) {
    throw new StructuredIntelligenceResultError(
      'user intelligence requires exactly one structured result',
    )
  }
  const raw = response.structuredOutputs[0]
  if (
    !isRecord(raw) ||
    !hasOnlyKeys(raw, ['schemaVersion', 'kind', 'summary', 'statements']) ||
    raw.schemaVersion !== '1' ||
    raw.kind !== 'intelligence-result' ||
    !Array.isArray(raw.statements)
  ) {
    throw new StructuredIntelligenceResultError('invalid intelligence result envelope')
  }

  const statements = raw.statements.map((value, index) => {
    if (
      !isRecord(value) ||
      !hasOnlyKeys(value, ['classification', 'content', 'basedOn']) ||
      (value.classification !== 'inference' && value.classification !== 'suggestion') ||
      !Array.isArray(value.basedOn)
    ) {
      throw new StructuredIntelligenceResultError(
        `invalid intelligence result statement at index ${index}`,
      )
    }
    const basedOn = value.basedOn.map(parseContextReference)
    if (basedOn.length === 0) {
      throw new StructuredIntelligenceResultError(
        `statement at index ${index} must cite included context`,
      )
    }
    if (basedOn.some((reference) => !referenceIsIncluded(reference, context))) {
      throw new StructuredIntelligenceResultError(
        `statement at index ${index} references context that was not included`,
      )
    }
    const classification = value.classification as IntelligenceResultClassification
    return {
      classification,
      content: requiredText(value.content, `statements[${index}].content`),
      basedOn,
    }
  })

  return {
    schemaVersion: '1',
    kind: 'intelligence-result',
    summary: requiredText(raw.summary, 'summary'),
    statements,
  }
}

function lifeStateIsUsable(context: AssembledLifeOSContext): boolean {
  const section = context.sections.currentLifeState
  if (section?.readiness !== 'ready') return false
  return Object.values(section.value.sources).some(
    (source) => source.readiness === 'ready',
  )
}

function fallbackScope(scope: ContextAssemblyScope): ContextAssemblyScope {
  const { relationshipContinuity: _denied, ...allowed } = scope
  return allowed
}

function fallbackPermission(permission: ContextPermission): ContextPermission {
  return {
    allowedDomains: permission.allowedDomains.filter(
      (domain) => domain !== 'relationship-continuity',
    ),
    allowedRelationshipIds: [],
  }
}

async function invokeProvider(
  provider: IntelligenceProvider,
  role: 'primary' | 'fallback',
  input: RunUserIntelligenceInput,
  context: AssembledLifeOSContext,
  requestIdentity: { requestId: string; requestedAt: string },
): Promise<
  | {
      status: 'completed'
      request: ReturnType<typeof buildIntelligenceRequest>
      response: IntelligenceResponse
      result: StructuredIntelligenceResult
      attempt: IntelligenceProviderAttempt
    }
  | {
      status: 'failed'
      attempt: IntelligenceProviderAttempt
    }
> {
  const request = buildIntelligenceRequest({
    requestId: requestIdentity.requestId,
    requestedAt: requestIdentity.requestedAt,
    instruction: input.instruction,
    context,
  })

  try {
    const response = await sendToIntelligenceProvider(provider, request, input.now)
    const result = parseStructuredResult(response, context)
    return {
      status: 'completed',
      request,
      response,
      result,
      attempt: { providerId: provider.id, role, outcome: 'completed' },
    }
  } catch (error) {
    const malformed =
      error instanceof IntelligenceProviderResponseError ||
      error instanceof StructuredIntelligenceResultError
    return {
      status: 'failed',
      attempt: {
        providerId: provider.id,
        role,
        outcome: malformed ? 'malformed-response' : 'unavailable',
      },
    }
  }
}

/**
 * User-triggered, read-only Intelligence runtime.
 * It receives only scoped readers and providers; no fact write capability is exposed.
 */
export async function runUserIntelligence(
  input: RunUserIntelligenceInput,
): Promise<UserIntelligenceRuntimeResult> {
  const requestIdentity = {
    requestId: input.generateId(),
    requestedAt: input.now(),
  }
  const scope: ContextAssemblyScope = {
    ...input.scope,
    currentLifeState: true,
  }
  let context: AssembledLifeOSContext
  try {
    context = await assembleLifeOSContext({
      scope,
      permission: input.permission,
      readers: input.readers,
      assembledAt: requestIdentity.requestedAt,
    })
  } catch {
    return { status: 'degraded', reason: 'context-unavailable', attempts: [] }
  }
  if (!lifeStateIsUsable(context)) {
    return { status: 'degraded', reason: 'context-not-ready', attempts: [] }
  }

  const attempts: IntelligenceProviderAttempt[] = []
  const primary = await invokeProvider(
    input.providers.primary,
    'primary',
    input,
    context,
    requestIdentity,
  )
  attempts.push(primary.attempt)
  if (primary.status === 'completed') {
    return {
      status: 'completed',
      providerRole: 'primary',
      request: primary.request,
      response: primary.response,
      result: primary.result,
      attempts,
    }
  }

  if (!input.providers.fallback) {
    return {
      status: 'degraded',
      reason: primary.attempt.outcome === 'malformed-response'
        ? 'malformed-provider-response'
        : 'provider-unavailable',
      attempts,
    }
  }

  let restrictedContext: AssembledLifeOSContext
  try {
    restrictedContext = await assembleLifeOSContext({
      scope: fallbackScope(scope),
      permission: fallbackPermission(input.permission),
      readers: input.readers,
      assembledAt: requestIdentity.requestedAt,
    })
  } catch {
    return { status: 'degraded', reason: 'context-unavailable', attempts }
  }
  if (!lifeStateIsUsable(restrictedContext)) {
    return { status: 'degraded', reason: 'context-not-ready', attempts }
  }

  const fallback = await invokeProvider(
    input.providers.fallback,
    'fallback',
    input,
    restrictedContext,
    requestIdentity,
  )
  attempts.push(fallback.attempt)
  if (fallback.status === 'completed') {
    return {
      status: 'completed',
      providerRole: 'fallback',
      request: fallback.request,
      response: fallback.response,
      result: fallback.result,
      attempts,
    }
  }
  return {
    status: 'degraded',
    reason: fallback.attempt.outcome === 'malformed-response'
      ? 'malformed-provider-response'
      : 'provider-unavailable',
    attempts,
  }
}
