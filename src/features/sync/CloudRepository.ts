// ============================================================
// CloudRepository - Supabase 数据访问封装
// 处理字段名映射（本地 camelCase ↔ 云端 snake_case）
// Supabase 未配置时安全降级，不阻塞应用
// ============================================================

import { supabase, isSupabaseConfigured } from '@/shared/lib/supabase'
import type { SyncTable } from './types'

// 字段名映射：本地 camelCase → 云端 snake_case
const LOCAL_TO_CLOUD: Record<string, string> = {
  dueDate: 'due_date',
  completedAt: 'completed_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  startDateTime: 'start_date_time',
  endDateTime: 'end_date_time',
  startDate: 'start_date',
  endDate: 'end_date',
  flowLevel: 'flow_level',
}

// 反向映射：云端 snake_case → 本地 camelCase
const CLOUD_TO_LOCAL: Record<string, string> = Object.fromEntries(
  Object.entries(LOCAL_TO_CLOUD).map(([k, v]) => [v, k])
)

function localToCloud(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    const cloudKey = LOCAL_TO_CLOUD[key] || key
    result[cloudKey] = value
  }
  return result
}

function cloudToLocal(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    // 跳过 user_id，本地不需要
    if (key === 'user_id') continue
    const localKey = CLOUD_TO_LOCAL[key] || key
    result[localKey] = value
  }
  return result
}

export class CloudRepository {
  /**
   * 获取某张表的所有数据（当前用户）
   * Supabase 未配置时返回空数组
   */
  async getAll(table: SyncTable): Promise<Record<string, unknown>[]> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn(`[CloudRepository] Supabase 未配置，getAll(${table}) 返回空`)
      return []
    }

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error(`[CloudRepository] getAll ${table} error:`, error)
      throw error
    }

    return (data || []).map((r) => cloudToLocal(r as Record<string, unknown>))
  }

  /**
   * 插入或更新一条记录
   * Supabase 未配置时静默跳过
   */
  async upsert(table: SyncTable, record: Record<string, unknown>): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn(`[CloudRepository] Supabase 未配置，upsert(${table}) 跳过`)
      return
    }

    const userId = await this.getCurrentUserId()
    if (!userId) {
      throw new Error('未登录，无法推送数据')
    }
    const cloudRecord = localToCloud({ ...record, user_id: userId })
    const { error } = await supabase.from(table).upsert(cloudRecord, { onConflict: 'id' })

    if (error) {
      console.error(`[CloudRepository] upsert ${table} error:`, error)
      throw error
    }
  }

  /**
   * 批量插入或更新
   * Supabase 未配置时静默跳过
   */
  async upsertMany(table: SyncTable, records: Record<string, unknown>[]): Promise<void> {
    if (records.length === 0) return
    if (!isSupabaseConfigured || !supabase) {
      console.warn(`[CloudRepository] Supabase 未配置，upsertMany(${table}) 跳过`)
      return
    }

    const userId = await this.getCurrentUserId()
    if (!userId) {
      throw new Error('未登录，无法推送数据')
    }
    const cloudRecords = records.map((r) => localToCloud({ ...r, user_id: userId }))
    const { error } = await supabase
      .from(table)
      .upsert(cloudRecords, { onConflict: 'id' })

    if (error) {
      console.error(`[CloudRepository] upsertMany ${table} error:`, error)
      throw error
    }
  }

  /**
   * 删除一条记录（软删除，设置 deleted_at）
   * Supabase 未配置时静默跳过
   */
  async remove(table: SyncTable, id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn(`[CloudRepository] Supabase 未配置，remove(${table}, ${id}) 跳过`)
      return
    }

    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error(`[CloudRepository] remove ${table} error:`, error)
      throw error
    }
  }

  /**
   * 获取当前登录用户 ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    if (!isSupabaseConfigured || !supabase) return null
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  /**
   * 检查是否已登录
   * Supabase 未配置时返回 false
   */
  async isAuthenticated(): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false
    const { data } = await supabase.auth.getSession()
    return !!data.session
  }
}

export const cloudRepository = new CloudRepository()
