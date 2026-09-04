import Dexie from 'dexie'

export type HistoricalLifeOSVersion = 1 | 2 | 3 | 4 | 5 | 6

export const HISTORICAL_TABLE_INTRODUCED_AT = {
  todos: 1,
  scheduleEvents: 1,
  moodRecords: 1,
  periodRecords: 2,
  dailyHealthSummaries: 3,
  continuityItems: 4,
  actionAuditRecords: 5,
} as const satisfies Record<string, HistoricalLifeOSVersion>

export type HistoricalTableName = keyof typeof HISTORICAL_TABLE_INTRODUCED_AT

export interface HistoricalMigrationFixture {
  version: HistoricalLifeOSVersion
  label: string
}

export const HISTORICAL_MIGRATION_FIXTURES: readonly HistoricalMigrationFixture[] = [
  { version: 1, label: 'V1 baseline' },
  { version: 2, label: 'Health pre-version' },
  { version: 3, label: 'Continuity pre-version' },
  { version: 4, label: 'Action pre-version' },
  { version: 5, label: 'Sync pre-version' },
  { version: 6, label: 'current schema' },
]

const V1_ROWS: Record<'todos' | 'scheduleEvents' | 'moodRecords', Record<string, unknown>[]> = {
  todos: [
    {
      id: 'historical-todo-v1',
      title: 'Preserve the V1 Todo',
      description: null,
      dueDate: '2026-08-01',
      priority: 2,
      completed: false,
      completedAt: null,
      createdAt: '2026-07-31T16:00:00.000Z',
      updatedAt: '2026-07-31T16:00:00.000Z',
    },
  ],
  scheduleEvents: [
    {
      id: 'historical-schedule-v1',
      title: 'V1 local event',
      type: 'personal',
      location: null,
      note: 'historical fixture',
      startDateTime: '2026-08-01T09:00:00+08:00',
      endDateTime: '2026-08-01T10:00:00+08:00',
      recurrence: null,
      createdAt: '2026-07-31T16:00:00.000Z',
      updatedAt: '2026-07-31T16:00:00.000Z',
    },
  ],
  moodRecords: [
    {
      id: 'historical-mood-v1',
      date: '2026-08-01',
      level: 4,
      tags: ['steady'],
      note: null,
      createdAt: '2026-08-01T02:00:00.000Z',
      updatedAt: '2026-08-01T02:00:00.000Z',
    },
  ],
}

const PERIOD_V2 = {
  id: 'historical-period-v2',
  startDate: '2026-07-28',
  endDate: '2026-08-01',
  flowLevel: 2,
  symptoms: ['cramp'],
  note: null,
  createdAt: '2026-07-28T01:00:00.000Z',
  updatedAt: '2026-08-01T01:00:00.000Z',
}

function healthMetric(value: Record<string, number>) {
  return {
    status: 'available',
    value,
    source: { id: 'historical-native', label: 'Historical Health' },
    collectedAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T03:00:00.000Z',
  }
}

const HEALTH_V3 = {
  date: '2026-08-01',
  sleep: healthMetric({ durationMinutes: 450 }),
  restingHeartRate: healthMetric({ beatsPerMinute: 60 }),
  heartRateVariability: healthMetric({ milliseconds: 42 }),
  steps: healthMetric({ count: 7200 }),
  activity: healthMetric({ activeMinutes: 38 }),
}

const CONTINUITY_V4 = {
  id: 'historical-continuity-v4',
  continuityType: 'life',
  relationshipId: null,
  content: 'A confirmed historical preference.',
  status: 'active',
  confirmation: {
    method: 'manual',
    confirmedAt: '2026-08-01T04:00:00.000Z',
  },
  evidence: [
    {
      kind: 'user-statement',
      reference: null,
      note: 'historical fixture',
      observedAt: null,
    },
  ],
  lifecycle: [{ type: 'confirmed', at: '2026-08-01T04:00:00.000Z' }],
  supersedesId: null,
  supersededById: null,
  expiredAt: null,
  createdAt: '2026-08-01T04:00:00.000Z',
  updatedAt: '2026-08-01T04:00:00.000Z',
}

const ACTION_AUDIT_V5 = {
  executionId: 'historical-execution-v5',
  proposalId: 'historical-proposal-v5',
  intelligenceRequestId: 'historical-request-v5',
  actionClass: 'data',
  domain: 'todo',
  action: 'todo.create',
  risk: 'medium',
  status: 'started',
  targetTodoId: null,
  confirmationRequired: true,
  confirmedAt: null,
  executedAt: null,
  undoneAt: null,
  events: [
    {
      type: 'started',
      at: '2026-08-01T05:00:00.000Z',
      code: null,
    },
  ],
  createdAt: '2026-08-01T05:00:00.000Z',
  updatedAt: '2026-08-01T05:00:00.000Z',
}

/** Frozen historical declarations: do not replace these with current schema constants. */
export function defineHistoricalSchema(
  database: Dexie,
  throughVersion: HistoricalLifeOSVersion,
  failAtVersion6 = false,
): void {
  database.version(1).stores({
    todos: 'id, dueDate, completed, priority, createdAt',
    scheduleEvents: 'id, type, startDateTime, createdAt',
    moodRecords: 'id, date, createdAt',
  })
  if (throughVersion >= 2) {
    database.version(2).stores({
      periodRecords: 'id, startDate, endDate, createdAt',
    })
  }
  if (throughVersion >= 3) {
    database.version(3).stores({ dailyHealthSummaries: 'date' })
  }
  if (throughVersion >= 4) {
    database.version(4).stores({
      continuityItems:
        'id, continuityType, status, relationshipId, createdAt, updatedAt, supersedesId, supersededById, [continuityType+status], [relationshipId+status]',
    })
  }
  if (throughVersion >= 5) {
    database.version(5).stores({
      actionAuditRecords:
        'executionId, proposalId, intelligenceRequestId, action, status, targetTodoId, createdAt',
    })
  }
  if (throughVersion >= 6) {
    const version = database.version(6).stores({
      syncOutbox:
        'operationId, status, domain, entityId, createdAt, [domain+entityId]',
      syncReplicas: '[domain+entityId], domain, entityId, deleted',
      syncCheckpoints: 'transportId',
      syncAppliedOperations: 'operationId, appliedAt',
      syncRejectedOperations:
        'rejectionId, operationId, transportId, rejectedAt',
      syncDeviceState: 'id',
    })
    if (failAtVersion6) {
      version.upgrade(() => {
        throw new Error('simulated v6 migration failure')
      })
    }
  }
}

export function historicalRowsForVersion(
  version: HistoricalLifeOSVersion,
): Partial<Record<HistoricalTableName, Record<string, unknown>[]>> {
  const rows: Partial<Record<HistoricalTableName, Record<string, unknown>[]>> = {
    todos: V1_ROWS.todos,
    scheduleEvents: V1_ROWS.scheduleEvents,
    moodRecords: V1_ROWS.moodRecords,
  }
  if (version >= 2) rows.periodRecords = [PERIOD_V2]
  if (version >= 3) rows.dailyHealthSummaries = [HEALTH_V3]
  if (version >= 4) rows.continuityItems = [CONTINUITY_V4]
  if (version >= 5) rows.actionAuditRecords = [ACTION_AUDIT_V5]
  return JSON.parse(JSON.stringify(rows)) as Partial<
    Record<HistoricalTableName, Record<string, unknown>[]>
  >
}

export function currentProbeRow(
  table: HistoricalTableName,
  suffix: string,
): Record<string, unknown> {
  const rows = historicalRowsForVersion(5)
  const source = rows[table]?.[0]
  if (!source) throw new Error(`Missing current probe fixture for ${table}`)
  const result = JSON.parse(JSON.stringify(source)) as Record<string, unknown>
  if (table === 'dailyHealthSummaries') result.date = `2099-01-${suffix}`
  else if (table === 'actionAuditRecords') result.executionId = `probe-execution-${suffix}`
  else result.id = `probe-${table}-${suffix}`
  return result
}
