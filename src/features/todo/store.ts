// ============================================================
// Todo Zustand Store
// ============================================================

import { create } from 'zustand'
import { todoRepository } from './repository'
import type { Todo, CreateTodoInput, UpdateTodoInput } from './types'
import {
  buildTodoCompletionPatch,
  canToggleTodoOnDate,
  isTodoCompletedOnDate,
} from './services/todoServices'
import { todayStr } from '@/shared/lib/date'

interface TodoState {
  todos: Todo[]
  loading: boolean
  hydrated: boolean
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
  hydrated: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null })
    try {
      const todos = await todoRepository.getAll()
      set({ todos, loading: false, hydrated: true })
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
      return get().update(
        id,
        buildTodoCompletionPatch(todo, today, !isCompleted, new Date().toISOString())
      )
    }

    // 非重复 Todo：使用 completed 和 completedAt
    return get().update(
      id,
      buildTodoCompletionPatch(todo, today, !todo.completed, new Date().toISOString())
    )
  },

  remove: async (id) => {
    await todoRepository.remove(id)
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id),
    }))
  },
}))
