import { GlassCard } from '@/shared/ui/GlassCard'
import { MoodPicker } from '@/features/mood/components/MoodPicker'
import type { MoodRecord, MoodLevel } from '@/features/mood/types'
import { MOOD_LABELS, MOOD_COLORS } from '@/shared/lib/constants'
import { MOOD_EMOJIS } from '@/features/mood/services/moodServices'

interface MoodCardProps {
  latest: MoodRecord | null
  hasRecorded: boolean
  onQuickPick: (level: MoodLevel) => void
  onOpenRecord: () => void
}

export function MoodCard({ latest, hasRecorded, onQuickPick, onOpenRecord }: MoodCardProps) {
  return (
    <GlassCard>
      {hasRecorded && latest ? (
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0"
            style={{ backgroundColor: `${MOOD_COLORS[latest.level]}20` }}
          >
            {MOOD_EMOJIS[latest.level]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold" style={{ color: MOOD_COLORS[latest.level] }}>
              {MOOD_LABELS[latest.level]}
            </p>
            {latest.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {latest.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onOpenRecord}
            className="text-xs text-primary-500 font-medium hover:underline shrink-0"
          >
            再记一条
          </button>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm font-medium text-text-primary mb-3">今天感觉怎么样？</p>
          <MoodPicker onChange={onQuickPick} size="md" />
          <button
            onClick={onOpenRecord}
            className="mt-3 text-xs text-text-tertiary hover:text-primary-500 transition-colors"
          >
            添加标签和备注
          </button>
        </div>
      )}
    </GlassCard>
  )
}
