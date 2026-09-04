// ============================================================
// Todo Pure Logic Services
// 不依赖 React / DOM / Dexie，可单测可移植
// ============================================================

import type { Todo, UpdateTodoInput } from '../types'
import type { TodoRecurrence } from '../types.ts'
import { toDateStr, getDayOfWeek } from '../../../shared/lib/date.ts'

export type RecurrenceStartSource =
  | 'canonical'
  | 'legacyDueDate'
  | 'createdAtFallback'
  | 'notRecurring'

export interface RecurrenceStartResolution {
  date: string | null
  source: RecurrenceStartSource
}

/**
 * 解析重复任务的有效起点。
 *
 * createdAt 只用于运行时兼容，不会写回，也不代表用户确认过的正式起点。
 */
export function resolveRecurrenceStartDate(todo: Todo): RecurrenceStartResolution {
  if (todo.recurrence === 'none') {
    return { date: null, source: 'notRecurring' }
  }
  if (todo.recurrenceStartDate) {
    return { date: todo.recurrenceStartDate, source: 'canonical' }
  }
  if (todo.dueDate) {
    return { date: todo.dueDate, source: 'legacyDueDate' }
  }
  return { date: toDateStr(todo.createdAt), source: 'createdAtFallback' }
}

/** 新建或显式编辑 Todo 时，生成互斥的正式日期字段。 */
export function getCanonicalTodoScheduleFields(
  recurrence: TodoRecurrence,
  dueDate: string | null | undefined,
  recurrenceStartDate: string | null | undefined,
  recurrenceEndDate: string | null | undefined
): Pick<Todo, 'dueDate' | 'recurrenceStartDate' | 'recurrenceEndDate'> {
  if (recurrence === 'none') {
    return {
      dueDate: dueDate || null,
      recurrenceStartDate: null,
      recurrenceEndDate: null,
    }
  }
  if (!recurrenceStartDate) {
    throw new Error('重复待办必须设置重复起点')
  }
  if (recurrenceEndDate && recurrenceEndDate < recurrenceStartDate) {
    throw new Error('重复终点不能早于重复起点')
  }
  return {
    dueDate: null,
    recurrenceStartDate,
    recurrenceEndDate: recurrenceEndDate || null,
  }
}

/** 判断 Todo 在指定日期是否有实例（支持重复规则） */
export function isTodoOnDate(todo: Todo, date: string): boolean {
  if (todo.recurrence === 'none') {
    return todo.dueDate === date
  }
  const startDate = resolveRecurrenceStartDate(todo).date
  if (!startDate || date < startDate) return false
  if (todo.recurrenceEndDate && date > todo.recurrenceEndDate) return false
  if (todo.recurrence === 'daily') {
    return true
  }
  if (todo.recurrence === 'weekly') {
    return getDayOfWeek(date) === getDayOfWeek(startDate)
  }
  return false
}

/** 判断 Todo 在指定日期是否完成 */
export function isTodoCompletedOnDate(todo: Todo, date: string): boolean {
  if (todo.recurrence === 'none') {
    return todo.completed && todo.completedAt !== null && toDateStr(todo.completedAt) === date
  }
  // 重复 Todo：检查 completedDates 列表
  return todo.completedDates.includes(date)
}

/** 非重复 Todo 可提前完成；重复 Todo 只能在当天确实有实例时勾选。 */
export function canToggleTodoOnDate(todo: Todo, date: string): boolean {
  return todo.recurrence === 'none' || isTodoOnDate(todo, date)
}

/**
 * 构建指定发生日的完成状态 patch。Store 与 intelligence Action 共用此规则，
 * 避免绕过重复任务实例校验或直接拼接 completedDates。
 */
export function buildTodoCompletionPatch(
  todo: Todo,
  date: string,
  completed: boolean,
  completedAt: string,
): UpdateTodoInput {
  if (!canToggleTodoOnDate(todo, date)) {
    throw new Error('该日期没有可更新的重复待办实例')
  }

  if (todo.recurrence === 'none') {
    return completed
      ? { completed: true, completedAt }
      : { completed: false, completedAt: null }
  }

  const completedDates = new Set(todo.completedDates)
  if (completed) {
    completedDates.add(date)
  } else {
    completedDates.delete(date)
  }
  return { completedDates: [...completedDates].sort() }
}

/** 展开指定日期的 Todo 实例（支持重复规则） */
export function expandTodosForDate(todos: Todo[], date: string): Todo[] {
  return todos.filter((todo) => isTodoOnDate(todo, date))
}

/** 筛选指定日期存在的待办实例 */
export function filterTodosByDate(todos: Todo[], date: string): Todo[] {
  return expandTodosForDate(todos, date)
}

/** 筛选今天到期且未完成的待办 */
export function filterDueToday(todos: Todo[], today: string): Todo[] {
  return expandTodosForDate(todos, today).filter((t) => !isTodoCompletedOnDate(t, today))
}

/** 筛选今天完成的待办 */
export function filterCompletedToday(todos: Todo[], today: string): Todo[] {
  return expandTodosForDate(todos, today).filter((t) => isTodoCompletedOnDate(t, today))
}

/** 按优先级排序（1=高在前，3=低在后），同优先级按创建时间倒序 */
export function sortTodosByPriority(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/** 计算完成率 0-1 */
export function calculateCompletion(total: number, completed: number): number {
  if (total === 0) return 0
  return Math.min(1, completed / total)
}

/** 筛选待办状态 */
export type TodoFilter = 'all' | 'active' | 'completed'

export function filterTodosByStatus(todos: Todo[], filter: TodoFilter): Todo[] {
  switch (filter) {
    case 'active':
      return todos.filter((t) => !t.completed)
    case 'completed':
      return todos.filter((t) => t.completed)
    default:
      return todos
  }
}

/** 按分类筛选（null 或 'all' 表示不筛选） */
export function filterTodosByCategory(todos: Todo[], category: string | null): Todo[] {
  if (!category || category === 'all') return todos
  if (category === 'uncategorized') return todos.filter((t) => !t.category)
  return todos.filter((t) => t.category === category)
}

/** 获取所有分类列表（含未分类） */
export function getCategories(todos: Todo[]): string[] {
  const categories = new Set<string>()
  todos.forEach((t) => {
    if (t.category) categories.add(t.category)
  })
  return Array.from(categories).sort()
}
