import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ScheduleEvent } from '../schedule/types.ts'
import type { Todo } from '../todo/types.ts'
import type {
  ContextReaders,
  IntelligenceProvider,
} from '../intelligence/types.ts'
import { planDeterministicTriggers } from './services/DeterministicTriggerPlanner.ts'
import { runProactiveAutomation } from './services/ProactiveAutomation.ts'
import { LocalProactiveUsageLedger } from './services/ProactiveUsageLedger.ts'
import { planDailyReviewTriggers } from './services/ProactiveTriggerPlanner.ts'
import { LocalAutomationSettingsRepository } from './settingsRepository.ts'
import type {
  AutomationGovernanceSettings,
  ProactiveDailyReviewGrant,
  ProactiveTrigger,
} from './types.ts'

process.env.TZ = 'Asia/Shanghai'

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    title: 'Due Todo',
    description: null,
    dueDate: '2026-09-05',
    recurrenceStartDate: null,
    recurrenceEndDate: null,
    priority: 2,
    category: null,
    recurrence: 'none',
    completedDates: [],
    completed: false,
    completedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-04T08:00:00.000Z',
    ...overrides,
  }
}

function schedule(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: 'schedule-1',
    title: 'Morning event',
    type: 'personal',
    location: null,
    note: null,
    startDateTime: '2026-09-05T02:00:00.000Z',
    endDateTime: '2026-09-05T03:00:00.000Z',
    recurrence: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-04T09:00:00.000Z',
    ...overrides,
  }
}

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

function trigger(
  occurredAt = '2026-09-05T03:59:00.000Z',
): ProactiveTrigger {
  const localDate = '2026-09-05'
  const localTime = occurredAt === '2026-09-05T15:29:00.000Z' ? '23:29' : '11:59'
  return {
    id: `proactive:daily-review:${localDate}:${localTime}`,
    capability: 'daily-review',
    kind: 'scheduled-review',
    localDate,
    occurredAt,
  }
}

function grant(
  overrides: Partial<ProactiveDailyReviewGrant> = {},
): ProactiveDailyReviewGrant {
  return {
    capability: 'daily-review',
    enabled: true,
    purpose: 'Review today and surface only useful next steps',
    contextScope: { conversation: true },
    contextPermission: {
      allowedDomains: ['conversation'],
      allowedRelationshipIds: [],
    },
    allowedOutputs: [
      'suggestion',
      'continuity-candidate',
      'todo-action-proposal',
    ],
    todoProposalPermission: {
      allowedActions: ['todo.set-completion'],
      allowedTodoIds: ['todo-1'],
    },
    trigger: { localTime: '11:59' },
    quietHours: { start: '22:00', end: '08:00' },
    minimumIntervalMinutes: 60,
    budget: {
      maxCallsPerLocalDay: 2,
      maxContextCharacters: 10_000,
      maxOutputTokensPerCall: 500,
      maxGovernedOutputsPerRun: 5,
    },
    ...overrides,
  }
}

function settings(
  dailyReview: ProactiveDailyReviewGrant | null,
): AutomationGovernanceSettings {
  return {
    schemaVersion: '1',
    deterministic: {
      todoOccurrenceReminder: null,
      scheduleUpcomingReminder: null,
    },
    proactive: { dailyReview },
  }
}

function readyConversationReaders(onRead?: () => void): ContextReaders {
  return {
    async readConversation() {
      onRead?.()
      return {
        readiness: 'ready',
        value: {
          conversationId: 'conversation-1',
          turns: [
            {
              id: 'turn-1',
              role: 'user',
              content: 'I prefer quiet mornings. Please help with today.',
              createdAt: '2026-09-05T03:58:00.000Z',
            },
          ],
        },
        sourceUpdatedAt: '2026-09-05T03:58:00.000Z',
      } as const
    },
  }
}

function ids(): () => string {
  let index = 0
  return () => `host-id-${++index}`
}

describe('Deterministic Automation planner', () => {
  it('从 Todo occurrence 与 Schedule instance 派生稳定 reminder intents', () => {
    const facts = {
      todos: [
        todo(),
        todo({ id: 'todo-completed', completed: true }),
        todo({
          id: 'todo-daily',
          dueDate: null,
          recurrence: 'daily',
          recurrenceStartDate: '2026-09-01',
        }),
        todo({
          id: 'todo-daily-completed',
          dueDate: null,
          recurrence: 'daily',
          recurrenceStartDate: '2026-09-01',
          completedDates: ['2026-09-05'],
        }),
      ],
      scheduleEvents: [
        schedule(),
        schedule({
          id: 'schedule-cancelled',
          recurrence: {
            freq: 'weekly',
            daysOfWeek: [6],
            startDate: '2026-09-05',
            endDate: '2026-09-05',
            overrides: { '2026-09-05': { cancelled: true } },
          },
        }),
      ],
    }
    const input = {
      window: {
        startAt: '2026-09-04T16:00:00.000Z',
        endAt: '2026-09-05T16:00:00.000Z',
      },
      settings: {
        todoOccurrenceReminder: { localTime: '09:00' },
        scheduleUpcomingReminder: { leadMinutes: 15 },
      },
    }

    const planned = planDeterministicTriggers(facts, input)

    assert.deepEqual(
      planned.map((item) => [item.kind, item.fact.id, item.triggerAt]),
      [
        ['todo-occurrence-reminder', 'todo-1', '2026-09-05T01:00:00.000Z'],
        ['todo-occurrence-reminder', 'todo-daily', '2026-09-05T01:00:00.000Z'],
        ['schedule-upcoming-reminder', 'schedule-1', '2026-09-05T01:45:00.000Z'],
      ],
    )
    assert.deepEqual(planDeterministicTriggers(facts, input), planned)
  })

  it('未明确配置的规则不运行，并拒绝非法时间边界', () => {
    assert.deepEqual(
      planDeterministicTriggers(
        { todos: [todo()], scheduleEvents: [schedule()] },
        {
          window: {
            startAt: '2026-09-04T16:00:00.000Z',
            endAt: '2026-09-05T16:00:00.000Z',
          },
          settings: {
            todoOccurrenceReminder: null,
            scheduleUpcomingReminder: null,
          },
        },
      ),
      [],
    )
    assert.throws(
      () =>
        planDeterministicTriggers(
          { todos: [], scheduleEvents: [] },
          {
            window: {
              startAt: '2026-09-05T16:00:00.000Z',
              endAt: '2026-09-04T16:00:00.000Z',
            },
            settings: {
              todoOccurrenceReminder: { localTime: '25:00' },
              scheduleUpcomingReminder: null,
            },
          },
        ),
      /endAt must be after/,
    )
    assert.throws(
      () =>
        planDeterministicTriggers(
          { todos: [todo()], scheduleEvents: [] },
          {
            window: {
              startAt: '2026-09-04T16:00:00.000Z',
              endAt: '2026-09-05T16:00:00.000Z',
            },
            settings: {
              todoOccurrenceReminder: { localTime: '25:00' },
              scheduleUpcomingReminder: null,
            },
          },
        ),
      /localTime must use HH:mm/,
    )
  })

  it('日程提前量跨日时仍覆盖窗口内的 reminder trigger', () => {
    const planned = planDeterministicTriggers(
      {
        todos: [],
        scheduleEvents: [
          schedule({
            id: 'schedule-after-midnight',
            startDateTime: '2026-09-05T16:05:00.000Z',
            endDateTime: '2026-09-05T17:00:00.000Z',
          }),
        ],
      },
      {
        window: {
          startAt: '2026-09-05T15:30:00.000Z',
          endAt: '2026-09-05T16:00:00.000Z',
        },
        settings: {
          todoOccurrenceReminder: null,
          scheduleUpcomingReminder: { leadMinutes: 15 },
        },
      },
    )

    assert.equal(planned.length, 1)
    assert.equal(planned[0].triggerAt, '2026-09-05T15:50:00.000Z')
  })
})

describe('Proactive governance and usage ledger', () => {
  it('显式 opt-in 后才按用户设置的本地时间派生稳定 proactive trigger', () => {
    const window = {
      startAt: '2026-09-04T16:00:00.000Z',
      endAt: '2026-09-05T16:00:00.000Z',
    }
    assert.deepEqual(planDailyReviewTriggers(settings(null), window), [])

    const planned = planDailyReviewTriggers(settings(grant()), window)
    assert.deepEqual(planned, [
      {
        id: 'proactive:daily-review:2026-09-05:11:59',
        capability: 'daily-review',
        kind: 'scheduled-review',
        localDate: '2026-09-05',
        occurredAt: '2026-09-05T03:59:00.000Z',
      },
    ])
  })

  it('Automation settings 默认全关、只持久化通过校验的显式 opt-in', () => {
    const storage = new MemoryStorage()
    const repository = new LocalAutomationSettingsRepository(storage)

    assert.equal(repository.load().proactive.dailyReview, null)
    const configured = settings(grant())
    assert.deepEqual(repository.save(configured), configured)
    assert.deepEqual(repository.load(), configured)
    assert.throws(
      () =>
        repository.save({
          ...configured,
          proactive: {
            dailyReview: {
              ...grant(),
              quietHours: { start: '22:00', end: '22:00' },
            },
          },
        }),
      /Invalid automation governance settings/,
    )
    storage.setItem('lifeos_automation_governance_v1', '{broken-json')
    assert.equal(repository.load().proactive.dailyReview, null)
  })

  it('默认无 opt-in 时不读取 Context、不占预算、不调用 Provider', async () => {
    let callCount = 0
    const provider: IntelligenceProvider = {
      id: 'must-not-run',
      async complete() {
        callCount += 1
        throw new Error('must not run')
      },
    }
    const result = await runProactiveAutomation({
      trigger: trigger(),
      settings: settings(null),
      readers: readyConversationReaders(() => {
        callCount += 1
      }),
      provider,
      usage: {
        async reserve() {
          callCount += 1
          throw new Error('must not reserve')
        },
      },
      now: () => '2026-09-05T04:00:00.000Z',
      generateId: ids(),
    })

    assert.deepEqual(result, { status: 'skipped', reason: 'not-opted-in' })
    assert.equal(callCount, 0)
  })

  it('静默时段发生在 Context 与 Provider 之前', async () => {
    let sideEffects = 0
    const result = await runProactiveAutomation({
      trigger: trigger('2026-09-05T15:29:00.000Z'),
      settings: settings(grant({ trigger: { localTime: '23:29' } })),
      readers: readyConversationReaders(() => {
        sideEffects += 1
      }),
      provider: {
        id: 'must-not-run',
        async complete() {
          sideEffects += 1
          return { content: 'unexpected', providerRequestId: null }
        },
      },
      usage: {
        async reserve() {
          sideEffects += 1
          return {
            allowed: true,
            usage: {
              capability: 'daily-review',
              localDate: '2026-09-05',
              attemptCount: 1,
              lastAttemptAt: '2026-09-05T15:30:00.000Z',
            },
          }
        },
      },
      now: () => '2026-09-05T15:30:00.000Z',
      generateId: ids(),
    })

    assert.deepEqual(result, { status: 'skipped', reason: 'quiet-hours' })
    assert.equal(sideEffects, 0)
  })

  it('本地单运行时 ledger 门禁最小间隔与每日调用上限，并按本地日期重置', async () => {
    const ledger = new LocalProactiveUsageLedger(new MemoryStorage())
    const base = {
      capability: 'daily-review' as const,
      localDate: '2026-09-05',
      minimumIntervalMinutes: 60,
      maxCallsPerLocalDay: 2,
    }

    assert.equal(
      (await ledger.reserve({
        ...base,
        attemptedAt: '2026-09-05T04:00:00.000Z',
      })).allowed,
      true,
    )
    const tooSoon = await ledger.reserve({
      ...base,
      attemptedAt: '2026-09-05T04:30:00.000Z',
    })
    assert.equal(tooSoon.allowed, false)
    if (!tooSoon.allowed) assert.equal(tooSoon.reason, 'frequency-limit')
    assert.equal(
      (await ledger.reserve({
        ...base,
        attemptedAt: '2026-09-05T05:01:00.000Z',
      })).allowed,
      true,
    )
    const exhausted = await ledger.reserve({
      ...base,
      attemptedAt: '2026-09-05T07:00:00.000Z',
    })
    assert.equal(exhausted.allowed, false)
    if (!exhausted.allowed) assert.equal(exhausted.reason, 'daily-call-budget')
    assert.equal(
      (await ledger.reserve({
        ...base,
        localDate: '2026-09-06',
        attemptedAt: '2026-09-06T04:00:00.000Z',
      })).allowed,
      true,
    )
  })
})

describe('Opt-in Proactive Intelligence pipeline', () => {
  it('只组装授权 Context，并将 provider outputs 收敛为受治理结果', async () => {
    const capturedRequests: Parameters<IntelligenceProvider['complete']>[0][] = []
    let unauthorizedReadCount = 0
    const provider: IntelligenceProvider = {
      id: 'replaceable-provider',
      async complete(request) {
        capturedRequests.push(request)
        return {
          content: 'Review complete.',
          providerRequestId: 'provider-request-1',
          structuredOutputs: [
            {
              kind: 'suggestion',
              title: 'Start gently',
              body: 'Choose one small task first.',
            },
            {
              kind: 'continuity-candidate',
              draft: {
                continuityType: 'life',
                content: 'I prefer quiet mornings.',
                sources: [{ domain: 'conversation' }],
              },
            },
            {
              kind: 'todo-action-proposal',
              draft: {
                action: 'todo.set-completion',
                reason: 'The user said this is complete.',
                payload: {
                  todoId: 'todo-1',
                  date: '2026-09-05',
                  completed: true,
                },
              },
            },
            {
              kind: 'todo-action-proposal',
              draft: {
                action: 'todo.update',
                reason: 'Unauthorized target',
                payload: { todoId: 'todo-private', patch: { title: 'Changed' } },
              },
            },
            { kind: 'unknown-output', content: 'invalid' },
            {
              kind: 'suggestion',
              title: 'Beyond limit',
              body: 'This must not pass the per-run output cap.',
            },
          ],
        }
      },
    }
    const readers: ContextReaders = {
      ...readyConversationReaders(),
      async readActiveLifeContinuity() {
        unauthorizedReadCount += 1
        throw new Error('must not read unauthorized domain')
      },
    }
    const result = await runProactiveAutomation({
      trigger: trigger(),
      settings: settings(grant()),
      readers,
      provider,
      usage: new LocalProactiveUsageLedger(new MemoryStorage()),
      now: () => '2026-09-05T04:00:00.000Z',
      generateId: ids(),
    })

    assert.equal(result.status, 'completed')
    if (result.status !== 'completed') return
    const capturedRequest = capturedRequests[0]
    assert.equal(unauthorizedReadCount, 0)
    assert.equal(capturedRequest?.trigger, 'proactive')
    assert.deepEqual(capturedRequest?.context.manifest.included, [
      { domain: 'conversation' },
    ])
    assert.equal(capturedRequest?.limits?.maxOutputTokens, 500)
    assert.deepEqual(
      result.outputs.map((output) => output.kind),
      ['suggestion', 'continuity-candidate', 'todo-action-proposal'],
    )
    const candidate = result.outputs.find(
      (output) => output.kind === 'continuity-candidate',
    )
    assert.equal(candidate?.kind, 'continuity-candidate')
    if (candidate?.kind === 'continuity-candidate') {
      assert.equal(candidate.candidate.trigger, 'proactive')
      assert.equal(candidate.candidate.status, 'awaiting-confirmation')
    }
    const action = result.outputs.find(
      (output) => output.kind === 'todo-action-proposal',
    )
    assert.equal(action?.kind, 'todo-action-proposal')
    if (action?.kind === 'todo-action-proposal') {
      assert.equal(action.proposal.trigger, 'proactive')
      assert.equal(action.proposal.confirmationRequired, true)
    }
    assert.deepEqual(result.rejectedOutputs, [
      { index: 3, code: 'output-not-authorized' },
      { index: 4, code: 'invalid-output' },
      { index: 5, code: 'output-limit' },
    ])
  })

  it('not-ready、Context 成本上限与 Provider 失败均静默降级且不影响确定性规则', async () => {
    let providerCalls = 0
    const notReady = await runProactiveAutomation({
      trigger: trigger(),
      settings: settings(grant()),
      readers: {
        async readConversation() {
          return {
            readiness: 'not-ready',
            value: null,
            sourceUpdatedAt: null,
          }
        },
      },
      provider: {
        id: 'unavailable',
        async complete() {
          providerCalls += 1
          throw new Error('offline')
        },
      },
      usage: new LocalProactiveUsageLedger(new MemoryStorage()),
      now: () => '2026-09-05T04:00:00.000Z',
      generateId: ids(),
    })
    assert.deepEqual(notReady, {
      status: 'skipped',
      reason: 'context-not-ready',
    })

    const overBudget = await runProactiveAutomation({
      trigger: trigger(),
      settings: settings(
        grant({
          budget: {
            ...grant().budget,
            maxContextCharacters: 10,
          },
        }),
      ),
      readers: readyConversationReaders(),
      provider: {
        id: 'must-not-run',
        async complete() {
          providerCalls += 1
          throw new Error('must not run')
        },
      },
      usage: new LocalProactiveUsageLedger(new MemoryStorage()),
      now: () => '2026-09-05T04:00:00.000Z',
      generateId: ids(),
    })
    assert.deepEqual(overBudget, {
      status: 'skipped',
      reason: 'context-cost-budget',
    })

    const providerUnavailable = await runProactiveAutomation({
      trigger: trigger(),
      settings: settings(grant()),
      readers: readyConversationReaders(),
      provider: {
        id: 'offline-provider',
        async complete() {
          providerCalls += 1
          throw new Error('offline')
        },
      },
      usage: new LocalProactiveUsageLedger(new MemoryStorage()),
      now: () => '2026-09-05T04:00:00.000Z',
      generateId: ids(),
    })
    assert.deepEqual(providerUnavailable, {
      status: 'degraded',
      reason: 'provider-unavailable',
    })
    assert.equal(providerCalls, 1)

    const deterministic = planDeterministicTriggers(
      { todos: [todo()], scheduleEvents: [] },
      {
        window: {
          startAt: '2026-09-04T16:00:00.000Z',
          endAt: '2026-09-05T16:00:00.000Z',
        },
        settings: {
          todoOccurrenceReminder: { localTime: '09:00' },
          scheduleUpcomingReminder: null,
        },
      },
    )
    assert.equal(deterministic.length, 1)
  })
})
