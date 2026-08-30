// ============================================================
// AnalyticsPage - 数据分析页面
// ============================================================

import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Heart, CheckSquare, Calendar, TrendingUp, Sparkles } from 'lucide-react'
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'
import { BarChart } from '@/features/analytics/components/BarChart'
import { LineChart } from '@/features/analytics/components/LineChart'
import { ProgressRing } from '@/features/analytics/components/ProgressRing'
import { StatCard } from '@/features/analytics/components/StatCard'
import { GlassCard } from '@/shared/ui/GlassCard'
import type { TimeRange } from '@/features/analytics/types'

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '7days', label: '近7天' },
  { value: '30days', label: '近30天' },
  { value: '90days', label: '近90天' },
]

export function AnalyticsPage() {
  const navigate = useNavigate()
  const {
    moodStats,
    todoStats,
    cycleStats,
    insights,
    timeRange,
    setTimeRange,
    isLoading,
  } = useAnalytics()

  return (
    <div className="min-h-screen pb-24">
      {/* 顶部导航 */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/more')}
          className="p-1.5 rounded-full text-text-secondary hover:bg-primary-50 transition-colors"
          aria-label="返回"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-text-primary">数据分析</h1>
      </div>

      {/* 时间范围选择 */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 p-1 rounded-xl bg-surface">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range.value
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="px-5 py-12 text-center text-text-tertiary text-sm">
          正在分析数据...
        </div>
      )}

      {!isLoading && (
        <div className="px-5 space-y-5">
          {/* 数据概览卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="平均情绪"
              value={moodStats?.averageLevel !== null ? `${moodStats?.averageLevel}/5` : '--'}
              subtitle={moodStats?.mostCommonMood || '暂无记录'}
              icon={<Heart className="w-5 h-5" />}
              color="primary"
            />
            <StatCard
              title="待办完成率"
              value={todoStats ? `${Math.round(todoStats.overallCompletionRate * 100)}%` : '--'}
              subtitle={`已完成 ${todoStats?.completedTodos || 0} / ${todoStats?.totalTodos || 0}`}
              icon={<CheckSquare className="w-5 h-5" />}
              color="success"
            />
            <StatCard
              title="连续记录"
              value={moodStats ? `${moodStats.streakDays}天` : '--'}
              subtitle="情绪记录天数"
              icon={<TrendingUp className="w-5 h-5" />}
              color="warning"
            />
            <StatCard
              title="周期状态"
              value={cycleStats?.currentPhase || '--'}
              subtitle={cycleStats?.daysUntilNextPeriod !== null ? `${cycleStats?.daysUntilNextPeriod}天后经期` : '暂无数据'}
              icon={<Calendar className="w-5 h-5" />}
              color="primary"
            />
          </div>

          {/* 情绪趋势 */}
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-primary">情绪趋势</h3>
                <span className="text-xs text-text-tertiary">
                  最高 {moodStats?.highestLevel || '--'} · 最低 {moodStats?.lowestLevel || '--'}
                </span>
              </div>
              {moodStats && moodStats.points.some((p) => p.level !== null) ? (
                <LineChart
                  data={moodStats.points.map((p) => ({
                    label: p.weekday,
                    value: p.level,
                    sublabel: p.date.slice(5),
                  }))}
                  minValue={1}
                  maxValue={5}
                  color="#f472b6"
                />
              ) : (
                <div className="py-8 text-center text-text-tertiary text-sm">
                  暂无情绪记录，去记录一条吧
                </div>
              )}
            </div>
          </GlassCard>

          {/* 待办完成率 */}
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-primary">待办完成率</h3>
                <span className="text-xs text-text-tertiary">
                  逾期 {todoStats?.overdueCount || 0} 项
                </span>
              </div>
              <div className="flex items-center gap-6">
                <ProgressRing
                  value={todoStats?.overallCompletionRate || 0}
                  size={100}
                  color="#34d399"
                  sublabel="总完成率"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">已完成</span>
                    <span className="font-medium text-text-primary">{todoStats?.completedTodos || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">待处理</span>
                    <span className="font-medium text-text-primary">{todoStats?.pendingCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">日均完成</span>
                    <span className="font-medium text-text-primary">{todoStats?.averageDailyCompletion || 0}</span>
                  </div>
                </div>
              </div>
              {todoStats && todoStats.points.some((p) => p.total > 0) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-text-tertiary mb-2">每日完成情况</p>
                  <BarChart
                    data={todoStats.points.map((p) => ({
                      label: p.weekday,
                      value: p.completed,
                      sublabel: p.date.slice(5),
                    }))}
                    height={120}
                    color="#34d399"
                    showValues
                  />
                </div>
              )}
            </div>
          </GlassCard>

          {/* 周期统计 */}
          <GlassCard>
            <div className="p-4">
              <h3 className="text-base font-semibold text-text-primary mb-4">周期统计</h3>
              {cycleStats && cycleStats.totalCycles > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-primary-50/50">
                      <p className="text-xs text-text-tertiary mb-1">平均周期</p>
                      <p className="text-lg font-bold text-text-primary">
                        {cycleStats.averageCycleLength || '--'} 天
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary-50/50">
                      <p className="text-xs text-text-tertiary mb-1">平均经期</p>
                      <p className="text-lg font-bold text-text-primary">
                        {cycleStats.averagePeriodLength || '--'} 天
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface/50">
                      <p className="text-xs text-text-tertiary mb-1">最短周期</p>
                      <p className="text-lg font-bold text-text-primary">
                        {cycleStats.shortestCycle || '--'} 天
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface/50">
                      <p className="text-xs text-text-tertiary mb-1">最长周期</p>
                      <p className="text-lg font-bold text-text-primary">
                        {cycleStats.longestCycle || '--'} 天
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-text-secondary">规律程度</span>
                    <span className={`text-sm font-medium ${
                      cycleStats.regularity === 'regular' ? 'text-success-500' :
                      cycleStats.regularity === 'irregular' ? 'text-warning-500' :
                      'text-text-tertiary'
                    }`}>
                      {cycleStats.regularity === 'regular' ? '规律' :
                       cycleStats.regularity === 'irregular' ? '不太规律' :
                       '数据不足'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-text-tertiary text-sm">
                  暂无周期记录，去记录一条吧
                </div>
              )}
            </div>
          </GlassCard>

          {/* 数据洞察 */}
          {insights.length > 0 && (
            <GlassCard>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  <h3 className="text-base font-semibold text-text-primary">数据洞察</h3>
                </div>
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`p-3 rounded-xl border ${
                        insight.severity === 'positive' ? 'bg-success-50/50 border-success-100' :
                        insight.severity === 'warning' ? 'bg-warning-50/50 border-warning-100' :
                        'bg-surface/50 border-border'
                      }`}
                    >
                      <p className={`text-sm font-medium ${
                        insight.severity === 'positive' ? 'text-success-600' :
                        insight.severity === 'warning' ? 'text-warning-600' :
                        'text-text-primary'
                      }`}>
                        {insight.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">{insight.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </div>
  )
}
