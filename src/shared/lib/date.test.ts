import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatLocalDate, moveInstantToLocalDate, toDateStr } from './date.ts'

process.env.TZ = 'Asia/Shanghai'

describe('date boundaries', () => {
  it('date-only 结果使用本地日历而不是 UTC 日期前缀', () => {
    const localMidnight = new Date(2026, 8, 2, 0, 0, 0)

    assert.equal(formatLocalDate(localMidnight), '2026-09-02')
    assert.equal(localMidnight.toISOString().slice(0, 10), '2026-09-01')
  })

  it('把 instant 移到另一本地日期时保留本地墙上时间', () => {
    const source = '2026-08-31T23:30:00.000Z' // Asia/Shanghai: 09-01 07:30
    const moved = moveInstantToLocalDate(source, '2026-09-08')

    assert.equal(toDateStr(moved), '2026-09-08')
    assert.equal(new Date(moved).getHours(), 7)
    assert.equal(new Date(moved).getMinutes(), 30)
  })
})
