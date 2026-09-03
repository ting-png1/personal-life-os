import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PersonalBaseline, PersonalMetricTrend } from '../../baseline/types.ts'
import type {
  LifeContinuityItem,
  RelationshipContinuityItem,
} from '../../continuity/types.ts'
import type { LifeState } from '../../life-state/types.ts'
import type { LifeTimeline } from '../../timeline/types.ts'
import type {
  AssembledLifeOSContext,
  ContextReadResult,
  CurrentConversationContext,
  IntelligenceProvider,
} from '../types.ts'
import { assembleLifeOSContext } from './ContextAssembler.ts'
import {
  buildIntelligenceRequest,
  sendToIntelligenceProvider,
} from './IntelligenceBridge.ts'

const notReadyLifeState: LifeState = {
  asOf: '2026-09-03T08:00:00.000Z',
  sources: {
    today: { readiness: 'not-ready', value: null },
    cycle: { readiness: 'not-ready', value: null },
    health: { readiness: 'not-ready', value: null },
  },
}

const insufficientMetric: PersonalMetricTrend = {
  status: 'insufficient-data',
  sampleCount: 0,
  baselineAverage: null,
  currentValue: null,
  delta: null,
  direction: null,
}

const baseline: PersonalBaseline = {
  anchorDate: '2026-09-03',
  window: {
    startDate: '2026-08-20',
    endDate: '2026-09-02',
    lookbackDays: 14,
    minimumSamples: 7,
  },
  health: {
    sleepDurationMinutes: insufficientMetric,
    restingHeartRate: insufficientMetric,
    hrvMilliseconds: insufficientMetric,
  },
  mood: { averageLevel: insufficientMetric },
}

function lifeContinuity(content: string): LifeContinuityItem {
  return {
    id: 'life-continuity-1',
    continuityType: 'life',
    relationshipId: null,
    content,
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
}

function relationshipContinuity(
  relationshipId: string,
  content: string,
): RelationshipContinuityItem {
  return {
    ...lifeContinuity(content),
    id: `relationship-continuity-${relationshipId}`,
    continuityType: 'relationship',
    relationshipId,
  }
}

function ready<T>(value: T, sourceUpdatedAt: string | null): ContextReadResult<T> {
  return { readiness: 'ready', value, sourceUpdatedAt }
}

describe('Context Assembly permission boundary', () => {
  it('按明确 scope 组合来源、时间与 readiness，并只读取授权 relationshipId', async () => {
    const relationshipReads: string[] = []
    const timeline: LifeTimeline = {
      startDate: '2026-09-01',
      endDate: '2026-09-03',
      days: [],
    }
    const conversation: CurrentConversationContext = {
      conversationId: 'conversation-1',
      turns: [
        {
          id: 'turn-1',
          role: 'user',
          content: 'Help me plan today.',
          createdAt: '2026-09-03T08:00:00.000Z',
        },
      ],
    }

    const context = await assembleLifeOSContext({
      assembledAt: '2026-09-03T08:05:00.000Z',
      scope: {
        currentLifeState: true,
        timeline: { startDate: '2026-09-01', endDate: '2026-09-03' },
        personalBaseline: { anchorDate: '2026-09-03' },
        lifeContinuity: true,
        relationshipContinuity: {
          relationshipIds: ['person-alex', 'person-sam'],
        },
        conversation: true,
      },
      permission: {
        allowedDomains: [
          'current-life-state',
          'timeline',
          'personal-baseline',
          'life-continuity',
          'relationship-continuity',
          'conversation',
        ],
        allowedRelationshipIds: ['person-alex'],
      },
      readers: {
        async readCurrentLifeState() {
          return ready(notReadyLifeState, notReadyLifeState.asOf)
        },
        async readTimeline() {
          return ready(timeline, '2026-09-03T08:01:00.000Z')
        },
        async readPersonalBaseline() {
          return ready(baseline, '2026-09-03T08:02:00.000Z')
        },
        async readActiveLifeContinuity() {
          return ready(
            [lifeContinuity('I prefer quiet mornings.')],
            '2026-09-01T08:00:00.000Z',
          )
        },
        async readActiveRelationshipContinuity(relationshipId) {
          relationshipReads.push(relationshipId)
          return ready(
            [relationshipContinuity(relationshipId, 'Prefers messages.')],
            '2026-09-02T08:00:00.000Z',
          )
        },
        async readConversation() {
          return ready(conversation, '2026-09-03T08:00:00.000Z')
        },
      },
    })

    assert.deepEqual(relationshipReads, ['person-alex'])
    assert.equal(context.sections.timeline?.readiness, 'ready')
    assert.deepEqual(context.sections.timeline?.temporal.dateRange, {
      startDate: '2026-09-01',
      endDate: '2026-09-03',
    })
    assert.deepEqual(context.sections.personalBaseline?.temporal.dateRange, {
      startDate: '2026-08-20',
      endDate: '2026-09-03',
    })
    assert.ok(
      context.sections.currentLifeState?.provenance.some(
        (source) => source.classification === 'fact',
      ),
    )
    assert.equal(
      context.sections.relationshipContinuity?.[0].relationshipId,
      'person-alex',
    )
    assert.deepEqual(context.manifest.omitted, [
      {
        domain: 'relationship-continuity',
        reason: 'not-authorized',
      },
    ])
  })

  it('权限过滤发生在 reader 调用前，未授权内容不会进入 context', async () => {
    let unauthorizedReadCount = 0
    const context = await assembleLifeOSContext({
      assembledAt: '2026-09-03T08:05:00.000Z',
      scope: {
        timeline: { startDate: '2026-09-01', endDate: '2026-09-03' },
        lifeContinuity: true,
        relationshipContinuity: {
          relationshipIds: ['person-private', 'person-private-2'],
        },
        conversation: true,
      },
      permission: {
        allowedDomains: ['conversation'],
        allowedRelationshipIds: [],
      },
      readers: {
        async readTimeline() {
          unauthorizedReadCount += 1
          throw new Error('must not be called')
        },
        async readActiveLifeContinuity() {
          unauthorizedReadCount += 1
          return ready([lifeContinuity('PRIVATE LIFE CONTENT')], null)
        },
        async readActiveRelationshipContinuity() {
          unauthorizedReadCount += 1
          return ready(
            [relationshipContinuity('person-private', 'PRIVATE RELATIONSHIP CONTENT')],
            null,
          )
        },
        async readConversation() {
          return ready(
            { conversationId: null, turns: [] },
            '2026-09-03T08:00:00.000Z',
          )
        },
      },
    })

    assert.equal(unauthorizedReadCount, 0)
    const serialized = JSON.stringify(context)
    assert.equal(serialized.includes('PRIVATE LIFE CONTENT'), false)
    assert.equal(serialized.includes('PRIVATE RELATIONSHIP CONTENT'), false)
    assert.equal(serialized.includes('person-private'), false)
    assert.equal(serialized.includes('person-private-2'), false)
    assert.equal(context.sections.conversation?.readiness, 'ready')
    assert.equal(context.manifest.omitted.length, 3)
  })

  it('已授权但尚未准备好的来源保持 not-ready，不伪装成空数据', async () => {
    const context = await assembleLifeOSContext({
      assembledAt: '2026-09-03T08:05:00.000Z',
      scope: {
        timeline: { startDate: '2026-09-01', endDate: '2026-09-03' },
      },
      permission: {
        allowedDomains: ['timeline'],
        allowedRelationshipIds: [],
      },
      readers: {
        async readTimeline() {
          return {
            readiness: 'not-ready',
            value: null,
            sourceUpdatedAt: null,
          }
        },
      },
    })

    assert.equal(context.sections.timeline?.readiness, 'not-ready')
    assert.equal(context.sections.timeline?.value, null)
    assert.deepEqual(context.manifest.requested, ['timeline'])
    assert.deepEqual(context.manifest.included, [{ domain: 'timeline' }])
    assert.deepEqual(context.manifest.omitted, [])
  })
})

describe('Provider-neutral Intelligence Bridge', () => {
  it('只向可替换 provider 发送已装配 context，并固定为用户触发', async () => {
    const context: AssembledLifeOSContext = {
      schemaVersion: '1',
      assembledAt: '2026-09-03T08:05:00.000Z',
      manifest: { requested: [], included: [], omitted: [] },
      sections: {},
    }
    const request = buildIntelligenceRequest({
      requestId: 'request-1',
      requestedAt: '2026-09-03T08:06:00.000Z',
      instruction: '  Summarize my current context.  ',
      context,
    })
    let receivedRequest: unknown = null
    const provider: IntelligenceProvider = {
      id: 'replaceable-test-provider',
      async complete(received) {
        receivedRequest = received
        return { content: '  Context summary.  ', providerRequestId: 'provider-1' }
      },
    }

    const response = await sendToIntelligenceProvider(
      provider,
      request,
      () => '2026-09-03T08:07:00.000Z',
    )

    assert.equal(request.trigger, 'user')
    assert.equal(request.instruction, 'Summarize my current context.')
    assert.equal(receivedRequest, request)
    assert.deepEqual(response, {
      requestId: 'request-1',
      providerId: 'replaceable-test-provider',
      providerRequestId: 'provider-1',
      content: 'Context summary.',
      completedAt: '2026-09-03T08:07:00.000Z',
    })
  })
})
