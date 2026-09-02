// ============================================================
// Todo Domain Types
// ============================================================

export type TodoRecurrence = 'none' | 'daily' | 'weekly'

export interface Todo {
  id: string
  title: string
  description: string | null
  dueDate: string | null // 非重复 Todo 的可选截止日期（"YYYY-MM-DD"）
  recurrenceStartDate: string | null // 重复 Todo 的正式起点；旧记录读取时可能为 null
  recurrenceEndDate: string | null // 重复 Todo 的可选终点；null = 无限重复
  priority: 1 | 2 | 3 // 1=高, 2=中, 3=低
  category: string | null // 分类标签，如"学习"/"生活"/"工作"，null=未分类
  recurrence: TodoRecurrence // 重复规则：none=不重复, daily=每天, weekly=每周
  completedDates: string[] // 重复 Todo 的完成日期列表（"YYYY-MM-DD"），非重复 Todo 忽略此字段
  completed: boolean // 非重复 Todo 的完成状态（重复 Todo 此字段始终为 false）
  completedAt: string | null // ISO 时间戳, 未完成=null
  createdAt: string
  updatedAt: string
}

export interface CreateTodoInput {
  title: string
  description?: string | null
  dueDate?: string | null
  recurrenceStartDate?: string | null
  recurrenceEndDate?: string | null
  priority?: 1 | 2 | 3
  category?: string | null
  recurrence?: TodoRecurrence
}

export type UpdateTodoInput = Partial<Pick<Todo, 'title' | 'description' | 'dueDate' | 'recurrenceStartDate' | 'recurrenceEndDate' | 'priority' | 'category' | 'recurrence' | 'completed' | 'completedAt' | 'completedDates'>>

/** 预设分类 */
export const TODO_CATEGORIES = ['学习', '生活', '工作', '其他'] as const

/** 重复规则标签 */
export const TODO_RECURRENCE_LABELS: Record<TodoRecurrence, string> = {
  none: '不重复',
  daily: '每天',
  weekly: '每周',
}
