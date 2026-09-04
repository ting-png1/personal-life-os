import {
  addDays,
  formatLocalDate,
  parseLocalDate,
  toDateStr,
} from '../../../shared/lib/date.ts'
import { expandEventsForDate } from '../../schedule/services/ScheduleExpander.ts'
import type { ScheduleEvent } from '../../schedule/types.ts'
import {
  isTodoCompletedOnDate,
  isTodoOnDate,
} from '../../todo/services/todoServices.ts'
import type { Todo } from '../../todo/types.ts'
import type {
  DeterministicAutomationInput,
  DeterministicTrigger,
} from '../types.ts'

const LOCAL_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function validInstant(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}

function localDateTime(date: string, time: string): string {
  if (!LOCAL_TIME_PATTERN.test(time)) {
    throw new Error('todo reminder localTime must use HH:mm')
  }
  const instant = new Date(`${date}T${time}:00`)
  if (!Number.isFinite(instant.getTime())) {
    throw new Error('todo reminder date/time is invalid')
  }
  return instant.toISOString()
}

function datesInWindow(
  startAt: string,
  endAt: string,
  lookAheadMinutes = 0,
): string[] {
  if (!validInstant(startAt) || !validInstant(endAt)) {
    throw new Error('automation window must contain valid timestamps')
  }
  if (Date.parse(endAt) <= Date.parse(startAt)) {
    throw new Error('automation window endAt must be after startAt')
  }

  const dates: string[] = []
  const endDate = toDateStr(
    new Date(Date.parse(endAt) + lookAheadMinutes * 60_000).toISOString(),
  )
  for (
    let cursor = parseLocalDate(toDateStr(startAt));
    formatLocalDate(cursor) <= endDate;
    cursor = addDays(cursor, 1)
  ) {
    dates.push(formatLocalDate(cursor))
  }
  return dates
}

function isInWindow(triggerAt: string, startAt: string, endAt: string): boolean {
  const value = Date.parse(triggerAt)
  return value >= Date.parse(startAt) && value < Date.parse(endAt)
}

/**
 * Derives ephemeral reminder intents from current facts. Stable IDs let a host
 * scheduler deduplicate delivery without storing a second copy of Todo/Schedule.
 */
export function planDeterministicTriggers(
  facts: { todos: Todo[]; scheduleEvents: ScheduleEvent[] },
  input: DeterministicAutomationInput,
): DeterministicTrigger[] {
  const dates = datesInWindow(input.window.startAt, input.window.endAt)
  const triggers = new Map<string, DeterministicTrigger>()

  const todoRule = input.settings.todoOccurrenceReminder
  if (todoRule) {
    for (const date of dates) {
      for (const todo of facts.todos) {
        if (!isTodoOnDate(todo, date)) continue
        const completed =
          todo.recurrence === 'none'
            ? todo.completed
            : isTodoCompletedOnDate(todo, date)
        if (completed) continue

        const triggerAt = localDateTime(date, todoRule.localTime)
        if (!isInWindow(triggerAt, input.window.startAt, input.window.endAt)) continue
        const id = `todo-occurrence:${encodeURIComponent(todo.id)}:${date}:${todoRule.localTime}`
        triggers.set(id, {
          id,
          kind: 'todo-occurrence-reminder',
          triggerAt,
          fact: {
            domain: 'todo',
            id: todo.id,
            occurrenceDate: date,
            sourceUpdatedAt: todo.updatedAt,
          },
        })
      }
    }
  }

  const scheduleRule = input.settings.scheduleUpcomingReminder
  if (scheduleRule) {
    if (
      !Number.isInteger(scheduleRule.leadMinutes) ||
      scheduleRule.leadMinutes < 0
    ) {
      throw new Error('schedule reminder leadMinutes must be a non-negative integer')
    }
    const scheduleDates = datesInWindow(
      input.window.startAt,
      input.window.endAt,
      scheduleRule.leadMinutes,
    )
    for (const date of scheduleDates) {
      for (const instance of expandEventsForDate(facts.scheduleEvents, date)) {
        const source = facts.scheduleEvents.find(
          (event) => event.id === instance.eventId,
        )!
        const triggerAt = new Date(
          Date.parse(instance.startDateTime) - scheduleRule.leadMinutes * 60_000,
        ).toISOString()
        if (!isInWindow(triggerAt, input.window.startAt, input.window.endAt)) continue
        const id = `schedule-occurrence:${encodeURIComponent(instance.eventId)}:${encodeURIComponent(instance.startDateTime)}:${scheduleRule.leadMinutes}`
        triggers.set(id, {
          id,
          kind: 'schedule-upcoming-reminder',
          triggerAt,
          fact: {
            domain: 'schedule',
            id: instance.eventId,
            occurrenceDate: date,
            sourceUpdatedAt: source.updatedAt,
          },
        })
      }
    }
  }

  return [...triggers.values()].sort(
    (left, right) =>
      left.triggerAt.localeCompare(right.triggerAt) || left.id.localeCompare(right.id),
  )
}
