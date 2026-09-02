import { moveInstantToLocalDate } from '../../../shared/lib/date.ts'
import type { RecurrenceRule, ScheduleEvent, ScheduleOverride } from '../types.ts'

type ScheduleTiming = Pick<ScheduleEvent, 'startDateTime' | 'endDateTime' | 'recurrence'>

function isValidInstantRange(startDateTime: string, endDateTime: string): boolean {
  const start = new Date(startDateTime).getTime()
  const end = new Date(endDateTime).getTime()
  return Number.isFinite(start) && Number.isFinite(end) && end > start
}

export function getScheduleOverrideValidationError(
  event: Pick<ScheduleEvent, 'startDateTime' | 'endDateTime'>,
  occurrenceDate: string,
  override: ScheduleOverride
): string | null {
  if (override.cancelled) return null
  if (!override.startDateTime && !override.endDateTime) return null

  const effectiveStart = moveInstantToLocalDate(
    override.startDateTime ?? event.startDateTime,
    occurrenceDate
  )
  const effectiveEnd = moveInstantToLocalDate(
    override.endDateTime ?? event.endDateTime,
    occurrenceDate
  )

  return isValidInstantRange(effectiveStart, effectiveEnd)
    ? null
    : '调课结束时间必须晚于开始时间'
}

function getRecurrenceValidationError(
  event: Pick<ScheduleEvent, 'startDateTime' | 'endDateTime'>,
  recurrence: RecurrenceRule
): string | null {
  if (recurrence.endDate < recurrence.startDate) {
    return '重复结束日期不能早于开始日期'
  }

  for (const [date, override] of Object.entries(recurrence.overrides ?? {})) {
    const error = getScheduleOverrideValidationError(event, date, override)
    if (error) return error
  }

  return null
}

/** Repository 写入前的统一 Domain 校验。 */
export function getScheduleValidationError(event: ScheduleTiming): string | null {
  if (!isValidInstantRange(event.startDateTime, event.endDateTime)) {
    return 'endDateTime 必须晚于 startDateTime'
  }
  return event.recurrence
    ? getRecurrenceValidationError(event, event.recurrence)
    : null
}
