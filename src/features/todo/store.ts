// ============================================================
// Todo Zustand Store
// ============================================================

import { create } from 'zustand'
import { todoRepository } from './repository'
import type { Todo, CreateTodoInput, UpdateTodoInput } from './types'
import { canToggleTodoOnDate, isTodoCompletedOnDate } from './services/todoServices'
import { todayStr } from '@/shared/lib/date'

interface TodoState {
  todos: Todo[]
  loading: boolean
  error: string | null

  loadAll: () => Promise<void>
  create: (input: CreateTodoInput) => Promise<Todo>
  update: (id: string, patch: UpdateTodoInput) => Promise<Todo>
  toggleComplete: (id: string) => Promise<Todo | null>
  remove: (id: string) => Promise<void>
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null })
    try {
      const todos = await todoRepository.getAll()
      set({ todos, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : '加载失败' })
    }
  },

  create: async (input) => {
    const todo = await todoRepository.create(input)
    set((state) => ({
      todos: [todo, ...state.todos],
    }))
    return todo
  },

  update: async (id, patch) => {
    const updated = await todoRepository.update(id, patch)
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? updated : t)),
    }))
    return updated
  },

  toggleComplete: async (id) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return null
    const today = todayStr()

    // 重复 Todo：使用 completedDates 记录每天的完成状态
    if (todo.recurrence !== 'none') {
      if (!canToggleTodoOnDate(todo, today)) return null
      const isCompleted = isTodoCompletedOnDate(todo, today)
      if (isCompleted) {
        // 取消完成：从 completedDates 中移除今天
        const newCompletedDates = todo.completedDates.filter((d) => d !== today)
        return get().update(id, { completedDates: newCompletedDates })
      } else {
        // 完成：将今天添加到 completedDates
        const newCompletedDates = [...todo.completedDates, today].sort()
        return get().update(id, { completedDates: newCompletedDates })
      }
    }

    // 非重复 Todo：使用 completed 和 completedAt
    if (todo.completed) {
      return get().update(id, { completed: false, completedAt: null })
    } else {
      return get().update(id, {
        completed: true,
        completedAt: new Date().toISOString(),
      })
    }
  },

  remove: async (id) => {
    await todoRepository.remove(id)
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    }))
  },
}))
