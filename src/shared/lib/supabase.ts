// ============================================================
// Supabase Client - 安全初始化
// 未配置环境变量时不崩溃，仅禁用云同步功能
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase 是否已配置（环境变量是否存在） */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('[Supabase] 环境变量未配置，云同步功能将不可用。应用将以本地模式运行。')
}

/**
 * Supabase 客户端实例
 * 未配置时为 null，使用方必须检查 isSupabaseConfigured
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export type { SupabaseClient }
