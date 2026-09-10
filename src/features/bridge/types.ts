import type {
  AssembledLifeOSContext,
  ContextAssemblyScope,
  ContextDomain,
  ContextPermission,
} from '../intelligence/types.ts'

export interface LifeOSBridgeDescriptor {
  name: 'lifeos'
  protocolVersion: '0'
  access: 'read-only'
  domains: readonly ContextDomain[]
}

export interface LifeOSBridgeRequestIdentity {
  requestId: string
  requestedAt: string
}

export interface LifeOSBridgeContextRequest
  extends LifeOSBridgeRequestIdentity {
  scope: ContextAssemblyScope
  permission: ContextPermission
}

export interface LifeOSBridgeLifeStateRequest
  extends LifeOSBridgeRequestIdentity {
  permission: ContextPermission
}

export interface LifeOSBridgeContinuityRequest
  extends LifeOSBridgeRequestIdentity {
  includeLife: boolean
  relationshipIds: string[]
  permission: ContextPermission
}

export interface LifeOSBridgeReadResponse {
  schemaVersion: '0'
  bridge: 'lifeos'
  requestId: string
  access: 'read-only'
  context: AssembledLifeOSContext
}

export interface LifeOSReadBridge {
  readonly descriptor: LifeOSBridgeDescriptor
  assembleContext(
    request: LifeOSBridgeContextRequest,
  ): Promise<LifeOSBridgeReadResponse>
  readCurrentLifeState(
    request: LifeOSBridgeLifeStateRequest,
  ): Promise<LifeOSBridgeReadResponse>
  readContinuity(
    request: LifeOSBridgeContinuityRequest,
  ): Promise<LifeOSBridgeReadResponse>
}
