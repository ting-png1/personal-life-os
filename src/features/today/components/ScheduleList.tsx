import { GlassCard } from '@/shared/ui/GlassCard'
import { ScheduleItem } from '@/features/schedule/components/ScheduleItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Calendar } from 'lucide-react'
import type { ScheduleInstance } from '@/features/schedule/types'

interface ScheduleListProps {
  items: ScheduleInstance[]
  currentItem: ScheduleInstance | null
  onItemClick?: (instance: ScheduleInstance) => void
}

export function ScheduleList({ items, currentItem, onItemClick }: ScheduleListProps) {
  return (
    <GlassCard padding="none">
      {items.length === 0 ? (
        <div className="py-4">
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="今天没有安排"
            description="享受自由时间"
          />
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {items.map((instance) => (
            <ScheduleItem
              key={`${instance.eventId}-${instance.startDateTime}`}
              instance={instance}
              isCurrent={currentItem?.eventId === instance.eventId}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </GlassCard>
  )
}
