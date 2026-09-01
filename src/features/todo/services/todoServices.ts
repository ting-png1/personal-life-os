// ============================================================
// Todo Pure Logic Services
// 不依赖 React / DOM / Dexie，可单测可移植
// ============================================================

import type { Todo } from '../types'
import { toDateStr, getDayOfWeek } from '@/shared/lib/date'

/** 判断 Todo 在指定日期是否有实例（支持重复规则） */
export function isTodoOnDate(todo: Todo, date: string): boolean {
  if (todo.recurrence === 'none') {
    return todo.dueDate === date
  }
  if (todo.recurrence === 'daily') {
    // 每天重复：从 dueDate 开始每天都有
    return todo.dueDate === null || date >= todo.dueDate
  }
  if (todo.recurrence === 'weekly') {
    // 每周重复：每周的同一天（基于 dueDate 的星期几）
    if (!todo.dueDate || date < todo.dueDate) return false
    return getDayOfWeek(date) === getDayOfWeek(todo.dueDate)
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

/** 展开指定日期的 Todo 实例（支持重复规则） */
export function expandTodosForDate(todos: Todo[], date: string): Todo[] {
  return todos.filter((todo) => isTodoOnDate(todo, date))
}

/** 筛选指定日期的待办（dueDate 匹配） */
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
