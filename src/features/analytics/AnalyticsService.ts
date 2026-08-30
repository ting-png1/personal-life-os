// ============================================================
// AnalyticsService - 数据分析服务
// 所有计算均为纯函数，不依赖 React/DOM/浏览器 API
// ============================================================

import type {
  TimeRange,
  MoodTrendPoint,
  MoodTrendStats,
  TodoCompletionPoint,
  TodoCompletionStats,
  CycleStats,
  AnalyticsOverview,
  DataInsight,
} from './types'
import type { MoodRecord } from '@/features/mood/types'
import type { Todo } from '@/features/todo/types'
import type { PeriodRecord } from '@/features/cycle/types'

// ============================================================
// 工具函数
// ============================================================

/** 获取时间范围内的日期列表 */
function getDateRange(range: TimeRange): string[] {
  const days = range === '7days' ? 7 : range === '30days' ? 30 : 90
  const dates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

/** 获取星期几的中文名称 */
function getWeekday(dateStr: string): string {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = new Date(dateStr)
  return weekdays[date.getDay()]
}

/** 情绪等级对应的中文名称 */
const MOOD_LEVEL_NAMES: Record<number, string> = {
  1: '很差',
  2: '较差',
  3: '一般',
  4: '较好',
  5: '很好',
}

// ============================================================
// 情绪趋势分析
// ============================================================

/** 计算情绪趋势 */
export function calculateMoodTrend(
  moodRecords: MoodRecord[],
  range: TimeRange
): MoodTrendStats {
  const dates = getDateRange(range)
  const points: MoodTrendPoint[] = []

  for (const date of dates) {
    const dayRecords = moodRecords.filter((r) => r.date === date)
    const levels = dayRecords.map((r) => r.level).filter((l) => l > 0)
    const avgLevel = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : null

    // 统计高频标签
    const tagCount: Record<string, number> = {}
    dayRecords.forEach((r) => {
      r.tags?.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    })
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag)

    points.push({
      date,
      weekday: getWeekday(date),
      level: avgLevel !== null ? Math.round(avgLevel * 10) / 10 : null,
      count: dayRecords.length,
      tags: topTags,
    })
  }

  // 统计
  const validLevels = points.filter((p) => p.level !== null).map((p) => p.level as number)
  const averageLevel = validLevels.length > 0 ? validLevels.reduce((a, b) => a + b, 0) / validLevels.length : null
  const highestLevel = validLevels.length > 0 ? Math.max(...validLevels) : null
  const lowestLevel = validLevels.length > 0 ? Math.min(...validLevels) : null

  // 最常见情绪
  const allLevels = moodRecords.map((r) => r.level).filter((l) => l > 0)
  const levelCount: Record<number, number> = {}
  allLevels.forEach((l) => {
    levelCount[l] = (levelCount[l] || 0) + 1
  })
  const mostCommonLevel = Object.entries(levelCount).sort((a, b) => b[1] - a[1])[0]
  const mostCommonMood = mostCommonLevel ? MOOD_LEVEL_NAMES[parseInt(mostCommonLevel[0], 10)] : null

  // 连续记录天数（从今天往前数）
  let streakDays = 0
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].count > 0) {
      streakDays++
    } else {
      break
    }
  }

  return {
    points,
    averageLevel: averageLevel !== null ? Math.round(averageLevel * 10) / 10 : null,
    highestLevel,
    lowestLevel,
    mostCommonMood,
    recordCount: moodRecords.length,
    streakDays,
  }
}

// ============================================================
// Todo 完成率分析
// ============================================================

/** 计算 Todo 完成率 */
export function calculateTodoCompletion(
  todos: Todo[],
  range: TimeRange
): TodoCompletionStats {
  const dates = getDateRange(range)
  const points: TodoCompletionPoint[] = []

  for (const date of dates) {
    // 当天到期的 Todo
    const dayTodos = todos.filter((t) => {
      if (!t.dueDate) return false
      return t.dueDate.split('T')[0] === date
    })
    const completed = dayTodos.filter((t) => t.completed).length
    const total = dayTodos.length
    const completionRate = total > 0 ? completed / total : 0

    points.push({
      date,
      weekday: getWeekday(date),
      total,
      completed,
      completionRate,
    })
  }

  // 统计
  const totalTodos = todos.length
  const completedTodos = todos.filter((t) => t.completed).length
  const overallCompletionRate = totalTodos > 0 ? completedTodos / totalTodos : 0

  // 平均每日完成数
  const daysWithTodos = points.filter((p) => p.total > 0)
  const averageDailyCompletion = daysWithTodos.length > 0
    ? daysWithTodos.reduce((sum, p) => sum + p.completed, 0) / daysWithTodos.length
    : 0

  // 完成率最高的一天
  const bestDayPoint = points.filter((p) => p.total > 0).sort((a, b) => b.completionRate - a.completionRate)[0]
  const bestDay = bestDayPoint ? { date: bestDayPoint.date, rate: bestDayPoint.completionRate } : null

  // 待办和逾期
  const now = new Date()
  const pendingCount = todos.filter((t) => !t.completed).length
  const overdueCount = todos.filter((t) => {
    if (!t.dueDate || t.completed) return false
    return new Date(t.dueDate) < now
  }).length

  return {
    points,
    totalTodos,
    completedTodos,
    overallCompletionRate,
    averageDailyCompletion: Math.round(averageDailyCompletion * 10) / 10,
    bestDay,
    pendingCount,
    overdueCount,
  }
}

// ============================================================
// 周期统计分析
// ============================================================

/** 计算周期统计 */
export function calculateCycleStats(periodRecords: PeriodRecord[]): CycleStats {
  if (periodRecords.length === 0) {
    return {
      totalCycles: 0,
      averageCycleLength: null,
      averagePeriodLength: null,
      shortestCycle: null,
      longestCycle: null,
      cycleLengths: [],
      currentPhase: null,
      daysUntilNextPeriod: null,
      regularity: 'insufficient_data',
    }
  }

  // 按开始日期排序
  const sorted = [...periodRecords].sort((a, b) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )

  // 计算周期长度（相邻两次经期开始日期的差）
  const cycleLengths: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prevStart = new Date(sorted[i - 1].startDate)
    const currStart = new Date(sorted[i].startDate)
    const diff = Math.round((currStart.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24))
    if (diff > 0 && diff < 100) {
      cycleLengths.push(diff)
    }
  }

  // 计算经期长度
  const periodLengths: number[] = []
  sorted.forEach((record) => {
    if (record.endDate) {
      const start = new Date(record.startDate)
      const end = new Date(record.endDate)
      const length = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      if (length > 0 && length < 30) {
        periodLengths.push(length)
      }
    }
  })

  const averageCycleLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length * 10) / 10
    : null
  const averagePeriodLength = periodLengths.length > 0
    ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length * 10) / 10
    : null
  const shortestCycle = cycleLengths.length > 0 ? Math.min(...cycleLengths) : null
  const longestCycle = cycleLengths.length > 0 ? Math.max(...cycleLengths) : null

  // 当前阶段和距离下次经期天数
  const latest = sorted[sorted.length - 1]
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const latestStart = new Date(latest.startDate)
  latestStart.setHours(0, 0, 0, 0)
  const daysSinceStart = Math.round((now.getTime() - latestStart.getTime()) / (1000 * 60 * 60 * 24))

  let currentPhase: string | null = null
  let daysUntilNextPeriod: number | null = null

  if (averageCycleLength) {
    if (!latest.endDate && daysSinceStart <= (averagePeriodLength || 5)) {
      currentPhase = '经期'
      daysUntilNextPeriod = null
    } else {
      daysUntilNextPeriod = Math.max(0, averageCycleLength - daysSinceStart)
      if (daysSinceStart < averageCycleLength * 0.5) {
        currentPhase = '卵泡期'
      } else if (daysSinceStart < averageCycleLength * 0.75) {
        currentPhase = '排卵期'
      } else {
        currentPhase = '黄体期'
      }
    }
  }

  // 规律程度判断
  let regularity: 'regular' | 'irregular' | 'insufficient_data' = 'insufficient_data'
  if (cycleLengths.length >= 3 && averageCycleLength) {
    const variance = cycleLengths.reduce((sum, len) => sum + Math.pow(len - averageCycleLength, 2), 0) / cycleLengths.length
    const stdDev = Math.sqrt(variance)
    regularity = stdDev <= 3 ? 'regular' : 'irregular'
  }

  return {
    totalCycles: sorted.length,
    averageCycleLength,
    averagePeriodLength,
    shortestCycle,
    longestCycle,
    cycleLengths,
    currentPhase,
    daysUntilNextPeriod,
    regularity,
  }
}

// ============================================================
// 综合分析
// ============================================================

/** 生成综合数据概览 */
export function generateAnalyticsOverview(
  moodRecords: MoodRecord[],
  todos: Todo[],
  periodRecords: PeriodRecord[],
  range: TimeRange
): AnalyticsOverview {
  return {
    mood: calculateMoodTrend(moodRecords, range),
    todo: calculateTodoCompletion(todos, range),
    cycle: calculateCycleStats(periodRecords),
    dateRange: range,
    generatedAt: new Date().toISOString(),
  }
}

/** 生成数据洞察 */
export function generateInsights(overview: AnalyticsOverview): DataInsight[] {
  const insights: DataInsight[] = []
  let idCounter = 0

  // 情绪洞察
  const mood = overview.mood
  if (mood.streakDays >= 7) {
    insights.push({
      id: `insight-${idCounter++}`,
      type: 'mood',
      title: '连续记录达成',
      description: `你已经连续记录情绪 ${mood.streakDays} 天，保持得很好！`,
      severity: 'positive',
    })
  }
  if (mood.averageLevel !== null && mood.averageLevel >= 4) {
    insights.push({
      id: `insight-${idCounter++}`,
      type: 'mood',
      title: '情绪状态良好',
      description: `近期平均情绪等级 ${mood.averageLevel}/5，整体状态不错。`,
      severity: 'positive',
    })
  }
  if (mood.averageLevel !== null && mood.averageLevel <= 2.5) {
    insights.push({
      id: `insight-${idCounter++}`,
      type: 'mood',
      title: '情绪需要关注',
      description: `近期平均情绪等级偏低（${mood.averageLevel}/5），注意休息和自我关怀。`,
      severity: 'warning',
    })
  }

  // Todo 洞察
  const todo = overview.todo
  if (todo.overdueCount > 0) {
    insights.push({
      id: `insight-${idCounter++}`,
      type: 'todo',
      title: '有逾期待办',
      description: `你有 ${todo.overdueCount} 个待办已逾期，建议尽快处理或调整截止时间。`,
      severity: 'warning',
    })
  }
  if (todo.overallCompletionRate >= 0.8) {
    insights.push({
      id: `insight-${idCounter++}`,
      type: 'todo',
      title: '完成率优秀',
      description: `待办完成率 ${Math.round(todo.overallCompletionRate * 100)}%，执行力很强！`,
      severity: 'positive',
    })
  }

  // 周期洞察
  const cycle = overview.cycle
  if (cycle.regularity === 'regular') {
    insights.push({
      id: `insight-${idCounter++}`,
      type: 'cycle',
      title: '周期规律',
      description: `你的周期比较规律，平均 ${cycle.averageCycleLength} 天，经期平均 ${cycle.averagePeriodLength} 天。`,
      severity: 'positive',
    })
  }
  if (cycle.regularity === 'irregular') {
    insights.push({
      id: `insight-${idCounter++}`,
      type: 'cycle',
      title: '周期不太规律',
      description: `周期波动较大（${cycle.shortestCycle}-${cycle.longestCycle} 天），建议持续记录观察。`,
      severity: 'info',
    })
  }
  if (cycle.daysUntilNextPeriod !== null && cycle.daysUntilNextPeriod <= 3) {
    insights.push({
      id: `insight-${idCounter++}`,
      type: 'cycle',
      title: '经期即将到来',
      description: `预计 ${cycle.daysUntilNextPeriod} 天后进入经期，注意休息和保暖。`,
      severity: 'info',
    })
  }

  return insights
}
