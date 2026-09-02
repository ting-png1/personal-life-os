import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ScheduleEvent } from '../types.ts'
import { expandEventsForDate, expandForDate, isEventOnDate } from './ScheduleExpander.ts'
import { getScheduleOverrideValidationError, getScheduleValidationError } from './scheduleValidation.ts'

process.env.TZ = 'Asia/Shanghai'

function recurringEvent(
  overrides: Partial<NonNullable<ScheduleEvent['recurrence']>> = {}
): ScheduleEvent {
  return {
    id: 'schedule-1',
    title: '早课',
    type: 'class',
    location: null,
    note: null,
    startDateTime: '2026-08-31T23:30:00.000Z', // Asia/Shanghai: 09-01 07:30
    endDateTime: '2026-09-01T00:30:00.000Z',
    recurrence: {
      freq: 'weekly',
      daysOfWeek: [2],
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      ...overrides,
    },
    createdAt: '2026-08-30T00:00:00.000Z',
    updatedAt: '2026-08-30T00:00:00.000Z',
  }
}

describe('ScheduleExpander', () => {
  it('在完整 recurrence 日期范围内按周展开，并保留本地时间', () => {
    const event = recurringEvent()

    assert.equal(isEventOnDate(event, '2026-09-08'), true)
    assert.equal(isEventOnDate(event, '2026-10-06'), false)

    const instance = expandForDate(event, '2026-09-08')
    assert.notEqual(instance, null)
    assert.equal(new Date(instance!.startDateTime).getHours(), 7)
    assert.equal(new Date(instance!.endDateTime).getHours(), 8)
  })

  it('默认隐藏取消实例，但管理视图可包含它以提供恢复入口', () => {
    const event = recurringEvent({
      overrides: { '2026-09-08': { cancelled: true } },
    })

    assert.equal(expandEventsForDate([event], '2026-09-08').length, 0)
    assert.equal(expandEventsForDate([event], '2026-09-08', { includeCancelled: true }).length, 1)
  })

  it('一次性事件按本地日期归属，而不是 ISO 的 UTC 日期前缀', () => {
    const event = { ...recurringEvent(), recurrence: null }

    assert.equal(isEventOnDate(event, '2026-09-01'), true)
    assert.equal(isEventOnDate(event, '2026-08-31'), false)
  })
})

describe('schedule validation', () => {
  it('拒绝结束时间不晚于开始时间的 override', () => {
    const event = recurringEvent()
    const error = getScheduleOverrideValidationError(event, '2026-09-08', {
      startDateTime: '2026-09-08T02:00:00.000Z',
      endDateTime: '2026-09-08T01:00:00.000Z',
    })

    assert.equal(error, '调课结束时间必须晚于开始时间')
  })

  it('拒绝倒置的 recurrence 日期范围', () => {
    const event = recurringEvent()
    event.recurrence = {
      ...event.recurrence!,
      startDate: '2026-09-30',
      endDate: '2026-09-01',
    }

    assert.equal(getScheduleValidationError(event), '重复结束日期不能早于开始日期')
  })
})
