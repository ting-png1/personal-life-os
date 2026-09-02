import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Todo } from '../types.ts'
import {
  canToggleTodoOnDate,
  getCanonicalTodoScheduleFields,
  isTodoCompletedOnDate,
  isTodoOnDate,
  resolveRecurrenceStartDate,
} from './todoServices.ts'

process.env.TZ = 'Asia/Shanghai'

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    title: '复习',
    description: null,
    dueDate: null,
    recurrenceStartDate: '2026-09-01',
    recurrenceEndDate: null,
    priority: 2,
    category: null,
    recurrence: 'daily',
    completedDates: [],
    completed: false,
    completedAt: null,
    createdAt: '2026-08-30T01:00:00.000Z',
    updatedAt: '2026-08-30T01:00:00.000Z',
    ...overrides,
  }
}

describe('Todo recurrence start resolution', () => {
  it('优先使用正式 recurrenceStartDate，并忽略旧 dueDate', () => {
    const task = todo({
      recurrenceStartDate: '2026-09-05',
      dueDate: '2026-09-01',
    })

    assert.deepEqual(resolveRecurrenceStartDate(task), {
      date: '2026-09-05',
      source: 'canonical',
    })
    assert.equal(isTodoOnDate(task, '2026-09-04'), false)
    assert.equal(isTodoOnDate(task, '2026-09-05'), true)
  })

  it('兼容使用旧 dueDate，但不把它标记成正式字段', () => {
    const task = todo({ recurrenceStartDate: null, dueDate: '2026-09-02' })

    assert.deepEqual(resolveRecurrenceStartDate(task), {
      date: '2026-09-02',
      source: 'legacyDueDate',
    })
    assert.equal(task.recurrenceStartDate, null)
  })

  it('仅在运行时用 createdAt 的本地日期兜底', () => {
    const task = todo({
      recurrenceStartDate: null,
      dueDate: null,
      createdAt: '2026-09-03T01:00:00.000Z',
    })

    assert.deepEqual(resolveRecurrenceStartDate(task), {
      date: '2026-09-03',
      source: 'createdAtFallback',
    })
    assert.equal(task.recurrenceStartDate, null)
  })
})

describe('Todo recurrence instances and completion guard', () => {
  it('weekly 只在起点之后的同一星期出现', () => {
    const task = todo({ recurrence: 'weekly', recurrenceStartDate: '2026-09-01' })

    assert.equal(isTodoOnDate(task, '2026-08-25'), false)
    assert.equal(isTodoOnDate(task, '2026-09-02'), false)
    assert.equal(isTodoOnDate(task, '2026-09-08'), true)
    assert.equal(canToggleTodoOnDate(task, '2026-09-02'), false)
    assert.equal(canToggleTodoOnDate(task, '2026-09-08'), true)
  })

  it('只在可选重复终点以内生成实例，终点当天仍有效', () => {
    const task = todo({
      recurrence: 'daily',
      recurrenceStartDate: '2026-09-01',
      recurrenceEndDate: '2026-09-03',
    })

    assert.equal(isTodoOnDate(task, '2026-09-03'), true)
    assert.equal(isTodoOnDate(task, '2026-09-04'), false)
    assert.equal(canToggleTodoOnDate(task, '2026-09-04'), false)
  })

  it('completedDates 仍按实例日期判断且不会被解析过程修改', () => {
    const task = todo({ completedDates: ['2026-09-02'] })

    assert.equal(isTodoCompletedOnDate(task, '2026-09-02'), true)
    assert.deepEqual(task.completedDates, ['2026-09-02'])
  })

  it('非重复 Todo 不受重复起点影响并允许提前完成', () => {
    const task = todo({
      recurrence: 'none',
      dueDate: '2026-09-10',
      recurrenceStartDate: '2026-09-01',
    })

    assert.equal(isTodoOnDate(task, '2026-09-10'), true)
    assert.equal(canToggleTodoOnDate(task, '2026-09-01'), true)
  })
})

describe('Todo canonical scheduling fields', () => {
  it('非重复 Todo 只保留 dueDate', () => {
    assert.deepEqual(
      getCanonicalTodoScheduleFields('none', '2026-09-10', '2026-09-01', '2026-09-30'),
      { dueDate: '2026-09-10', recurrenceStartDate: null, recurrenceEndDate: null }
    )
  })

  it('重复 Todo 只保留 recurrenceStartDate', () => {
    assert.deepEqual(
      getCanonicalTodoScheduleFields('daily', '2026-09-10', '2026-09-01', '2026-09-30'),
      { dueDate: null, recurrenceStartDate: '2026-09-01', recurrenceEndDate: '2026-09-30' }
    )
  })

  it('拒绝创建没有正式起点的重复 Todo', () => {
    assert.throws(
      () => getCanonicalTodoScheduleFields('weekly', null, null, null),
      /重复待办必须设置重复起点/
    )
  })

  it('拒绝早于起点的重复终点', () => {
    assert.throws(
      () => getCanonicalTodoScheduleFields('daily', null, '2026-09-10', '2026-09-09'),
      /重复终点不能早于重复起点/
    )
  })
})
