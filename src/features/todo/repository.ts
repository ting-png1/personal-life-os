// ============================================================
// Todo Repository
// 接口 + Dexie 实现（MVP 只有一种实现，接口与实现同文件）
// 未来加 Supabase 时拆分接口到独立文件
// ============================================================

import { db } from '@/data/database'
import { generateId } from '@/shared/lib/id'
import { nowISO } from '@/shared/lib/date'
import { syncService } from '@/features/sync/SyncService'
import type { Todo, CreateTodoInput, UpdateTodoInput } from './types'

export interface ITodoRepository {
  getAll(): Promise<Todo[]>
  getById(id: string): Promise<Todo | undefined>
  create(input: CreateTodoInput): Promise<Todo>
  update(id: string, patch: UpdateTodoInput): Promise<Todo>
  remove(id: string): Promise<void>
}

class DexieTodoRepository implements ITodoRepository {
  async getAll(): Promise<Todo[]> {
    return db.todos.orderBy('createdAt').reverse().toArray()
  }

  async getById(id: string): Promise<Todo | undefined> {
    return db.todos.get(id)
  }

  async create(input: CreateTodoInput): Promise<Todo> {
    const now = nowISO()
    const todo: Todo = {
      id: generateId(),
      title: input.title.trim(),
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      priority: input.priority ?? 2,
      category: input.category ?? null,
      recurrence: input.recurrence ?? 'none',
      completedDates: [],
      completed: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.todos.add(todo)
    // 异步推送到云端（不阻塞本地操作）
    syncService.pushOne('todos', todo as unknown as Record<string, unknown>)
    return todo
  }

  async update(id: string, patch: UpdateTodoInput): Promise<Todo> {
    const existing = await db.todos.get(id)
    if (!existing) {
      throw new Error(`Todo not found: ${id}`)
    }
    const updated: Todo = {
      ...existing,
      ...patch,
      updatedAt: nowISO(),
    }
    await db.todos.put(updated)
    // 异步推送到云端
    syncService.pushOne('todos', updated as unknown as Record<string, unknown>)
    return updated
  }

  async remove(id: string): Promise<void> {
    await db.todos.delete(id)
    // 异步推送删除标记到云端
    syncService.pushRemove('todos', id)
  }
}

export const todoRepository: ITodoRepository = new DexieTodoRepository()
