// ============================================================
// Todo Repository
// 接口 + Dexie 实现（MVP 只有一种实现，接口与实现同文件）
// 未来加 Supabase 时拆分接口到独立文件
// ============================================================

import { db } from '@/data/database'
import { generateId } from '@/shared/lib/id'
import { nowISO } from '@/shared/lib/date'
import { commitLocalCreate, commitLocalDelete, commitLocalUpsert } from '@/features/sync/v1/localMutation'
import type { Todo, CreateTodoInput, UpdateTodoInput } from './types'
import { normalizeTodo } from './normalization'
import { getCanonicalTodoScheduleFields } from './services/todoServices'

export interface ITodoRepository {
  getAll(): Promise<Todo[]>
  getById(id: string): Promise<Todo | undefined>
  create(input: CreateTodoInput): Promise<Todo>
  update(id: string, patch: UpdateTodoInput): Promise<Todo>
  remove(id: string): Promise<void>
}

class DexieTodoRepository implements ITodoRepository {
  async getAll(): Promise<Todo[]> {
    const todos = await db.todos.orderBy('createdAt').reverse().toArray()
    return todos.map(normalizeTodo)
  }

  async getById(id: string): Promise<Todo | undefined> {
    const todo = await db.todos.get(id)
    return todo ? normalizeTodo(todo) : undefined
  }

  async create(input: CreateTodoInput): Promise<Todo> {
    const now = nowISO()
    const recurrence = input.recurrence ?? 'none'
    const scheduleFields = getCanonicalTodoScheduleFields(
      recurrence,
      input.dueDate,
      input.recurrenceStartDate,
      input.recurrenceEndDate
    )
    const todo: Todo = {
      id: generateId(),
      title: input.title.trim(),
      description: input.description ?? null,
      ...scheduleFields,
      priority: input.priority ?? 2,
      category: input.category ?? null,
      recurrence,
      completedDates: [],
      completed: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await commitLocalCreate('todo', todo, now)
    return todo
  }

  async update(id: string, patch: UpdateTodoInput): Promise<Todo> {
    const persisted = await db.todos.get(id)
    if (!persisted) {
      throw new Error(`Todo not found: ${id}`)
    }
    const existing = normalizeTodo(persisted)
    let updated: Todo = {
      ...existing,
      ...patch,
      updatedAt: nowISO(),
    }
    const schedulingChanged =
      Object.prototype.hasOwnProperty.call(patch, 'recurrence') ||
      Object.prototype.hasOwnProperty.call(patch, 'dueDate') ||
      Object.prototype.hasOwnProperty.call(patch, 'recurrenceStartDate') ||
      Object.prototype.hasOwnProperty.call(patch, 'recurrenceEndDate')
    if (schedulingChanged) {
      updated = {
        ...updated,
        ...getCanonicalTodoScheduleFields(
          updated.recurrence,
          updated.dueDate,
          updated.recurrenceStartDate,
          updated.recurrenceEndDate
        ),
      }
    }
    await commitLocalUpsert('todo', updated, updated.updatedAt)
    return updated
  }

  async remove(id: string): Promise<void> {
    await commitLocalDelete('todo', id, nowISO())
  }
}

export const todoRepository: ITodoRepository = new DexieTodoRepository()
