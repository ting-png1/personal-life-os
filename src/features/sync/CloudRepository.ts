// ============================================================
// CloudRepository - Supabase 数据访问封装
// 处理字段名映射（本地 camelCase ↔ 云端 snake_case）
// ============================================================

import { supabase } from '@/shared/lib/supabase'
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
   */
  async getAll(table: SyncTable): Promise<Record<string, unknown>[]> {
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
   */
  async upsert(table: SyncTable, record: Record<string, unknown>): Promise<void> {
    const cloudRecord = localToCloud(record)
    const { error } = await supabase.from(table).upsert(cloudRecord, { onConflict: 'id' })

    if (error) {
      console.error(`[CloudRepository] upsert ${table} error:`, error)
      throw error
    }
  }

  /**
   * 批量插入或更新
   */
  async upsertMany(table: SyncTable, records: Record<string, unknown>[]): Promise<void> {
    if (records.length === 0) return
    const cloudRecords = records.map((r) => localToCloud(r))
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
   */
  async remove(table: SyncTable, id: string): Promise<void> {
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
   * 检查是否已登录
   */
  async isAuthenticated(): Promise<boolean> {
    const { data } = await supabase.auth.getSession()
    return !!data.session
  }
}

export const cloudRepository = new CloudRepository()
