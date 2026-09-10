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
  ContextScopeReference,
  CurrentConversationContext,
  IntelligenceProvider,
} from '../types.ts'
import { assembleLifeOSContext } from './ContextAssembler.ts'
import {
  buildIntelligenceRequest,
  sendToIntelligenceProvider,
} from './IntelligenceBridge.ts'
import { runUserIntelligence } from './IntelligenceRuntime.ts'
import { createLocalContextReaders } from './LocalContextReaders.ts'
import { RivenProvider } from '../providers/RivenProvider.ts'

const notReadyLifeState: LifeState = {
  asOf: '2026-09-03T08:00:00.000Z',
  sources: {
    today: { readiness: 'not-ready', value: null },
    cycle: { readiness: 'not-ready', value: null },
    health: { readiness: 'not-ready', value: null },
  },
}

const usableLifeState: LifeState = {
  ...notReadyLifeState,
  sources: {
    ...notReadyLifeState.sources,
    health: { readiness: 'ready', value: null },
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

describe('Riven provider adapter', () => {
  it('serializes the provider-neutral request and returns one structured output', async () => {
    const gatewayInputs: Array<{
      model: string
      systemPrompt: string
      userPrompt: string
    }> = []
    const provider = new RivenProvider({
      model: 'deepseek-chat',
      gateway: {
        async complete(input) {
          gatewayInputs.push(input)
          return {
            content: JSON.stringify({
              schemaVersion: '1',
              kind: 'intelligence-result',
              summary: 'A concise answer.',
              statements: [
                {
                  classification: 'suggestion',
                  content: 'An optional next step.',
                  basedOn: [{ domain: 'current-life-state' }],
                },
              ],
            }),
            providerRequestId: 'provider-request-riven',
          }
        },
      },
    })
    const context: AssembledLifeOSContext = {
      schemaVersion: '1',
      assembledAt: '2026-09-10T08:00:00.000Z',
      manifest: {
        requested: ['current-life-state'],
        included: [{ domain: 'current-life-state' }],
        omitted: [],
      },
      sections: {},
    }
    const request = buildIntelligenceRequest({
      requestId: 'request-riven',
      requestedAt: '2026-09-10T08:00:00.000Z',
      instruction: 'Help me plan the next hour.',
      context,
    })

    const result = await provider.complete(request)
    const gatewayInput = gatewayInputs[0]

    assert.equal(provider.id, 'riven')
    assert.ok(gatewayInput)
    assert.equal(gatewayInput.model, 'deepseek-chat')
    assert.match(gatewayInput.systemPrompt, /不声称已经修改/)
    assert.deepEqual(JSON.parse(gatewayInput.userPrompt), request)
    assert.equal(result.content, 'A concise answer.')
    assert.equal(result.providerRequestId, 'provider-request-riven')
    assert.equal(result.structuredOutputs?.length, 1)
  })

  it('preserves malformed provider content for the runtime validation boundary', async () => {
    const provider = new RivenProvider({
      model: 'test-model',
      gateway: {
        async complete() {
          return {
            content: 'not structured json',
            providerRequestId: null,
          }
        },
      },
    })

    const result = await provider.complete({
      schemaVersion: '1',
      requestId: 'request-malformed-riven',
      requestedAt: '2026-09-10T08:00:00.000Z',
      trigger: 'user',
      instruction: 'Summarize now.',
      context: {
        schemaVersion: '1',
        assembledAt: '2026-09-10T08:00:00.000Z',
        manifest: { requested: [], included: [], omitted: [] },
        sections: {},
      },
    })

    assert.equal(result.content, 'not structured json')
    assert.deepEqual(result.structuredOutputs, ['not structured json'])
  })
})

function intelligenceResult(
  basedOn: ContextScopeReference[] = [
    { domain: 'current-life-state' },
  ],
) {
  return {
    content: 'A grounded response.',
    providerRequestId: 'provider-request-1',
    structuredOutputs: [
      {
        schemaVersion: '1',
        kind: 'intelligence-result',
        summary: 'A grounded summary.',
        statements: [
          {
            classification: 'inference',
            content: 'This is an inference, not a stored fact.',
            basedOn,
          },
          {
            classification: 'suggestion',
            content: 'This is an optional suggestion.',
            basedOn: [{ domain: 'current-life-state' }],
          },
        ],
      },
    ],
  }
}

describe('User-triggered Intelligence Runtime', () => {
  it('assembles deterministic Life State and only request-scoped detail/Continuity', async () => {
    const reads: string[] = []
    const providerRequests: Parameters<IntelligenceProvider['complete']>[0][] = []
    const result = await runUserIntelligence({
      instruction: 'Help with the current request.',
      scope: {
        lifeContinuity: true,
        relationshipContinuity: { relationshipIds: ['person-alex'] },
      },
      permission: {
        allowedDomains: [
          'current-life-state',
          'life-continuity',
          'relationship-continuity',
        ],
        allowedRelationshipIds: ['person-alex'],
      },
      readers: {
        async readCurrentLifeState() {
          reads.push('life-state')
          return ready(usableLifeState, usableLifeState.asOf)
        },
        async readTimeline() {
          reads.push('timeline')
          throw new Error('unrequested reader must not run')
        },
        async readActiveLifeContinuity() {
          reads.push('life-continuity')
          return ready([lifeContinuity('Quiet mornings help me focus.')], null)
        },
        async readActiveRelationshipContinuity(relationshipId) {
          reads.push(`relationship:${relationshipId}`)
          return ready([
            relationshipContinuity(relationshipId, 'Alex prefers short messages.'),
          ], null)
        },
      },
      providers: {
        primary: {
          id: 'riven',
          async complete(request) {
            providerRequests.push(request)
            return intelligenceResult([
              { domain: 'current-life-state' },
              { domain: 'life-continuity' },
              { domain: 'relationship-continuity', relationshipId: 'person-alex' },
            ])
          },
        },
      },
      now: () => '2026-09-10T08:00:00.000Z',
      generateId: () => 'runtime-request-1',
    })

    assert.equal(result.status, 'completed')
    assert.deepEqual(reads, [
      'life-state',
      'life-continuity',
      'relationship:person-alex',
    ])
    const providerRequest = providerRequests[0]
    assert.ok(providerRequest)
    assert.equal(providerRequest?.trigger, 'user')
    assert.equal(
      providerRequest?.context.sections.currentLifeState?.readiness,
      'ready',
    )
    assert.equal(providerRequest?.context.sections.timeline, undefined)
    if (result.status === 'completed') {
      assert.equal(result.providerRole, 'primary')
      assert.deepEqual(
        result.result.statements.map((statement) => statement.classification),
        ['inference', 'suggestion'],
      )
    }
  })

  it('reassembles fallback context without Relationship Continuity', async () => {
    let relationshipReads = 0
    let primarySerialized = ''
    let fallbackSerialized = ''
    let primaryRequestId = ''
    let fallbackRequestId = ''
    const result = await runUserIntelligence({
      instruction: 'Use relevant context.',
      scope: {
        lifeContinuity: true,
        relationshipContinuity: { relationshipIds: ['person-private'] },
      },
      permission: {
        allowedDomains: [
          'current-life-state',
          'life-continuity',
          'relationship-continuity',
        ],
        allowedRelationshipIds: ['person-private'],
      },
      readers: {
        async readCurrentLifeState() {
          return ready(usableLifeState, usableLifeState.asOf)
        },
        async readActiveLifeContinuity() {
          return ready([lifeContinuity('Life context allowed for fallback.')], null)
        },
        async readActiveRelationshipContinuity(relationshipId) {
          relationshipReads += 1
          return ready([
            relationshipContinuity(relationshipId, 'PRIVATE RELATIONSHIP CONTEXT'),
          ], null)
        },
      },
      providers: {
        primary: {
          id: 'riven',
          async complete(request) {
            primarySerialized = JSON.stringify(request.context)
            primaryRequestId = request.requestId
            throw new Error('network unavailable')
          },
        },
        fallback: {
          id: 'fallback-provider',
          async complete(request) {
            fallbackSerialized = JSON.stringify(request.context)
            fallbackRequestId = request.requestId
            return intelligenceResult([{ domain: 'life-continuity' }])
          },
        },
      },
      now: () => '2026-09-10T08:00:00.000Z',
      generateId: (() => {
        let index = 0
        return () => `runtime-request-${++index}`
      })(),
    })

    assert.equal(result.status, 'completed')
    assert.equal(relationshipReads, 1)
    assert.equal(primarySerialized.includes('PRIVATE RELATIONSHIP CONTEXT'), true)
    assert.equal(fallbackSerialized.includes('PRIVATE RELATIONSHIP CONTEXT'), false)
    assert.equal(fallbackSerialized.includes('person-private'), false)
    assert.equal(primaryRequestId, fallbackRequestId)
    if (result.status === 'completed') {
      assert.equal(result.providerRole, 'fallback')
      assert.deepEqual(result.attempts.map((attempt) => attempt.outcome), [
        'unavailable',
        'completed',
      ])
    }
  })

  it('uses the Local-First read adapter without exposing fact mutation methods', async () => {
    const calls = { health: 0, mood: 0, life: 0, relationship: 0, writes: 0 }
    const continuity = {
      async getActiveLife() {
        calls.life += 1
        return [lifeContinuity('Read-only life context.')]
      },
      async getActiveRelationship(relationshipId: string) {
        calls.relationship += 1
        return [relationshipContinuity(relationshipId, 'Read-only relationship context.')]
      },
      async createConfirmed() {
        calls.writes += 1
        throw new Error('must not write')
      },
    }
    const readers = createLocalContextReaders(
      { currentLifeState: ready(usableLifeState, usableLifeState.asOf) },
      {
        timelineSources: {
          health: {
            async getByDateRange() {
              calls.health += 1
              return []
            },
          },
          mood: {
            async getAll() {
              calls.mood += 1
              return []
            },
          },
        },
        continuity,
      },
    )
    const result = await runUserIntelligence({
      instruction: 'Use only the requested range and continuity.',
      scope: {
        timeline: { startDate: '2026-09-09', endDate: '2026-09-10' },
        lifeContinuity: true,
      },
      permission: {
        allowedDomains: ['current-life-state', 'timeline', 'life-continuity'],
        allowedRelationshipIds: [],
      },
      readers,
      providers: {
        primary: {
          id: 'riven',
          async complete() {
            return intelligenceResult([
              { domain: 'current-life-state' },
              { domain: 'timeline' },
              { domain: 'life-continuity' },
            ])
          },
        },
      },
      now: () => '2026-09-10T08:00:00.000Z',
      generateId: () => 'runtime-request-local-readers',
    })

    assert.equal(result.status, 'completed')
    assert.deepEqual(calls, {
      health: 1,
      mood: 1,
      life: 1,
      relationship: 0,
      writes: 0,
    })
  })

  it('degrades without calling a provider when deterministic Life State is not ready', async () => {
    let providerCalls = 0
    const result = await runUserIntelligence({
      instruction: 'Summarize now.',
      scope: {},
      permission: {
        allowedDomains: ['current-life-state'],
        allowedRelationshipIds: [],
      },
      readers: {
        async readCurrentLifeState() {
          return ready(notReadyLifeState, notReadyLifeState.asOf)
        },
      },
      providers: {
        primary: {
          id: 'riven',
          async complete() {
            providerCalls += 1
            return intelligenceResult()
          },
        },
      },
      now: () => '2026-09-10T08:00:00.000Z',
      generateId: () => 'runtime-request-not-ready',
    })

    assert.deepEqual(result, {
      status: 'degraded',
      reason: 'context-not-ready',
      attempts: [],
    })
    assert.equal(providerCalls, 0)
  })

  it('degrades explicitly for provider/network failure', async () => {
    const result = await runUserIntelligence({
      instruction: 'Summarize now.',
      scope: {},
      permission: {
        allowedDomains: ['current-life-state'],
        allowedRelationshipIds: [],
      },
      readers: {
        async readCurrentLifeState() {
          return ready(usableLifeState, usableLifeState.asOf)
        },
      },
      providers: {
        primary: {
          id: 'riven',
          async complete() {
            throw new TypeError('Failed to fetch')
          },
        },
      },
      now: () => '2026-09-10T08:00:00.000Z',
      generateId: () => 'runtime-request-offline',
    })

    assert.deepEqual(result, {
      status: 'degraded',
      reason: 'provider-unavailable',
      attempts: [
        { providerId: 'riven', role: 'primary', outcome: 'unavailable' },
      ],
    })
  })

  it('rejects malformed output and provider claims that inference is a fact', async () => {
    for (const malformed of [
      null,
      {
        content: 'Invalid classification.',
        providerRequestId: null,
        structuredOutputs: [
          {
            schemaVersion: '1',
            kind: 'intelligence-result',
            summary: 'Invalid.',
            statements: [
              {
                classification: 'fact',
                content: 'The provider cannot create a fact.',
                basedOn: [{ domain: 'current-life-state' }],
              },
            ],
          },
        ],
      },
    ]) {
      const result = await runUserIntelligence({
        instruction: 'Summarize now.',
        scope: {},
        permission: {
          allowedDomains: ['current-life-state'],
          allowedRelationshipIds: [],
        },
        readers: {
          async readCurrentLifeState() {
            return ready(usableLifeState, usableLifeState.asOf)
          },
        },
        providers: {
          primary: {
            id: 'riven',
            async complete() {
              return malformed as never
            },
          },
        },
        now: () => '2026-09-10T08:00:00.000Z',
        generateId: () => 'runtime-request-malformed',
      })

      assert.equal(result.status, 'degraded')
      if (result.status === 'degraded') {
        assert.equal(result.reason, 'malformed-provider-response')
      }
    }
  })
})
