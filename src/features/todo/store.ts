// ============================================================
// Todo Zustand Store
// ============================================================

import { create } from 'zustand'
import { todoRepository } from './repository'
import type { Todo, CreateTodoInput, UpdateTodoInput } from './types'

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
