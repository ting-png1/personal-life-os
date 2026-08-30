// ============================================================
// useAnalytics - 数据分析 Hook
// ============================================================

import { useEffect } from 'react'
import { useAnalyticsStore } from '../store'
import { useMoodStore } from '@/features/mood/store'
import { useTodoStore } from '@/features/todo/store'
import { useCycleStore } from '@/features/cycle/store'

export function useAnalytics() {
  const {
    overview,
    insights,
    timeRange,
    isLoading,
    error,
    setTimeRange,
    generate,
    clear,
  } = useAnalyticsStore()

  const moodRecords = useMoodStore((s) => s.records)
  const todos = useTodoStore((s) => s.todos)
  const periodRecords = useCycleStore((s) => s.records)

  // 数据变化时自动重新生成分析
  useEffect(() => {
    generate(moodRecords, todos, periodRecords)
  }, [moodRecords, todos, periodRecords, timeRange, generate])

  return {
    // 状态
    overview,
    insights,
    timeRange,
    isLoading,
    error,

    // 操作
    setTimeRange,
    regenerate: () => generate(moodRecords, todos, periodRecords),
    clear,

    // 便捷访问
    moodStats: overview?.mood ?? null,
    todoStats: overview?.todo ?? null,
    cycleStats: overview?.cycle ?? null,
  }
}
