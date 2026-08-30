import { Trash2, Calendar, Clock } from 'lucide-react'
import { EmptyState } from '@/shared/ui/EmptyState'
import type { CycleStats, PeriodRecord } from '../types'
import { formatMonthDay } from '@/shared/lib/date'

interface CycleHistoryListProps {
  stats: CycleStats[]
  records: PeriodRecord[]
  onDelete: (id: string) => void
  onEdit?: (record: PeriodRecord) => void
}

export function CycleHistoryList({ stats, records, onDelete, onEdit }: CycleHistoryListProps) {
  if (stats.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="w-8 h-8" />}
        title="还没有经期记录"
        description="记录后可查看历史周期和统计"
      />
    )
  }

  return (
    <div className="space-y-3">
      {stats.map((cycle) => {
        const record = records.find((r) => r.startDate === cycle.periodStartDate)
        return (
          <div
            key={cycle.cycleNumber}
            className="p-3 rounded-lg bg-surface border border-border/50 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* 周期编号和日期 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
                    第 {cycle.cycleNumber} 周期
                  </span>
                  {!cycle.periodEndDate && (
                    <span className="text-xs font-medium text-error bg-error/10 px-2 py-0.5 rounded-full">
                      进行中
                    </span>
                  )}
                </div>

                {/* 经期日期 */}
                <div className="flex items-center gap-1.5 text-sm text-text-primary">
                  <Calendar className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                  <span>
                    {formatMonthDay(cycle.periodStartDate)}
                    {cycle.periodEndDate && ` ~ ${formatMonthDay(cycle.periodEndDate)}`}
                  </span>
                </div>

                {/* 统计信息 */}
                <div className="flex items-center gap-4 mt-2">
                  {cycle.periodLength && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-tertiary" />
                      <span className="text-xs text-text-secondary">经期 {cycle.periodLength} 天</span>
                    </div>
                  )}
                  {cycle.cycleLength && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-text-tertiary" />
                      <span className="text-xs text-text-secondary">周期 {cycle.cycleLength} 天</span>
                    </div>
                  )}
                  {cycle.ovulationDate && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-text-tertiary">
                        排卵日 {formatMonthDay(cycle.ovulationDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 症状和经量 */}
                {record && (record.symptoms.length > 0 || record.flowLevel) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {record.flowLevel && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-primary-50 text-primary-600">
                        经量{record.flowLevel === 1 ? '少' : record.flowLevel === 2 ? '中' : '多'}
                      </span>
                    )}
                    {record.symptoms.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 rounded text-xs bg-surface text-text-secondary border border-border"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && record && (
                  <button
                    onClick={() => onEdit(record)}
                    className="p-1.5 rounded-full text-text-tertiary hover:text-primary-500 hover:bg-primary-50 transition-colors"
                    aria-label="编辑"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                )}
                {record && (
                  <button
                    onClick={() => onDelete(record.id)}
                    className="p-1.5 rounded-full text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                    aria-label="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
