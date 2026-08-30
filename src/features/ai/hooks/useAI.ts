// ============================================================
// useAI Hook
// 组合 store + services，提供给组件的便捷接口
// ============================================================

import { useMemo } from 'react'
import { useAIStore } from '../store'
import { canUseAI } from '../services/aiSettings'
import { buildAIGenerationInput } from '../services/AIService'
import type { AIGenerationInput } from '../types'

export function useAI() {
  const currentRecommendation = useAIStore((s) => s.currentRecommendation)
  const loading = useAIStore((s) => s.loading)
  const error = useAIStore((s) => s.error)
  const settings = useAIStore((s) => s.settings)
  const dailyUsage = useAIStore((s) => s.dailyUsage)

  const generate = useAIStore((s) => s.generate)
  const dismissCurrent = useAIStore((s) => s.dismissCurrent)
  const confirmSuggestion = useAIStore((s) => s.confirmSuggestion)
  const updateSettings = useAIStore((s) => s.updateSettings)
  const clearAPIKey = useAIStore((s) => s.clearAPIKey)
  const refreshUsage = useAIStore((s) => s.refreshUsage)
  const clearError = useAIStore((s) => s.clearError)

  // 计算是否还能生成
  const usageInfo = useMemo(() => {
    const check = canUseAI()
    return {
      canGenerate: check.allowed,
      remaining: check.remaining,
      limit: check.limit,
      used: dailyUsage.count,
    }
  }, [dailyUsage.count])

  // 是否已配置
  const isConfigured = settings.apiKey !== '' && settings.enabled

  return {
    // 数据
    currentRecommendation,
    loading,
    error,
    settings,
    dailyUsage,
    isConfigured,
    ...usageInfo,

    // 操作
    generate,
    dismissCurrent,
    confirmSuggestion,
    updateSettings,
    clearAPIKey,
    refreshUsage,
    clearError,

    // 工具
    buildAIGenerationInput,
  }
}

export type { AIGenerationInput }
