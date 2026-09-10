import { assembleLifeOSContext } from '../intelligence/services/ContextAssembler.ts'
import type { ContextDomain, ContextReaders } from '../intelligence/types.ts'
import type {
  LifeOSBridgeContextRequest,
  LifeOSBridgeContinuityRequest,
  LifeOSBridgeLifeStateRequest,
  LifeOSBridgeReadResponse,
  LifeOSReadBridge,
} from './types.ts'

const BRIDGE_DOMAINS: readonly ContextDomain[] = Object.freeze([
  'current-life-state',
  'timeline',
  'personal-baseline',
  'life-continuity',
  'relationship-continuity',
  'conversation',
])

function validateIdentity(request: {
  requestId: string
  requestedAt: string
}): void {
  if (request.requestId.trim().length === 0) {
    throw new Error('Bridge requestId must not be empty')
  }
  if (!Number.isFinite(Date.parse(request.requestedAt))) {
    throw new Error('Bridge requestedAt must be a valid instant')
  }
}

function response(
  requestId: string,
  context: Awaited<ReturnType<typeof assembleLifeOSContext>>,
): LifeOSBridgeReadResponse {
  return {
    schemaVersion: '0',
    bridge: 'lifeos',
    requestId,
    access: 'read-only',
    context,
  }
}

/**
 * Provider- and host-neutral read boundary over existing Context Assembly.
 * Its dependencies expose reads only, so no fact mutation can cross the Bridge.
 */
export function createLifeOSReadBridge(
  readers: ContextReaders,
): LifeOSReadBridge {
  const assemble = async (
    request: LifeOSBridgeContextRequest,
  ): Promise<LifeOSBridgeReadResponse> => {
    validateIdentity(request)
    const context = await assembleLifeOSContext({
      scope: request.scope,
      permission: request.permission,
      readers,
      assembledAt: request.requestedAt,
    })
    return response(request.requestId.trim(), context)
  }

  return {
    descriptor: Object.freeze({
      name: 'lifeos',
      protocolVersion: '0',
      access: 'read-only',
      domains: BRIDGE_DOMAINS,
    }),
    assembleContext: assemble,
    readCurrentLifeState(request: LifeOSBridgeLifeStateRequest) {
      return assemble({
        ...request,
        scope: { currentLifeState: true },
      })
    },
    readContinuity(request: LifeOSBridgeContinuityRequest) {
      return assemble({
        requestId: request.requestId,
        requestedAt: request.requestedAt,
        permission: request.permission,
        scope: {
          ...(request.includeLife ? { lifeContinuity: true as const } : {}),
          ...(request.relationshipIds.length > 0
            ? {
                relationshipContinuity: {
                  relationshipIds: [...request.relationshipIds],
                },
              }
            : {}),
        },
      })
    },
  }
}
