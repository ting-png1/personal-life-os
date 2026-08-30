import { useMemo } from 'react'
import { ScheduleItem } from './ScheduleItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Calendar } from 'lucide-react'
import type { ScheduleEvent, ScheduleInstance } from '../types'
import { expandEventsForDate, getCurrentInstance } from '../services/ScheduleExpander'

interface DayViewProps {
  events: ScheduleEvent[]
  date: string
  onItemClick?: (instance: ScheduleInstance) => void
}

export function DayView({ events, date, onItemClick }: DayViewProps) {
  const instances = useMemo(() => expandEventsForDate(events, date), [events, date])
  const current = useMemo(() => getCurrentInstance(instances), [instances])

  if (instances.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="w-8 h-8" />}
        title="当天没有安排"
        description="点击右下角按钮添加新的日程或课程"
      />
    )
  }

  // 时间轴视图：按小时分块
  const startHour = 7
  const endHour = 22
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

  return (
    <div className="relative">
      {hours.map((hour) => {
        const hourInstances = instances.filter((instance) => {
          const startHour = new Date(instance.startDateTime).getHours()
          return startHour === hour
        })
        return (
          <div key={hour} className="flex gap-3 min-h-[60px] border-b border-border/50">
            <div className="w-12 shrink-0 pt-2">
              <span className="text-xs text-text-tertiary">{String(hour).padStart(2, '0')}:00</span>
            </div>
            <div className="flex-1 py-1 space-y-1">
              {hourInstances.map((instance) => (
                <ScheduleItem
                  key={`${instance.eventId}-${instance.startDateTime}`}
                  instance={instance}
                  isCurrent={current?.eventId === instance.eventId}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
