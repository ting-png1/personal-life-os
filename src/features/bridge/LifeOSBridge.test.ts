import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { LifeContinuityItem } from '../continuity/types.ts'
import type { LifeState } from '../life-state/types.ts'
import type { ContextReaders } from '../intelligence/types.ts'
import { createLifeOSReadBridge } from './LifeOSBridge.ts'

const lifeState: LifeState = {
  asOf: '2026-09-10T08:00:00.000Z',
  sources: {
    today: { readiness: 'not-ready', value: null },
    cycle: { readiness: 'not-ready', value: null },
    health: { readiness: 'ready', value: null },
  },
}

const continuity: LifeContinuityItem = {
  id: 'continuity-1',
  continuityType: 'life',
  relationshipId: null,
  content: 'Quiet mornings help me focus.',
  status: 'active',
  confirmation: {
    method: 'manual',
    confirmedAt: '2026-09-01T08:00:00.000Z',
  },
  evidence: [
    {
      kind: 'user-statement',
      reference: null,
      note: null,
      observedAt: null,
    },
  ],
  lifecycle: [{ type: 'confirmed', at: '2026-09-01T08:00:00.000Z' }],
  supersedesId: null,
  supersededById: null,
  expiredAt: null,
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
}

function readers(reads: string[]): ContextReaders {
  return {
    async readCurrentLifeState() {
      reads.push('life-state')
      return {
        readiness: 'ready',
        value: lifeState,
        sourceUpdatedAt: lifeState.asOf,
      }
    },
    async readActiveLifeContinuity() {
      reads.push('life-continuity')
      return {
        readiness: 'ready',
        value: [continuity],
        sourceUpdatedAt: continuity.updatedAt,
      }
    },
    async readActiveRelationshipContinuity(relationshipId) {
      reads.push(`relationship:${relationshipId}`)
      return { readiness: 'ready', value: [], sourceUpdatedAt: null }
    },
  }
}

describe('LifeOS Bridge v0', () => {
  it('exposes deterministic Life State through a provider-neutral read envelope', async () => {
    const reads: string[] = []
    const bridge = createLifeOSReadBridge(readers(reads))

    const result = await bridge.readCurrentLifeState({
      requestId: 'bridge-request-1',
      requestedAt: '2026-09-10T08:05:00.000Z',
      permission: {
        allowedDomains: ['current-life-state'],
        allowedRelationshipIds: [],
      },
    })

    assert.equal(bridge.descriptor.access, 'read-only')
    assert.equal(result.access, 'read-only')
    assert.equal(result.requestId, 'bridge-request-1')
    assert.equal(result.context.sections.currentLifeState?.readiness, 'ready')
    assert.deepEqual(reads, ['life-state'])
  })

  it('reuses Context Assembly permission filtering for Continuity', async () => {
    const reads: string[] = []
    const bridge = createLifeOSReadBridge(readers(reads))

    const result = await bridge.readContinuity({
      requestId: 'bridge-request-2',
      requestedAt: '2026-09-10T08:05:00.000Z',
      includeLife: true,
      relationshipIds: ['person-private'],
      permission: {
        allowedDomains: ['life-continuity'],
        allowedRelationshipIds: [],
      },
    })

    assert.deepEqual(reads, ['life-continuity'])
    assert.equal(result.context.sections.lifeContinuity?.readiness, 'ready')
    assert.equal(result.context.sections.relationshipContinuity, undefined)
    assert.deepEqual(result.context.manifest.omitted, [
      { domain: 'relationship-continuity', reason: 'not-authorized' },
    ])
  })

  it('offers no provider or mutation operation and validates identity before reads', async () => {
    const reads: string[] = []
    const bridge = createLifeOSReadBridge(readers(reads))

    assert.deepEqual(Object.keys(bridge).sort(), [
      'assembleContext',
      'descriptor',
      'readContinuity',
      'readCurrentLifeState',
    ])
    await assert.rejects(
      bridge.assembleContext({
        requestId: ' ',
        requestedAt: 'invalid',
        scope: { currentLifeState: true },
        permission: {
          allowedDomains: ['current-life-state'],
          allowedRelationshipIds: [],
        },
      }),
      /requestId/,
    )
    assert.deepEqual(reads, [])
  })
})
