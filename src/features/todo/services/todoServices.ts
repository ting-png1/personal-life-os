// ============================================================
// Todo Pure Logic Services
// 不依赖 React / DOM / Dexie，可单测可移植
// ============================================================

import type { Todo } from '../types'
import { toDateStr } from '@/shared/lib/date'

/** 筛选指定日期的待办（dueDate 匹配） */
export function filterTodosByDate(todos: Todo[], date: string): Todo[] {
  return todos.filter((t) => t.dueDate === date)
}

/** 筛选今天到期且未完成的待办 */
export function filterDueToday(todos: Todo[], today: string): Todo[] {
  return todos.filter((t) => t.dueDate === today && !t.completed)
}

/** 筛选今天完成的待办（completedAt 日期匹配） */
export function filterCompletedToday(todos: Todo[], today: string): Todo[] {
  return todos.filter((t) => t.completed && t.completedAt && toDateStr(t.completedAt) === today)
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
