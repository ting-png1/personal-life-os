import { useState } from 'react'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassTextarea } from '@/shared/ui/GlassInput'
import { BottomSheet } from '@/shared/ui/BottomSheet'
import { MoodPicker } from './MoodPicker'
import type { MoodLevel, CreateMoodInput } from '../types'
import { MOOD_PRESET_TAGS } from '@/shared/lib/constants'

interface MoodQuickRecordProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreateMoodInput) => Promise<void>
}

export function MoodQuickRecord({ open, onClose, onSubmit }: MoodQuickRecordProps) {
  const [level, setLevel] = useState<MoodLevel | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleSubmit = async () => {
    if (!level) return
    setLoading(true)
    try {
      await onSubmit({
        level,
        tags,
        note: note.trim() || null,
      })
      // 重置
      setLevel(null)
      setTags([])
      setNote('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="记录心情">
      <div className="space-y-5 pb-4">
        {/* 情绪等级选择 */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-3 text-center">
            今天感觉怎么样？
          </p>
          <MoodPicker value={level} onChange={setLevel} variant="A" size={46} />
        </div>

        {/* 标签选择 */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">标签（可选）</p>
          <div className="flex flex-wrap gap-2">
            {MOOD_PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-all
                  ${tags.includes(tag)
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface text-text-secondary border border-border hover:border-primary-300'
                  }
                `}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 备注 */}
        <GlassTextarea
          label="备注（可选）"
          placeholder="想说点什么..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3 pt-2">
          <GlassButton variant="ghost" onClick={onClose} disabled={loading}>
            取消
          </GlassButton>
          <GlassButton onClick={handleSubmit} loading={loading} disabled={!level}>
            保存
          </GlassButton>
        </div>
      </div>
    </BottomSheet>
  )
}
