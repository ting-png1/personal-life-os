import { useState } from 'react'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassButton } from '@/shared/ui/GlassButton'
import { MoodPicker } from '@/features/mood/components/MoodPicker'
import { MoodLifeformB } from '@/features/mood/components/MoodLifeformB'
import type { MoodRecord, MoodLevel } from '@/features/mood/types'
import type { DailyMoodResult } from '@/features/mood/services/moodAggregator'
import { MOOD_LABELS, MOOD_COLORS } from '@/shared/lib/constants'

interface MoodCardProps {
  latest: MoodRecord | null
  hasRecorded: boolean
  count: number
  daily: DailyMoodResult
  onQuickPick: (level: MoodLevel) => void
  onOpenRecord: () => void
}

export function MoodCard({ latest, hasRecorded, count, daily, onQuickPick, onOpenRecord }: MoodCardProps) {
  // 本地选中状态：第一次点击只选中，不保存；确认后才调用 onQuickPick
  const [selectedLevel, setSelectedLevel] = useState<MoodLevel | null>(null)

  const handleSelect = (level: MoodLevel) => {
    setSelectedLevel(level)
  }

  const handleConfirm = () => {
    if (selectedLevel) {
      onQuickPick(selectedLevel)
      setSelectedLevel(null)
    }
  }

  const handleCancel = () => {
    setSelectedLevel(null)
  }

  return (
    <GlassCard>
      {hasRecorded && latest ? (
        <div className="flex items-center gap-4">
          {/* 中央动态 Mood Lifeform：用最新 MoodRecord 驱动，后续 Daily Mood 稳定后切换为 Daily Mood */}
          <MoodLifeformB
            level={latest.level}
            size={72}
            animate={true}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold" style={{ color: MOOD_COLORS[latest.level] }}>
              {MOOD_LABELS[latest.level]}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5">
              今天已记录 {count} 次
            </p>
            {/* Daily Mood 全天聚合摘要（派生结果，不持久化） */}
            {daily.sufficiency !== 'unknown' && (
              <p className="text-xs text-text-tertiary mt-0.5">
                {daily.summary}
              </p>
            )}
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
          <p className="text-sm font-medium text-text-primary mb-3">
            {selectedLevel ? '确认记录今天的心情' : '今天感觉怎么样？'}
          </p>

          {/* 心情选择器：value 绑定本地 selectedLevel，第一次点击只选中不保存 */}
          <MoodPicker
            value={selectedLevel}
            onChange={handleSelect}
            variant="A"
            size={40}
          />

          {/* 选中后显示确认区域：二次确认才保存 */}
          {selectedLevel && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <p className="text-xs text-text-secondary mb-3">
                已选择：
                <span className="font-semibold ml-1" style={{ color: MOOD_COLORS[selectedLevel] }}>
                  {MOOD_LABELS[selectedLevel]}
                </span>
              </p>
              <div className="flex justify-center gap-3">
                <GlassButton variant="ghost" size="sm" onClick={handleCancel}>
                  重新选择
                </GlassButton>
                <GlassButton size="sm" onClick={handleConfirm}>
                  确认记录
                </GlassButton>
              </div>
            </div>
          )}

          {!selectedLevel && (
            <button
              onClick={onOpenRecord}
              className="mt-3 text-xs text-text-tertiary hover:text-primary-500 transition-colors"
            >
              添加标签和备注
            </button>
          )}
        </div>
      )}
    </GlassCard>
  )
}
