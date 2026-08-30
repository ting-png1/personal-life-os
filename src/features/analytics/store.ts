// ============================================================
// Analytics Store - 数据分析状态管理
// ============================================================

import { create } from 'zustand'
import {
  generateAnalyticsOverview,
  generateInsights,
} from './AnalyticsService'
import type {
  TimeRange,
  AnalyticsOverview,
  DataInsight,
} from './types'
import type { MoodRecord } from '@/features/mood/types'
import type { Todo } from '@/features/todo/types'
import type { PeriodRecord } from '@/features/cycle/types'

interface AnalyticsStore {
  // 状态
  overview: AnalyticsOverview | null
  insights: DataInsight[]
  timeRange: TimeRange
  isLoading: boolean
  error: string | null

  // 操作
  setTimeRange: (range: TimeRange) => void
  generate: (
    moodRecords: MoodRecord[],
    todos: Todo[],
    periodRecords: PeriodRecord[]
  ) => void
  clear: () => void
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  overview: null,
  insights: [],
  timeRange: '30days',
  isLoading: false,
  error: null,

  setTimeRange: (range) => {
    set({ timeRange: range })
  },

  generate: (moodRecords, todos, periodRecords) => {
    set({ isLoading: true, error: null })
    try {
      const { timeRange } = get()
      const overview = generateAnalyticsOverview(moodRecords, todos, periodRecords, timeRange)
      const insights = generateInsights(overview)
      set({ overview, insights, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '数据分析失败',
        isLoading: false,
      })
    }
  },

  clear: () => {
    set({ overview: null, insights: [], error: null })
  },
}))
