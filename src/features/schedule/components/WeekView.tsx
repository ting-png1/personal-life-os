import { useMemo } from 'react'
import { ScheduleItem } from './ScheduleItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Calendar } from 'lucide-react'
import type { ScheduleEvent, ScheduleInstance } from '../types'
import { expandEventsForDate } from '../services/ScheduleExpander'
import { WEEKDAY_LABELS_SHORT_CN } from '@/shared/lib/constants'
import { format, addDays, startOfWeek, parseISO } from 'date-fns'

interface WeekViewProps {
  events: ScheduleEvent[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onItemClick?: (instance: ScheduleInstance) => void
  onMoreClick?: (instance: ScheduleInstance) => void
}

export function WeekView({ events, selectedDate, onSelectDate, onItemClick, onMoreClick }: WeekViewProps) {
  const weekDays = useMemo(() => {
    const monday = startOfWeek(parseISO(selectedDate + 'T00:00:00'), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i)
      return {
        dateStr: format(date, 'yyyy-MM-dd'),
        dayNum: format(date, 'd'),
        weekday: WEEKDAY_LABELS_SHORT_CN[i],
        isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
        isSelected: format(date, 'yyyy-MM-dd') === selectedDate,
      }
    })
  }, [selectedDate])

  const selectedInstances = useMemo(
    () => expandEventsForDate(events, selectedDate, { includeCancelled: true }),
    [events, selectedDate]
  )

  // 判断某个实例是否被临时取消
  const isInstanceCancelled = (instance: ScheduleInstance): boolean => {
    const event = events.find((e) => e.id === instance.eventId)
    if (!event?.recurrence?.overrides) return false
    const override = event.recurrence.overrides[selectedDate]
    return override?.cancelled === true
  }

  return (
    <div>
      {/* 星期选择栏 */}
      <div className="flex gap-1 mb-4">
        {weekDays.map((day) => (
          <button
            key={day.dateStr}
            onClick={() => onSelectDate(day.dateStr)}
            className={`
              flex-1 flex flex-col items-center py-2 rounded-lg transition-all
              ${day.isSelected
                ? 'bg-primary-500 text-white'
                : day.isToday
                ? 'bg-primary-50 text-primary-600'
                : 'text-text-secondary hover:bg-primary-50/50'
              }
            `}
          >
            <span className="text-xs">{day.weekday}</span>
            <span className="text-sm font-semibold mt-0.5">{day.dayNum}</span>
          </button>
        ))}
      </div>

      {/* 当日日程列表 */}
      {selectedInstances.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title="当天没有安排"
          description="点击右下角按钮添加新的日程或课程"
        />
      ) : (
        <div className="space-y-1">
          {selectedInstances.map((instance) => (
            <ScheduleItem
              key={`${instance.eventId}-${instance.startDateTime}`}
              instance={instance}
              isCancelled={isInstanceCancelled(instance)}
              onClick={onItemClick}
              onMoreClick={onMoreClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
