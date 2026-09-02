import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { PeriodRecord } from '../types.ts'
import {
  calculateFertileWindow,
  calculateOvulationDate,
  predictNextPeriodDate,
} from './CycleCalculator.ts'

process.env.TZ = 'Asia/Shanghai'

const records: PeriodRecord[] = [
  {
    id: 'period-1',
    startDate: '2026-08-04',
    endDate: '2026-08-08',
    flowLevel: 2,
    symptoms: [],
    note: null,
    createdAt: '2026-08-04T01:00:00.000Z',
    updatedAt: '2026-08-08T01:00:00.000Z',
  },
  {
    id: 'period-2',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    flowLevel: 2,
    symptoms: [],
    note: null,
    createdAt: '2026-09-01T01:00:00.000Z',
    updatedAt: '2026-09-05T01:00:00.000Z',
  },
]

describe('CycleCalculator date-only arithmetic', () => {
  it('在 UTC+8 下不会把预测日期回退一天', () => {
    const nextPeriod = predictNextPeriodDate(records, '2026-09-01')
    const ovulation = calculateOvulationDate(nextPeriod)

    assert.equal(nextPeriod, '2026-09-29')
    assert.equal(ovulation, '2026-09-15')
    assert.deepEqual(calculateFertileWindow(ovulation), {
      start: '2026-09-10',
      end: '2026-09-16',
    })
  })
})
