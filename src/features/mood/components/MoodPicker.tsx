import type { MoodLevel } from '../types'
import { MOOD_LABELS, MOOD_COLORS } from '@/shared/lib/constants'
import { MOOD_EMOJIS } from '../services/moodServices'

interface MoodPickerProps {
  value?: MoodLevel | null
  onChange: (level: MoodLevel) => void
  size?: 'sm' | 'md' | 'lg'
}

export function MoodPicker({ value, onChange, size = 'md' }: MoodPickerProps) {
  const sizeClasses = {
    sm: 'w-9 h-9 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-14 h-14 text-3xl',
  }

  const levels: MoodLevel[] = [1, 2, 3, 4, 5]

  return (
    <div className="flex items-center justify-center gap-2">
      {levels.map((level) => {
        const isSelected = value === level
        return (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`
              ${sizeClasses[size]} rounded-full flex items-center justify-center
              transition-all duration-200 hover:scale-110 active:scale-95
              ${isSelected
                ? 'ring-2 ring-offset-2 ring-offset-bg'
                : 'opacity-70 hover:opacity-100'
              }
            `}
            style={{
              backgroundColor: isSelected ? `${MOOD_COLORS[level]}30` : 'transparent',
              // @ts-expect-error CSS custom property
              '--tw-ring-color': MOOD_COLORS[level],
            }}
            aria-label={MOOD_LABELS[level]}
            title={MOOD_LABELS[level]}
          >
            {MOOD_EMOJIS[level]}
          </button>
        )
      })}
    </div>
  )
}
