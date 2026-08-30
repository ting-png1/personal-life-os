import { Droplets, Calendar, Clock, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { CurrentCycleState } from '../types'
import {
  CYCLE_PHASE_LABELS,
  CYCLE_PHASE_COLORS,
  CYCLE_PHASE_DESCRIPTIONS,
} from '@/shared/lib/constants'
import { formatMonthDay } from '@/shared/lib/date'

interface CycleStatusCardProps {
  state: CurrentCycleState
  onRecordClick?: () => void
  onEndPeriodClick?: () => void
}

export function CycleStatusCard({ state, onRecordClick, onEndPeriodClick }: CycleStatusCardProps) {
  // 无数据状态
  if (state.recordCount === 0 && !state.hasEnoughData) {
    return (
      <GlassCard>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
            <Droplets className="w-6 h-6 text-primary-400" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">还没有经期记录</p>
          <p className="text-xs text-text-tertiary mb-4">记录后可预测下次经期和周期阶段</p>
          {onRecordClick && (
            <button
              onClick={onRecordClick}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              记录经期
            </button>
          )}
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard>
      <div className="space-y-3">
        {/* 顶部：当前状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary-400" />
            <span className="text-sm font-medium text-text-primary">周期状态</span>
          </div>
          {state.currentPhase && (
            <StatusBadge
              text={CYCLE_PHASE_LABELS[state.currentPhase]}
              color={CYCLE_PHASE_COLORS[state.currentPhase]}
            />
          )}
        </div>

        {/* 经期中 */}
        {state.isInPeriod && state.periodDay && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-error">经期中 · 第 {state.periodDay} 天</p>
                {state.currentPeriodRecord?.flowLevel && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    经量：{state.currentPeriodRecord.flowLevel === 1 ? '少' : state.currentPeriodRecord.flowLevel === 2 ? '中' : '多'}
                  </p>
                )}
              </div>
              {onEndPeriodClick && (
                <button
                  onClick={onEndPeriodClick}
                  className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-medium hover:bg-error/90 transition-colors"
                >
                  记录结束
                </button>
              )}
            </div>
          </div>
        )}

        {/* 非经期：距下次经期 */}
        {!state.isInPeriod && state.nextPeriodDate && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-text-secondary">
                距下次经期还有
                <span className="text-lg font-bold text-primary-500 mx-1">
                  {state.daysUntilNextPeriod !== null && state.daysUntilNextPeriod > 0
                    ? state.daysUntilNextPeriod
                    : state.isDelayed
                    ? `推迟 ${state.delayDays}`
                    : '就在今天'}
                </span>
                天
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                预测日期：{formatMonthDay(state.nextPeriodDate)}
              </p>
            </div>
          </div>
        )}

        {/* 推迟提醒 */}
        {state.isDelayed && !state.isInPeriod && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-xs text-text-secondary">
              经期已推迟 {state.delayDays} 天，如持续推迟建议关注身体状况
            </p>
          </div>
        )}

        {/* 阶段说明 */}
        {state.currentPhase && !state.isInPeriod && (
          <p className="text-xs text-text-tertiary">
            {CYCLE_PHASE_DESCRIPTIONS[state.currentPhase]}
          </p>
        )}

        {/* 数据不足提示 */}
        {!state.hasEnoughData && state.recordCount > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <Clock className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
            <p className="text-xs text-text-tertiary">
              已记录 {state.recordCount} 次经期，再记录 {Math.max(0, 3 - state.recordCount)} 次后预测更准确
            </p>
          </div>
        )}

        {/* 统计信息 */}
        {state.hasEnoughData && (
          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <div className="text-center">
              <p className="text-base font-bold text-text-primary">{state.averageCycleLength}</p>
              <p className="text-xs text-text-tertiary">平均周期（天）</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-base font-bold text-text-primary">{state.averagePeriodLength}</p>
              <p className="text-xs text-text-tertiary">平均经期（天）</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-base font-bold text-text-primary">{state.recordedCycles}</p>
              <p className="text-xs text-text-tertiary">已记录周期</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
