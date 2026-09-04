import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import Dexie from 'dexie'
import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import { AppDatabase } from '../../data/database.ts'
import type {
  AssembledLifeOSContext,
  ProviderNeutralIntelligenceRequest,
} from '../intelligence/types.ts'
import type { IContinuityRepository } from './repository.ts'
import { DexieContinuityRepository } from './repository.ts'
import {
  confirmContinuityCandidate,
  validateContinuityCandidateDraft,
} from './services/ContinuityCandidate.ts'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange

const openedDatabases: AppDatabase[] = []

afterEach(async () => {
  await Promise.all(openedDatabases.splice(0).map((database) => database.delete()))
})

function context(options: {
  conversation?: 'ready' | 'not-ready' | 'omitted'
  relationshipIds?: string[]
} = {}): AssembledLifeOSContext {
  const conversation = options.conversation ?? 'ready'
  const relationshipIds = options.relationshipIds ?? []
  const included = [
    ...(conversation === 'omitted' ? [] : [{ domain: 'conversation' as const }]),
    ...relationshipIds.map((relationshipId) => ({
      domain: 'relationship-continuity' as const,
      relationshipId,
    })),
  ]
  const sections: AssembledLifeOSContext['sections'] = {
    relationshipContinuity: relationshipIds.map((relationshipId) => ({
      relationshipId,
      readiness: 'ready' as const,
      value: [],
      provenance: [
        {
          path: `continuity.relationship.${relationshipId}`,
          classification: 'continuity' as const,
          source: 'continuity-repository',
        },
      ],
      temporal: {
        assembledAt: '2026-09-04T04:00:00.000Z',
        sourceUpdatedAt: null,
        dateRange: null,
      },
    })),
  }
  if (conversation === 'ready') {
    sections.conversation = {
      readiness: 'ready',
      value: {
        conversationId: 'conversation-1',
        turns: [
          {
            id: 'turn-1',
            role: 'user',
            content: 'Please remember that I prefer quiet mornings.',
            createdAt: '2026-09-04T03:59:00.000Z',
          },
        ],
      },
      provenance: [
        {
          path: 'conversation',
          classification: 'conversation',
          source: 'current-conversation',
        },
      ],
      temporal: {
        assembledAt: '2026-09-04T04:00:00.000Z',
        sourceUpdatedAt: '2026-09-04T03:59:00.000Z',
        dateRange: null,
      },
    }
  } else if (conversation === 'not-ready') {
    sections.conversation = {
      readiness: 'not-ready',
      value: null,
      provenance: [
        {
          path: 'conversation',
          classification: 'conversation',
          source: 'current-conversation',
        },
      ],
      temporal: {
        assembledAt: '2026-09-04T04:00:00.000Z',
        sourceUpdatedAt: null,
        dateRange: null,
      },
    }
  }

  return {
    schemaVersion: '1',
    assembledAt: '2026-09-04T04:00:00.000Z',
    manifest: {
      requested: included.map((scope) => scope.domain),
      included,
      omitted: [],
    },
    sections,
  }
}

function request(
  assembledContext: AssembledLifeOSContext = context(),
): ProviderNeutralIntelligenceRequest {
  return {
    schemaVersion: '1',
    requestId: 'intelligence-request-1',
    requestedAt: '2026-09-04T04:00:30.000Z',
    trigger: 'user',
    instruction: 'Identify only information worth asking me to remember.',
    context: assembledContext,
  }
}

function validateLife(
  intelligenceRequest: ProviderNeutralIntelligenceRequest = request(),
) {
  return validateContinuityCandidateDraft(
    {
      continuityType: 'life',
      content: '  I prefer quiet mornings.  ',
      sources: [{ domain: 'conversation' }],
    },
    {
      candidateId: 'candidate-1',
      proposedAt: '2026-09-04T04:01:00.000Z',
      request: intelligenceRequest,
    },
  )
}

describe('Continuity Candidate host validation', () => {
  it('将 untrusted provider draft 转为短生命周期、用户触发的待确认 Candidate', () => {
    const result = validateLife()

    assert.equal(result.status, 'awaiting-confirmation')
    if (result.status !== 'awaiting-confirmation') return
    assert.deepEqual(result.candidate, {
      schemaVersion: '1',
      candidateId: 'candidate-1',
      intelligenceRequestId: 'intelligence-request-1',
      proposedAt: '2026-09-04T04:01:00.000Z',
      trigger: 'user',
      status: 'awaiting-confirmation',
      continuityType: 'life',
      relationshipId: null,
      content: 'I prefer quiet mornings.',
      sources: [{ domain: 'conversation' }],
    })
  })

  it('拒绝额外字段、空内容、重复 source 与 provider 伪造状态', () => {
    const invalidDrafts = [
      null,
      { continuityType: 'life', content: '', sources: [{ domain: 'conversation' }] },
      {
        continuityType: 'life',
        content: 'Content',
        sources: [{ domain: 'conversation' }, { domain: 'conversation' }],
      },
      {
        continuityType: 'life',
        content: 'Content',
        sources: [{ domain: 'conversation' }],
        status: 'confirmed',
      },
    ]

    for (const draft of invalidDrafts) {
      assert.equal(
        validateContinuityCandidateDraft(draft, {
          candidateId: 'candidate-1',
          proposedAt: '2026-09-04T04:01:00.000Z',
          request: request(),
        }).status,
        'rejected',
      )
    }
  })

  it('拒绝未授权或尚未 ready 的上下文来源', () => {
    const unauthorized = validateContinuityCandidateDraft(
      {
        continuityType: 'life',
        content: 'Content',
        sources: [{ domain: 'timeline' }],
      },
      {
        candidateId: 'candidate-1',
        proposedAt: '2026-09-04T04:01:00.000Z',
        request: request(),
      },
    )
    assert.deepEqual(unauthorized, {
      status: 'rejected',
      candidate: null,
      code: 'source-not-authorized',
    })

    const notReady = validateLife(request(context({ conversation: 'not-ready' })))
    assert.deepEqual(notReady, {
      status: 'rejected',
      candidate: null,
      code: 'source-not-ready',
    })
  })

  it('Life 与 Relationship 保持边界，Relationship 复用精确 relationshipId 授权', () => {
    const intelligenceRequest = request(
      context({ relationshipIds: ['person-alex'] }),
    )
    const lifeLeak = validateContinuityCandidateDraft(
      {
        continuityType: 'life',
        content: 'Alex prefers messages.',
        sources: [
          { domain: 'relationship-continuity', relationshipId: 'person-alex' },
        ],
      },
      {
        candidateId: 'candidate-life-leak',
        proposedAt: '2026-09-04T04:01:00.000Z',
        request: intelligenceRequest,
      },
    )
    assert.equal(lifeLeak.status, 'rejected')
    if (lifeLeak.status === 'rejected') {
      assert.equal(lifeLeak.code, 'continuity-boundary-violation')
    }

    const unauthorizedRelationship = validateContinuityCandidateDraft(
      {
        continuityType: 'relationship',
        relationshipId: 'person-sam',
        content: 'Sam prefers messages.',
        sources: [{ domain: 'conversation' }],
      },
      {
        candidateId: 'candidate-sam',
        proposedAt: '2026-09-04T04:01:00.000Z',
        request: intelligenceRequest,
      },
    )
    assert.equal(unauthorizedRelationship.status, 'rejected')
    if (unauthorizedRelationship.status === 'rejected') {
      assert.equal(unauthorizedRelationship.code, 'source-not-authorized')
    }

    const relationship = validateContinuityCandidateDraft(
      {
        continuityType: 'relationship',
        relationshipId: ' person-alex ',
        content: 'Alex prefers messages before calls.',
        sources: [
          { domain: 'conversation' },
          { domain: 'relationship-continuity', relationshipId: 'person-alex' },
        ],
      },
      {
        candidateId: 'candidate-alex',
        proposedAt: '2026-09-04T04:01:00.000Z',
        request: intelligenceRequest,
      },
    )
    assert.equal(relationship.status, 'awaiting-confirmation')
    if (relationship.status === 'awaiting-confirmation') {
      assert.equal(relationship.candidate.relationshipId, 'person-alex')
    }
  })
})

describe('Continuity Candidate confirmation path', () => {
  it('未确认与非法确认均不调用 Continuity Repository', async () => {
    const validated = validateLife()
    assert.equal(validated.status, 'awaiting-confirmation')
    if (validated.status !== 'awaiting-confirmation') return

    let writeCount = 0
    const continuity = {
      async createConfirmed() {
        writeCount += 1
        throw new Error('must not write')
      },
    } as Pick<IContinuityRepository, 'createConfirmed'>
    const dependencies = {
      continuity,
      now: () => '2026-09-04T04:02:00.000Z',
    }

    const unconfirmed = await confirmContinuityCandidate(
      validated.candidate,
      request(),
      null,
      dependencies,
    )
    assert.equal(unconfirmed.status, 'confirmation-required')

    const wrongCandidate = await confirmContinuityCandidate(
      validated.candidate,
      request(),
      {
        candidateId: 'candidate-other',
        decision: 'confirm',
        confirmedAt: '2026-09-04T04:01:30.000Z',
      },
      dependencies,
    )
    assert.equal(wrongCandidate.status, 'validation-failed')
    assert.equal(writeCount, 0)
  })

  it('明确确认后只通过现有 Repository 创建 confirmed Continuity', async () => {
    const database = new AppDatabase(
      `lifeos-candidate-${Date.now()}-${Math.random()}`,
    )
    openedDatabases.push(database)
    const repository = new DexieContinuityRepository(database, {
      generateId: () => 'continuity-from-candidate',
      now: () => '2026-09-04T04:01:31.000Z',
    })
    const intelligenceRequest = request()
    const validated = validateLife(intelligenceRequest)
    assert.equal(validated.status, 'awaiting-confirmation')
    if (validated.status !== 'awaiting-confirmation') return

    const result = await confirmContinuityCandidate(
      validated.candidate,
      intelligenceRequest,
      {
        candidateId: validated.candidate.candidateId,
        decision: 'confirm',
        confirmedAt: '2026-09-04T04:01:30.000Z',
      },
      {
        continuity: repository,
        now: () => '2026-09-04T04:02:00.000Z',
      },
    )

    assert.equal(result.status, 'confirmed')
    if (result.status !== 'confirmed') return
    assert.equal(result.candidate.status, 'confirmed')
    assert.equal(result.candidate.confirmedAt, '2026-09-04T04:01:31.000Z')
    assert.equal(result.candidate.continuityItemId, 'continuity-from-candidate')
    assert.equal(result.continuity.confirmation.method, 'manual')
    assert.deepEqual(result.continuity.lifecycle.map((event) => event.type), [
      'confirmed',
    ])
    assert.deepEqual(result.continuity.evidence, [
      {
        kind: 'lifeos-record',
        reference: 'intelligence-context:intelligence-request-1:conversation',
        note: 'User-confirmed Intelligence Continuity candidate',
        observedAt: '2026-09-04T03:59:00.000Z',
      },
    ])
    assert.equal(await database.continuityItems.count(), 1)
  })

  it('Relationship Candidate 确认后保持原 relationshipId 边界', async () => {
    const database = new AppDatabase(
      `lifeos-relationship-candidate-${Date.now()}-${Math.random()}`,
    )
    openedDatabases.push(database)
    const repository = new DexieContinuityRepository(database, {
      generateId: () => 'relationship-continuity-from-candidate',
      now: () => '2026-09-04T04:01:31.000Z',
    })
    const intelligenceRequest = request(
      context({ relationshipIds: ['person-alex'] }),
    )
    const validated = validateContinuityCandidateDraft(
      {
        continuityType: 'relationship',
        relationshipId: 'person-alex',
        content: 'Alex prefers messages before calls.',
        sources: [{ domain: 'conversation' }],
      },
      {
        candidateId: 'candidate-alex',
        proposedAt: '2026-09-04T04:01:00.000Z',
        request: intelligenceRequest,
      },
    )
    assert.equal(validated.status, 'awaiting-confirmation')
    if (validated.status !== 'awaiting-confirmation') return

    const result = await confirmContinuityCandidate(
      validated.candidate,
      intelligenceRequest,
      {
        candidateId: validated.candidate.candidateId,
        decision: 'confirm',
        confirmedAt: '2026-09-04T04:01:30.000Z',
      },
      {
        continuity: repository,
        now: () => '2026-09-04T04:02:00.000Z',
      },
    )

    assert.equal(result.status, 'confirmed')
    if (result.status !== 'confirmed') return
    assert.equal(result.continuity.continuityType, 'relationship')
    assert.equal(result.continuity.relationshipId, 'person-alex')
    assert.deepEqual(
      (await repository.getActiveRelationship('person-alex')).map(
        (item) => item.id,
      ),
      ['relationship-continuity-from-candidate'],
    )
    assert.deepEqual(await repository.getActiveRelationship('person-other'), [])
  })

  it('确认时重新校验 request 绑定，持久化失败则 Candidate 保持可重试', async () => {
    const validated = validateLife()
    assert.equal(validated.status, 'awaiting-confirmation')
    if (validated.status !== 'awaiting-confirmation') return
    const confirmation = {
      candidateId: validated.candidate.candidateId,
      decision: 'confirm' as const,
      confirmedAt: '2026-09-04T04:01:30.000Z',
    }

    const wrongRequest = await confirmContinuityCandidate(
      validated.candidate,
      { ...request(), requestId: 'intelligence-request-other' },
      confirmation,
      {
        continuity: {
          async createConfirmed() {
            throw new Error('must not write')
          },
        },
        now: () => '2026-09-04T04:02:00.000Z',
      },
    )
    assert.equal(wrongRequest.status, 'validation-failed')

    const persistenceFailure = await confirmContinuityCandidate(
      validated.candidate,
      request(),
      confirmation,
      {
        continuity: {
          async createConfirmed() {
            throw new Error('database unavailable')
          },
        },
        now: () => '2026-09-04T04:02:00.000Z',
      },
    )
    assert.equal(persistenceFailure.status, 'persistence-failed')
    assert.equal(persistenceFailure.candidate.status, 'awaiting-confirmation')
  })
})
