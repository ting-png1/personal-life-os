export type ContinuityType = 'life' | 'relationship'
export type ContinuityStatus = 'active' | 'expired' | 'superseded'

export type ContinuityEvidence =
  | {
      kind: 'user-statement'
      reference: null
      note: string | null
      observedAt: string | null
    }
  | {
      kind: 'lifeos-record' | 'external-reference'
      reference: string
      note: string | null
      observedAt: string | null
    }

export type ContinuityLifecycleEvent =
  | {
      type: 'confirmed'
      at: string
    }
  | {
      type: 'updated'
      at: string
    }
  | {
      type: 'expired'
      at: string
      reason: string | null
    }
  | {
      type: 'superseded'
      at: string
      replacementId: string
    }

interface ContinuityItemBase {
  id: string
  content: string
  status: ContinuityStatus
  confirmation: {
    method: 'manual'
    confirmedAt: string
  }
  evidence: ContinuityEvidence[]
  lifecycle: ContinuityLifecycleEvent[]
  supersedesId: string | null
  supersededById: string | null
  expiredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LifeContinuityItem extends ContinuityItemBase {
  continuityType: 'life'
  relationshipId: null
}

export interface RelationshipContinuityItem extends ContinuityItemBase {
  continuityType: 'relationship'
  relationshipId: string
}

export type ContinuityItem =
  | LifeContinuityItem
  | RelationshipContinuityItem

interface CreateConfirmedContinuityBase {
  content: string
  evidence: [ContinuityEvidence, ...ContinuityEvidence[]]
}

export type CreateConfirmedContinuityInput =
  | (CreateConfirmedContinuityBase & {
      continuityType: 'life'
      relationshipId?: never
    })
  | (CreateConfirmedContinuityBase & {
      continuityType: 'relationship'
      relationshipId: string
    })

/** Minor correction only; changed meaning should create a superseding item. */
export interface UpdateContinuityInput {
  content: string
}
