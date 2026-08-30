// ============================================================
// Analytics Types - 数据分析模块类型定义
// ============================================================

/** 时间范围 */
export type TimeRange = '7days' | '30days' | '90days'

/** 情绪趋势数据点 */
export interface MoodTrendPoint {
  date: string // YYYY-MM-DD
  weekday: string
  level: number | null // 平均情绪等级，null 表示无记录
  count: number // 记录次数
  tags: string[] // 高频标签
}

/** 情绪趋势统计 */
export interface MoodTrendStats {
  points: MoodTrendPoint[]
  averageLevel: number | null
  highestLevel: number | null
  lowestLevel: number | null
  mostCommonMood: string | null
  recordCount: number
  streakDays: number // 连续记录天数
}

/** Todo 完成率数据点 */
export interface TodoCompletionPoint {
  date: string // YYYY-MM-DD
  weekday: string
  total: number
  completed: number
  completionRate: number // 0-1
}

/** Todo 完成率统计 */
export interface TodoCompletionStats {
  points: TodoCompletionPoint[]
  totalTodos: number
  completedTodos: number
  overallCompletionRate: number
  averageDailyCompletion: number
  bestDay: { date: string; rate: number } | null
  pendingCount: number
  overdueCount: number
}

/** 周期统计 */
export interface CycleStats {
  totalCycles: number
  averageCycleLength: number | null // 平均周期长度（天）
  averagePeriodLength: number | null // 平均经期长度（天）
  shortestCycle: number | null
  longestCycle: number | null
  cycleLengths: number[] // 历史周期长度
  currentPhase: string | null
  daysUntilNextPeriod: number | null
  regularity: 'regular' | 'irregular' | 'insufficient_data' // 规律程度
}

/** 综合数据概览 */
export interface AnalyticsOverview {
  mood: MoodTrendStats
  todo: TodoCompletionStats
  cycle: CycleStats
  dateRange: TimeRange
  generatedAt: string
}

/** 数据洞察 */
export interface DataInsight {
  id: string
  type: 'mood' | 'todo' | 'cycle' | 'general'
  title: string
  description: string
  severity: 'info' | 'positive' | 'warning'
}
