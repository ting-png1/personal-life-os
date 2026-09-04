import type { ContextAssemblyScope, ContextDomain } from '../../intelligence/types.ts'
import { formatLocalDate, parseLocalDate } from '../../../shared/lib/date.ts'
import type {
  AutomationGovernanceSettings,
  ProactiveDailyReviewGrant,
} from '../types.ts'

type UnknownRecord = Record<string, unknown>

const CONTEXT_DOMAINS: readonly ContextDomain[] = [
  'current-life-state',
  'timeline',
  'personal-baseline',
  'life-continuity',
  'relationship-continuity',
  'conversation',
]
const CONTEXT_SCOPE_KEYS = [
  'currentLifeState',
  'timeline',
  'personalBaseline',
  'lifeContinuity',
  'relationshipContinuity',
  'conversation',
] as const
const OUTPUT_KINDS = [
  'suggestion',
  'continuity-candidate',
  'todo-action-proposal',
] as const
const TODO_ACTIONS = [
  'todo.create',
  'todo.update',
  'todo.set-completion',
] as const
const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

function requiredText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function dateOnly(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return formatLocalDate(parseLocalDate(value)) === value
  } catch {
    return false
  }
}

function positiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function uniqueNonEmptyStrings(values: unknown): boolean {
  return (
    Array.isArray(values) &&
    values.every((value) => typeof value === 'string' && value.trim().length > 0) &&
    new Set(values.map((value) => value.trim())).size === values.length
  )
}

function scopeIsValid(scope: ContextAssemblyScope): boolean {
  const value = scope as unknown as UnknownRecord
  if (!hasOnlyKeys(value, CONTEXT_SCOPE_KEYS) || Object.keys(value).length === 0) {
    return false
  }
  for (const key of ['currentLifeState', 'lifeContinuity', 'conversation'] as const) {
    if (value[key] !== undefined && value[key] !== true) return false
  }
  if (value.timeline !== undefined) {
    if (!isRecord(value.timeline) || !hasOnlyKeys(value.timeline, ['startDate', 'endDate'])) {
      return false
    }
    if (
      !dateOnly(value.timeline.startDate) ||
      !dateOnly(value.timeline.endDate) ||
      value.timeline.endDate < value.timeline.startDate
    ) {
      return false
    }
  }
  if (value.personalBaseline !== undefined) {
    if (
      !isRecord(value.personalBaseline) ||
      !hasOnlyKeys(value.personalBaseline, ['anchorDate']) ||
      !dateOnly(value.personalBaseline.anchorDate)
    ) {
      return false
    }
  }
  if (value.relationshipContinuity !== undefined) {
    const relationshipIds = isRecord(value.relationshipContinuity)
      ? value.relationshipContinuity.relationshipIds
      : null
    if (
      !isRecord(value.relationshipContinuity) ||
      !hasOnlyKeys(value.relationshipContinuity, ['relationshipIds']) ||
      !Array.isArray(relationshipIds) ||
      relationshipIds.length === 0 ||
      !uniqueNonEmptyStrings(relationshipIds)
    ) {
      return false
    }
  }
  return true
}

function proactiveGrantIsValid(value: unknown): value is ProactiveDailyReviewGrant {
  if (!isRecord(value)) return false
  if (
    !hasOnlyKeys(value, [
      'capability',
      'enabled',
      'purpose',
      'contextScope',
      'contextPermission',
      'allowedOutputs',
      'todoProposalPermission',
      'trigger',
      'quietHours',
      'minimumIntervalMinutes',
      'budget',
    ]) ||
    value.capability !== 'daily-review' ||
    value.enabled !== true ||
    !requiredText(value.purpose) ||
    !isRecord(value.contextScope) ||
    !scopeIsValid(value.contextScope as ContextAssemblyScope) ||
    !isRecord(value.contextPermission) ||
    !hasOnlyKeys(value.contextPermission, [
      'allowedDomains',
      'allowedRelationshipIds',
    ]) ||
    !Array.isArray(value.contextPermission.allowedDomains) ||
    !value.contextPermission.allowedDomains.every(
      (domain) =>
        typeof domain === 'string' &&
        CONTEXT_DOMAINS.includes(domain as ContextDomain),
    ) ||
    new Set(value.contextPermission.allowedDomains).size !==
      value.contextPermission.allowedDomains.length ||
    !uniqueNonEmptyStrings(value.contextPermission.allowedRelationshipIds) ||
    !Array.isArray(value.allowedOutputs) ||
    value.allowedOutputs.length === 0 ||
    !value.allowedOutputs.every(
      (kind) =>
        typeof kind === 'string' &&
        OUTPUT_KINDS.includes(kind as (typeof OUTPUT_KINDS)[number]),
    ) ||
    new Set(value.allowedOutputs).size !== value.allowedOutputs.length ||
    !isRecord(value.todoProposalPermission) ||
    !hasOnlyKeys(value.todoProposalPermission, ['allowedActions', 'allowedTodoIds']) ||
    !Array.isArray(value.todoProposalPermission.allowedActions) ||
    !value.todoProposalPermission.allowedActions.every(
      (action) =>
        typeof action === 'string' &&
        TODO_ACTIONS.includes(action as (typeof TODO_ACTIONS)[number]),
    ) ||
    new Set(value.todoProposalPermission.allowedActions).size !==
      value.todoProposalPermission.allowedActions.length ||
    !uniqueNonEmptyStrings(value.todoProposalPermission.allowedTodoIds) ||
    !isRecord(value.trigger) ||
    !hasOnlyKeys(value.trigger, ['localTime']) ||
    typeof value.trigger.localTime !== 'string' ||
    !LOCAL_TIME_PATTERN.test(value.trigger.localTime) ||
    !isRecord(value.quietHours) ||
    !hasOnlyKeys(value.quietHours, ['start', 'end']) ||
    typeof value.quietHours.start !== 'string' ||
    typeof value.quietHours.end !== 'string' ||
    !LOCAL_TIME_PATTERN.test(value.quietHours.start) ||
    !LOCAL_TIME_PATTERN.test(value.quietHours.end) ||
    value.quietHours.start === value.quietHours.end ||
    typeof value.minimumIntervalMinutes !== 'number' ||
    !Number.isInteger(value.minimumIntervalMinutes) ||
    value.minimumIntervalMinutes < 0 ||
    !isRecord(value.budget) ||
    !hasOnlyKeys(value.budget, [
      'maxCallsPerLocalDay',
      'maxContextCharacters',
      'maxOutputTokensPerCall',
      'maxGovernedOutputsPerRun',
    ]) ||
    !positiveInteger(value.budget.maxCallsPerLocalDay) ||
    !positiveInteger(value.budget.maxContextCharacters) ||
    !positiveInteger(value.budget.maxOutputTokensPerCall) ||
    !positiveInteger(value.budget.maxGovernedOutputsPerRun)
  ) {
    return false
  }
  return true
}

function deterministicSettingsAreValid(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'todoOccurrenceReminder',
      'scheduleUpcomingReminder',
    ])
  ) {
    return false
  }
  const todo = value.todoOccurrenceReminder
  if (
    todo !== null &&
    (!isRecord(todo) ||
      !hasOnlyKeys(todo, ['localTime']) ||
      typeof todo.localTime !== 'string' ||
      !LOCAL_TIME_PATTERN.test(todo.localTime))
  ) {
    return false
  }
  const schedule = value.scheduleUpcomingReminder
  if (
    schedule !== null &&
    (!isRecord(schedule) ||
      !hasOnlyKeys(schedule, ['leadMinutes']) ||
      typeof schedule.leadMinutes !== 'number' ||
      !Number.isInteger(schedule.leadMinutes) ||
      schedule.leadMinutes < 0)
  ) {
    return false
  }
  return true
}

export function automationGovernanceIsValid(
  value: unknown,
): value is AutomationGovernanceSettings {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['schemaVersion', 'deterministic', 'proactive']) ||
    value.schemaVersion !== '1' ||
    !deterministicSettingsAreValid(value.deterministic) ||
    !isRecord(value.proactive) ||
    !hasOnlyKeys(value.proactive, ['dailyReview'])
  ) {
    return false
  }
  return (
    value.proactive.dailyReview === null ||
    proactiveGrantIsValid(value.proactive.dailyReview)
  )
}
