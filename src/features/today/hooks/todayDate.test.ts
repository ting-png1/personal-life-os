import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { millisecondsUntilNextLocalDate } from './todayDate.ts'

process.env.TZ = 'Asia/Shanghai'

describe('millisecondsUntilNextLocalDate', () => {
  it('在午夜前安排下一次本地日期刷新', () => {
    const now = new Date(2026, 8, 1, 23, 59, 59, 900)
    assert.equal(millisecondsUntilNextLocalDate(now), 150)
  })

  it('中午时等待到次日本地午夜，而不是 UTC 午夜', () => {
    const now = new Date(2026, 8, 1, 12, 0, 0, 0)
    assert.equal(millisecondsUntilNextLocalDate(now), 12 * 60 * 60 * 1000 + 50)
  })
})
