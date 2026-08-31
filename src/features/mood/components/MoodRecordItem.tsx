import { Trash2, Pencil } from 'lucide-react'
import type { MoodRecord } from '../types'
import { MOOD_LABELS, MOOD_COLORS } from '@/shared/lib/constants'
import { MOOD_EMOJIS } from '../services/moodServices'
import { formatTime } from '@/shared/lib/date'

interface MoodRecordItemProps {
  record: MoodRecord
  onDelete: (id: string) => void
  onEdit: (record: MoodRecord) => void
}

export function MoodRecordItem({ record, onDelete, onEdit }: MoodRecordItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary-50/50 transition-colors group">
      {/* 表情 */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: `${MOOD_COLORS[record.level]}20` }}
      >
        {MOOD_EMOJIS[record.level]}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {MOOD_LABELS[record.level]}
          </span>
          <span className="text-xs text-text-tertiary">
            {formatTime(record.createdAt)}
          </span>
        </div>
        {record.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {record.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {record.note && (
          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{record.note}</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(record)}
          className="p-1.5 rounded-full text-text-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
          aria-label="编辑"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(record.id)}
          className="p-1.5 rounded-full text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
          aria-label="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
