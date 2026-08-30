// ============================================================
// Todo Domain Types
// ============================================================

export interface Todo {
  id: string
  title: string
  description: string | null
  dueDate: string | null // "YYYY-MM-DD", null = 无截止日期
  priority: 1 | 2 | 3 // 1=高, 2=中, 3=低
  completed: boolean
  completedAt: string | null // ISO 时间戳, 未完成=null
  createdAt: string
  updatedAt: string
}

export interface CreateTodoInput {
  title: string
  description?: string | null
  dueDate?: string | null
  priority?: 1 | 2 | 3
}

export type UpdateTodoInput = Partial<Pick<Todo, 'title' | 'description' | 'dueDate' | 'priority' | 'completed' | 'completedAt'>>
