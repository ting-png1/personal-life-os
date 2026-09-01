import { MapPin, MoreHorizontal } from 'lucide-react'
import type { ScheduleInstance } from '../types'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { SCHEDULE_TYPE_LABELS } from '@/shared/lib/constants'
import { formatTime } from '@/shared/lib/date'

interface ScheduleItemProps {
  instance: ScheduleInstance
  isCurrent?: boolean
  isCancelled?: boolean
  onClick?: (instance: ScheduleInstance) => void
  onMoreClick?: (instance: ScheduleInstance) => void
}

export function ScheduleItem({ instance, isCurrent = false, isCancelled = false, onClick, onMoreClick }: ScheduleItemProps) {
  return (
    <div
      className={`
        flex gap-3 p-3 rounded-lg transition-all duration-200 group
        ${isCurrent ? 'bg-primary-50 border-l-4 border-primary-500' : 'hover:bg-primary-50/50'}
        ${isCancelled ? 'opacity-50' : ''}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={() => onClick?.(instance)}
    >
      {/* 时间 */}
      <div className="flex flex-col items-center justify-center shrink-0 w-14">
        <span className="text-sm font-semibold text-text-primary">
          {formatTime(instance.startDateTime)}
        </span>
        <span className="text-xs text-text-tertiary">
          {formatTime(instance.endDateTime)}
        </span>
      </div>

      {/* 分隔线 */}
      <div className="w-px bg-border shrink-0" />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${isCancelled ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
            {instance.title}
          </p>
          {isCurrent && (
            <span className="text-xs font-medium text-primary-500 shrink-0">进行中</span>
          )}
          {isCancelled && (
            <span className="text-xs font-medium text-text-tertiary shrink-0">已取消</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <StatusBadge text={SCHEDULE_TYPE_LABELS[instance.type]} variant={instance.type} />
          {instance.location && (
            <span className="flex items-center gap-1 text-xs text-text-tertiary truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {instance.location}
            </span>
          )}
        </div>
      </div>

      {/* 更多操作按钮 */}
      {onMoreClick && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoreClick(instance)
          }}
          className="shrink-0 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/40 transition-all text-text-tertiary hover:text-text-primary"
          aria-label="更多操作"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
