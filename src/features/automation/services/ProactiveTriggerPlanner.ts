import {
  addDays,
  formatLocalDate,
  parseLocalDate,
  toDateStr,
} from '../../../shared/lib/date.ts'
import type {
  AutomationGovernanceSettings,
  ProactiveTrigger,
} from '../types.ts'
import { automationGovernanceIsValid } from './AutomationGovernance.ts'

export function proactiveTriggerId(localDate: string, localTime: string): string {
  return `proactive:daily-review:${localDate}:${localTime}`
}

/** Pure planner only; the host decides how to wake and deliver these triggers. */
export function planDailyReviewTriggers(
  settings: AutomationGovernanceSettings,
  window: { startAt: string; endAt: string },
): ProactiveTrigger[] {
  if (!automationGovernanceIsValid(settings)) {
    throw new Error('Invalid automation governance settings')
  }
  const grant = settings.proactive.dailyReview
  if (!grant) return []
  if (
    !Number.isFinite(Date.parse(window.startAt)) ||
    !Number.isFinite(Date.parse(window.endAt)) ||
    Date.parse(window.endAt) <= Date.parse(window.startAt)
  ) {
    throw new Error('proactive trigger window is invalid')
  }

  const triggers: ProactiveTrigger[] = []
  const endDate = toDateStr(window.endAt)
  for (
    let cursor = parseLocalDate(toDateStr(window.startAt));
    formatLocalDate(cursor) <= endDate;
    cursor = addDays(cursor, 1)
  ) {
    const localDate = formatLocalDate(cursor)
    const occurredAt = new Date(
      `${localDate}T${grant.trigger.localTime}:00`,
    ).toISOString()
    if (
      Date.parse(occurredAt) < Date.parse(window.startAt) ||
      Date.parse(occurredAt) >= Date.parse(window.endAt)
    ) {
      continue
    }
    triggers.push({
      id: proactiveTriggerId(localDate, grant.trigger.localTime),
      capability: 'daily-review',
      kind: 'scheduled-review',
      localDate,
      occurredAt,
    })
  }
  return triggers
}
