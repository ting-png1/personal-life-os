import type { LifeState } from '../../life-state/types.ts'
import type {
  AssembledContextSection,
  AssembledLifeOSContext,
  ContextAssemblyScope,
  ContextDateRange,
  ContextDomain,
  ContextOmission,
  ContextPermission,
  ContextProvenance,
  ContextReaders,
  ContextReadResult,
  ContextScopeReference,
  RelationshipContinuityContextSection,
} from '../types.ts'

export interface AssembleContextInput {
  scope: ContextAssemblyScope
  permission: ContextPermission
  readers: ContextReaders
  assembledAt: string
}

const PROVENANCE = {
  currentLifeState: [
    {
      path: 'sources.today',
      classification: 'derived-state',
      source: 'today-aggregator',
    },
    {
      path: 'sources.cycle',
      classification: 'derived-state',
      source: 'cycle-calculator',
    },
    {
      path: 'sources.health',
      classification: 'fact',
      source: 'health-daily-summary',
    },
  ],
  timeline: [
    {
      path: 'days[].health',
      classification: 'fact',
      source: 'health-daily-summary',
    },
    {
      path: 'days[].mood',
      classification: 'derived-state',
      source: 'daily-mood-aggregator',
    },
  ],
  personalBaseline: [
    {
      path: '*',
      classification: 'derived-state',
      source: 'personal-baseline-builder',
    },
  ],
  lifeContinuity: [
    {
      path: '*',
      classification: 'continuity',
      source: 'life-continuity-repository',
    },
  ],
  relationshipContinuity: [
    {
      path: '*',
      classification: 'continuity',
      source: 'relationship-continuity-repository',
    },
  ],
  conversation: [
    {
      path: '*',
      classification: 'conversation',
      source: 'current-conversation',
    },
  ],
} satisfies Record<string, ContextProvenance[]>

function uniqueNonEmpty(values: string[], field: string): string[] {
  const unique: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const normalized = value.trim()
    if (normalized.length === 0) {
      throw new Error(`${field} must not contain an empty value`)
    }
    if (!seen.has(normalized)) {
      seen.add(normalized)
      unique.push(normalized)
    }
  }

  return unique
}

function isAuthorized(
  domain: ContextDomain,
  permission: ContextPermission,
): boolean {
  return permission.allowedDomains.includes(domain)
}

function sectionFrom<T>(
  result: ContextReadResult<T>,
  assembledAt: string,
  provenance: ContextProvenance[],
  dateRange: ContextDateRange | null,
): AssembledContextSection<T> {
  const metadata = {
    provenance,
    temporal: {
      assembledAt,
      sourceUpdatedAt: result.sourceUpdatedAt,
      dateRange,
    },
  }

  return result.readiness === 'ready'
    ? { ...metadata, readiness: 'ready', value: result.value }
    : { ...metadata, readiness: 'not-ready', value: null }
}

function lifeStateDateRange(
  result: ContextReadResult<LifeState>,
): ContextDateRange | null {
  if (result.readiness !== 'ready') return null

  const today = result.value.sources.today
  if (today.readiness === 'ready') {
    return { startDate: today.value.date, endDate: today.value.date }
  }

  const health = result.value.sources.health
  if (health.readiness === 'ready' && health.value !== null) {
    return { startDate: health.value.date, endDate: health.value.date }
  }

  return null
}

function requestedReferences(scope: ContextAssemblyScope): ContextScopeReference[] {
  const requested: ContextScopeReference[] = []
  if (scope.currentLifeState) requested.push({ domain: 'current-life-state' })
  if (scope.timeline) requested.push({ domain: 'timeline' })
  if (scope.personalBaseline) requested.push({ domain: 'personal-baseline' })
  if (scope.lifeContinuity) requested.push({ domain: 'life-continuity' })
  for (const relationshipId of uniqueNonEmpty(
    scope.relationshipContinuity?.relationshipIds ?? [],
    'scope.relationshipIds',
  )) {
    requested.push({ domain: 'relationship-continuity', relationshipId })
  }
  if (scope.conversation) requested.push({ domain: 'conversation' })
  return requested
}

export async function assembleLifeOSContext(
  input: AssembleContextInput,
): Promise<AssembledLifeOSContext> {
  const { scope, permission, readers, assembledAt } = input
  const requested = requestedReferences(scope)
  const allowedRelationshipIds = new Set(
    uniqueNonEmpty(
      permission.allowedRelationshipIds,
      'permission.allowedRelationshipIds',
    ),
  )
  const omitted: ContextOmission[] = []
  const sections: AssembledLifeOSContext['sections'] = {}

  const authorizeReader = (
    domain: ContextDomain,
    readerAvailable: boolean,
    relationshipId?: string,
  ): boolean => {
    const authorized =
      isAuthorized(domain, permission) &&
      (domain !== 'relationship-continuity' ||
        (relationshipId !== undefined && allowedRelationshipIds.has(relationshipId)))

    if (!authorized) {
      omitted.push({ domain, reason: 'not-authorized' })
      return false
    }
    if (!readerAvailable) {
      omitted.push({ domain, reason: 'reader-unavailable' })
      return false
    }
    return true
  }

  const tasks: Promise<void>[] = []

  if (
    scope.currentLifeState &&
    authorizeReader('current-life-state', Boolean(readers.readCurrentLifeState))
  ) {
    tasks.push(
      readers.readCurrentLifeState!().then((result) => {
        sections.currentLifeState = sectionFrom(
          result,
          assembledAt,
          PROVENANCE.currentLifeState,
          lifeStateDateRange(result),
        )
      }),
    )
  }

  if (scope.timeline && authorizeReader('timeline', Boolean(readers.readTimeline))) {
    const range = { ...scope.timeline }
    tasks.push(
      readers.readTimeline!(range).then((result) => {
        sections.timeline = sectionFrom(
          result,
          assembledAt,
          PROVENANCE.timeline,
          range,
        )
      }),
    )
  }

  if (
    scope.personalBaseline &&
    authorizeReader('personal-baseline', Boolean(readers.readPersonalBaseline))
  ) {
    const { anchorDate } = scope.personalBaseline
    tasks.push(
      readers.readPersonalBaseline!(anchorDate).then((result) => {
        const range =
          result.readiness === 'ready'
            ? {
                startDate: result.value.window.startDate,
                endDate: result.value.anchorDate,
              }
            : null
        sections.personalBaseline = sectionFrom(
          result,
          assembledAt,
          PROVENANCE.personalBaseline,
          range,
        )
      }),
    )
  }

  if (
    scope.lifeContinuity &&
    authorizeReader('life-continuity', Boolean(readers.readActiveLifeContinuity))
  ) {
    tasks.push(
      readers.readActiveLifeContinuity!().then((result) => {
        sections.lifeContinuity = sectionFrom(
          result,
          assembledAt,
          PROVENANCE.lifeContinuity,
          null,
        )
      }),
    )
  }

  const requestedRelationshipIds = uniqueNonEmpty(
    scope.relationshipContinuity?.relationshipIds ?? [],
    'scope.relationshipIds',
  )
  const relationshipTasks = requestedRelationshipIds.flatMap(
    (relationshipId) => {
      if (
        !authorizeReader(
          'relationship-continuity',
          Boolean(readers.readActiveRelationshipContinuity),
          relationshipId,
        )
      ) {
        return []
      }

      return [
        readers.readActiveRelationshipContinuity!(relationshipId).then(
          (result): RelationshipContinuityContextSection => ({
            ...sectionFrom(
              result,
              assembledAt,
              PROVENANCE.relationshipContinuity,
              null,
            ),
            relationshipId,
          }),
        ),
      ]
    },
  )
  if (relationshipTasks.length > 0) {
    tasks.push(
      Promise.all(relationshipTasks).then((relationshipSections) => {
        sections.relationshipContinuity = relationshipSections
      }),
    )
  }

  if (
    scope.conversation &&
    authorizeReader('conversation', Boolean(readers.readConversation))
  ) {
    tasks.push(
      readers.readConversation!().then((result) => {
        sections.conversation = sectionFrom(
          result,
          assembledAt,
          PROVENANCE.conversation,
          null,
        )
      }),
    )
  }

  await Promise.all(tasks)

  const included = requested.filter((reference) => {
    switch (reference.domain) {
      case 'current-life-state':
        return sections.currentLifeState !== undefined
      case 'timeline':
        return sections.timeline !== undefined
      case 'personal-baseline':
        return sections.personalBaseline !== undefined
      case 'life-continuity':
        return sections.lifeContinuity !== undefined
      case 'relationship-continuity':
        return sections.relationshipContinuity?.some(
          (section) => section.relationshipId === reference.relationshipId,
        ) ?? false
      case 'conversation':
        return sections.conversation !== undefined
    }
  })
  const requestedDomains = [
    ...new Set(requested.map((reference) => reference.domain)),
  ]
  const uniqueOmissions = omitted.filter(
    (omission, index) =>
      omitted.findIndex(
        (candidate) =>
          candidate.domain === omission.domain && candidate.reason === omission.reason,
      ) === index,
  )

  return {
    schemaVersion: '1',
    assembledAt,
    manifest: { requested: requestedDomains, included, omitted: uniqueOmissions },
    sections,
  }
}
