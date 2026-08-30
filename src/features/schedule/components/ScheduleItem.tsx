import { MapPin } from 'lucide-react'
import type { ScheduleInstance } from '../types'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { SCHEDULE_TYPE_LABELS } from '@/shared/lib/constants'
import { formatTime } from '@/shared/lib/date'

interface ScheduleItemProps {
  instance: ScheduleInstance
  isCurrent?: boolean
  onClick?: (instance: ScheduleInstance) => void
}

export function ScheduleItem({ instance, isCurrent = false, onClick }: ScheduleItemProps) {
  return (
    <div
      className={`
        flex gap-3 p-3 rounded-lg transition-all duration-200
        ${isCurrent ? 'bg-primary-50 border-l-4 border-primary-500' : 'hover:bg-primary-50/50'}
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
          <p className="text-sm font-medium text-text-primary truncate">
            {instance.title}
          </p>
          {isCurrent && (
            <span className="text-xs font-medium text-primary-500 shrink-0">进行中</span>
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
    </div>
  )
}
