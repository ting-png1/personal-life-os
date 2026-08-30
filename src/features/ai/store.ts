// ============================================================
// AI Zustand Store
// ============================================================

import { create } from 'zustand'
import type { AIRecommendation, AISettings, AIDailyUsage, AIGenerationInput } from './types'
import { generateAIRecommendation } from './services/AIService'
import {
  loadAISettings,
  saveAISettings,
  loadDailyUsage,
  incrementUsage,
  canUseAI,
  clearAPIKey as clearAPIKeyStorage,
} from './services/aiSettings'

interface AIState {
  // 建议数据
  recommendations: AIRecommendation[]
  currentRecommendation: AIRecommendation | null
  loading: boolean
  error: string | null

  // 设置与计数
  settings: AISettings
  dailyUsage: AIDailyUsage

  // Actions
  loadSettings: () => void
  updateSettings: (patch: Partial<AISettings>) => void
  clearAPIKey: () => void
  refreshUsage: () => void
  generate: (input: AIGenerationInput) => Promise<AIRecommendation | null>
  dismissCurrent: () => void
  confirmSuggestion: (suggestionId: string) => void
  dismissSuggestion: (suggestionId: string) => void
  clearError: () => void
}

export const useAIStore = create<AIState>((set, get) => ({
  recommendations: [],
  currentRecommendation: null,
  loading: false,
  error: null,

  settings: loadAISettings(),
  dailyUsage: loadDailyUsage(),

  loadSettings: () => {
    set({ settings: loadAISettings(), dailyUsage: loadDailyUsage() })
  },

  updateSettings: (patch) => {
    const current = get().settings
    const updated = { ...current, ...patch }
    saveAISettings(updated)
    set({ settings: updated })
  },

  clearAPIKey: () => {
    clearAPIKeyStorage()
    set({ settings: loadAISettings() })
  },

  refreshUsage: () => {
    set({ dailyUsage: loadDailyUsage() })
  },

  generate: async (input) => {
    const { settings } = get()

    // 检查是否可以调用
    const usageCheck = canUseAI()
    if (!usageCheck.allowed) {
      if (!settings.apiKey) {
        set({ error: '请先在设置中配置 API Key' })
      } else if (!settings.enabled) {
        set({ error: 'AI 功能未启用' })
      } else {
        set({ error: '今日 AI 调用次数已用完，请明天再试' })
      }
      return null
    }

    set({ loading: true, error: null })

    try {
      const recommendation = await generateAIRecommendation(
        input,
        settings.apiKey,
        settings.model
      )

      // 增加使用计数
      const usage = incrementUsage()

      set((state) => ({
        recommendations: [recommendation, ...state.recommendations],
        currentRecommendation: recommendation,
        dailyUsage: usage,
        loading: false,
      }))

      return recommendation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI 生成失败'
      set({ loading: false, error: errorMessage })
      return null
    }
  },

  dismissCurrent: () => {
    set((state) => ({
      currentRecommendation: state.currentRecommendation
        ? { ...state.currentRecommendation, status: 'dismissed' as const }
        : null,
    }))
  },

  confirmSuggestion: (_suggestionId) => {
    set((state) => {
      if (!state.currentRecommendation) return state
      return {
        currentRecommendation: {
          ...state.currentRecommendation,
          status: 'confirmed',
        },
      }
    })
  },

  dismissSuggestion: (_suggestionId) => {
    // 单条建议的忽略不改变整体状态，仅用于 UI 交互
    // 未来可以实现隐藏单条建议
  },

  clearError: () => {
    set({ error: null })
  },
}))
