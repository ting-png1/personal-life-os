// ============================================================
// useTodos Hook
// 组合 store + 纯函数，提供给组件的便捷接口
// ============================================================

import { useMemo } from 'react'
import { useTodoStore } from '../store'
import { filterTodosByStatus, sortTodosByPriority, type TodoFilter } from '../services/todoServices'

export function useTodos(filter: TodoFilter = 'all') {
  const todos = useTodoStore((s) => s.todos)
  const loading = useTodoStore((s) => s.loading)
  const error = useTodoStore((s) => s.error)
  const create = useTodoStore((s) => s.create)
  const update = useTodoStore((s) => s.update)
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const remove = useTodoStore((s) => s.remove)
  const loadAll = useTodoStore((s) => s.loadAll)

  const filteredTodos = useMemo(() => {
    const filtered = filterTodosByStatus(todos, filter)
    return sortTodosByPriority(filtered)
  }, [todos, filter])

  const stats = useMemo(() => {
    const total = todos.length
    const completed = todos.filter((t) => t.completed).length
    return { total, completed, active: total - completed }
  }, [todos])

  return {
    todos: filteredTodos,
    allTodos: todos,
    loading,
    error,
    stats,
    create,
    update,
    toggleComplete,
    remove,
    loadAll,
  }
}
