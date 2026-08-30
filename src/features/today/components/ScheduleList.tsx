import { GlassCard } from '@/shared/ui/GlassCard'
import { SectionHeader } from '@/shared/ui/SectionHeader'
import { ScheduleItem } from '@/features/schedule/components/ScheduleItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Calendar } from 'lucide-react'
import type { ScheduleInstance } from '@/features/schedule/types'

interface ScheduleListProps {
  items: ScheduleInstance[]
  currentItem: ScheduleInstance | null
  onItemClick?: (instance: ScheduleInstance) => void
  onAddClick?: () => void
}

export function ScheduleList({ items, currentItem, onItemClick, onAddClick }: ScheduleListProps) {
  return (
    <div>
      <SectionHeader
        title="今日安排"
        action={
          onAddClick && (
            <button
              onClick={onAddClick}
              className="text-xs text-primary-500 font-medium hover:underline"
            >
              添加
            </button>
          )
        }
      />
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
    </div>
  )
}
