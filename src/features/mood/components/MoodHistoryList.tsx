import { MoodRecordItem } from './MoodRecordItem'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Heart } from 'lucide-react'
import type { MoodRecord } from '../types'

interface MoodHistoryListProps {
  records: MoodRecord[]
  onDelete: (id: string) => void
  onEdit: (record: MoodRecord) => void
}

export function MoodHistoryList({ records, onDelete, onEdit }: MoodHistoryListProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="w-8 h-8" />}
        title="还没有心情记录"
        description="点击下方按钮记录今天的心情"
      />
    )
  }

  // 按日期分组，同一天内按时间降序（最新在前）
  const grouped = records.reduce<Record<string, MoodRecord[]>>((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = []
    }
    acc[record.date].push(record)
    return acc
  }, {})

  // 同一天内显式按 createdAt 降序排序，不依赖传入数组顺序
  Object.keys(grouped).forEach((date) => {
    grouped[date].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })

  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      {dates.map((date) => (
        <div key={date}>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">{date}</p>
          <div className="space-y-1">
            {grouped[date].map((record) => (
              <MoodRecordItem key={record.id} record={record} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
