// ============================================================
// AISettingsService
// AI 设置与每日使用计数的 localStorage 存储
// 纯函数式，不依赖 React
// ============================================================

import type { AISettings, AIDailyUsage } from '../types'
import { todayStr } from '@/shared/lib/date'

const SETTINGS_KEY = 'plifeos_ai_settings'
const USAGE_KEY = 'plifeos_ai_usage'

/** 默认 AI 设置 */
export const DEFAULT_AI_SETTINGS: AISettings = {
  apiKey: '',
  dailyLimit: 3,
  model: 'deepseek-chat',
  enabled: false,
}

/** 读取 AI 设置 */
export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_AI_SETTINGS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_AI_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_AI_SETTINGS }
  }
}

/** 保存 AI 设置 */
export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error('Failed to save AI settings:', err)
  }
}

/** 更新部分 AI 设置 */
export function updateAISettings(patch: Partial<AISettings>): AISettings {
  const current = loadAISettings()
  const updated = { ...current, ...patch }
  saveAISettings(updated)
  return updated
}

/** 清除 API Key */
export function clearAPIKey(): void {
  updateAISettings({ apiKey: '', enabled: false })
}

/** 读取今日使用计数 */
export function loadDailyUsage(): AIDailyUsage {
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (!raw) return { date: todayStr(), count: 0 }
    const parsed = JSON.parse(raw) as AIDailyUsage
    // 如果日期不是今天，重置计数
    if (parsed.date !== todayStr()) {
      const fresh: AIDailyUsage = { date: todayStr(), count: 0 }
      saveDailyUsage(fresh)
      return fresh
    }
    return parsed
  } catch {
    return { date: todayStr(), count: 0 }
  }
}

/** 保存使用计数 */
export function saveDailyUsage(usage: AIDailyUsage): void {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
  } catch (err) {
    console.error('Failed to save AI usage:', err)
  }
}

/** 增加一次使用计数 */
export function incrementUsage(): AIDailyUsage {
  const usage = loadDailyUsage()
  const updated: AIDailyUsage = {
    ...usage,
    count: usage.count + 1,
  }
  saveDailyUsage(updated)
  return updated
}

/** 检查是否还能调用 AI（未超过每日上限） */
export function canUseAI(): { allowed: boolean; remaining: number; limit: number } {
  const settings = loadAISettings()
  const usage = loadDailyUsage()
  const remaining = Math.max(0, settings.dailyLimit - usage.count)
  return {
    allowed: settings.enabled && settings.apiKey !== '' && remaining > 0,
    remaining,
    limit: settings.dailyLimit,
  }
}

/** 检查是否已配置 API Key */
export function isAIConfigured(): boolean {
  const settings = loadAISettings()
  return settings.apiKey !== '' && settings.enabled
}
