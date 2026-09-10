import type { IContinuityRepository } from '../../continuity/repository.ts'
import type { LifeState } from '../../life-state/types.ts'
import { loadPersonalBaseline } from '../../baseline/services/loadPersonalBaseline.ts'
import {
  loadTimeline,
  type TimelineSources,
} from '../../timeline/services/loadTimeline.ts'
import type {
  ContextReaders,
  ContextReadResult,
  CurrentConversationContext,
} from '../types.ts'

export interface LocalContextReaderInput {
  /** Host-owned snapshot from the deterministic Life State composition. */
  currentLifeState: ContextReadResult<LifeState>
  /** Conversation remains host-owned and is absent unless explicitly supplied. */
  conversation?: ContextReadResult<CurrentConversationContext>
}

export interface LocalContextReaderDependencies {
  timelineSources: TimelineSources
  continuity: Pick<
    IContinuityRepository,
    'getActiveLife' | 'getActiveRelationship'
  >
}

function newestUpdatedAt(items: Array<{ updatedAt: string }>): string | null {
  return items.reduce<string | null>(
    (latest, item) => latest === null || item.updatedAt > latest
      ? item.updatedAt
      : latest,
    null,
  )
}

/**
 * Local-First read adapter for Context Assembly. It exposes only established
 * domain reads; no fact mutation or direct Dexie access crosses this boundary.
 */
export function createLocalContextReaders(
  input: LocalContextReaderInput,
  dependencies: LocalContextReaderDependencies,
): ContextReaders {
  const { timelineSources, continuity } = dependencies

  return {
    async readCurrentLifeState() {
      return input.currentLifeState
    },
    async readTimeline(range) {
      return {
        readiness: 'ready',
        value: await loadTimeline(range, timelineSources),
        sourceUpdatedAt: null,
      }
    },
    async readPersonalBaseline(anchorDate) {
      return {
        readiness: 'ready',
        value: await loadPersonalBaseline(anchorDate, timelineSources),
        sourceUpdatedAt: null,
      }
    },
    async readActiveLifeContinuity() {
      const items = await continuity.getActiveLife()
      return {
        readiness: 'ready',
        value: items,
        sourceUpdatedAt: newestUpdatedAt(items),
      }
    },
    async readActiveRelationshipContinuity(relationshipId) {
      const items = await continuity.getActiveRelationship(relationshipId)
      return {
        readiness: 'ready',
        value: items,
        sourceUpdatedAt: newestUpdatedAt(items),
      }
    },
    ...(input.conversation
      ? {
          async readConversation() {
            return input.conversation!
          },
        }
      : {}),
  }
}
