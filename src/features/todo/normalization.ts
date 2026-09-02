import type { Todo, TodoRecurrence } from './types'

type LegacyTodo = Omit<Todo, 'category' | 'recurrence' | 'recurrenceStartDate' | 'recurrenceEndDate' | 'completedDates'> &
  Partial<Pick<Todo, 'category' | 'recurrence' | 'recurrenceStartDate' | 'recurrenceEndDate' | 'completedDates'>>

const VALID_RECURRENCES: TodoRecurrence[] = ['none', 'daily', 'weekly']

/**
 * 补齐旧版本 Todo 缺失的非索引字段。
 *
 * 这里只做读取时兼容，不写回 Dexie，避免一次加载触发隐式数据迁移或同步推送。
 */
export function normalizeTodo(todo: LegacyTodo): Todo {
  return {
    ...todo,
    category: typeof todo.category === 'string' ? todo.category : null,
    recurrence: VALID_RECURRENCES.includes(todo.recurrence as TodoRecurrence)
      ? (todo.recurrence as TodoRecurrence)
      : 'none',
    // 保持 canonical 字段与 compatibility fallback 分离：这里不使用 dueDate/createdAt 冒充正式起点。
    recurrenceStartDate:
      typeof todo.recurrenceStartDate === 'string' ? todo.recurrenceStartDate : null,
    recurrenceEndDate:
      typeof todo.recurrenceEndDate === 'string' ? todo.recurrenceEndDate : null,
    completedDates: Array.isArray(todo.completedDates)
      ? todo.completedDates.filter((date): date is string => typeof date === 'string')
      : [],
  }
}
