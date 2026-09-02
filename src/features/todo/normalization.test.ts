import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeTodo } from './normalization.ts'
import type { Todo } from './types.ts'

const baseTodo = {
  id: 'legacy-todo',
  title: '旧待办',
  description: null,
  dueDate: '2026-09-01',
  priority: 2 as const,
  completed: false,
  completedAt: null,
  createdAt: '2026-08-30T01:00:00.000Z',
  updatedAt: '2026-08-30T01:00:00.000Z',
}

describe('normalizeTodo', () => {
  it('为旧记录补齐新增字段，且不改变原对象', () => {
    const normalized = normalizeTodo(baseTodo)

    assert.equal(normalized.category, null)
    assert.equal(normalized.recurrence, 'none')
    assert.equal(normalized.recurrenceStartDate, null)
    assert.equal(normalized.recurrenceEndDate, null)
    assert.deepEqual(normalized.completedDates, [])
    assert.equal('recurrence' in baseTodo, false)
  })

  it('保留有效的新字段并过滤非字符串完成日期', () => {
    const current = {
      ...baseTodo,
      category: '学习',
      recurrence: 'daily' as const,
      recurrenceStartDate: '2026-09-02',
      recurrenceEndDate: '2026-09-30',
      completedDates: ['2026-09-01', 123],
    } as unknown as Todo

    const normalized = normalizeTodo(current)
    assert.equal(normalized.category, '学习')
    assert.equal(normalized.recurrence, 'daily')
    assert.equal(normalized.recurrenceStartDate, '2026-09-02')
    assert.equal(normalized.recurrenceEndDate, '2026-09-30')
    assert.deepEqual(normalized.completedDates, ['2026-09-01'])
  })

  it('不把旧 dueDate 或 createdAt 自动写成正式重复起点', () => {
    const normalized = normalizeTodo({
      ...baseTodo,
      recurrence: 'weekly',
      completedDates: [],
    })

    assert.equal(normalized.recurrenceStartDate, null)
    assert.equal(normalized.dueDate, '2026-09-01')
  })
})
