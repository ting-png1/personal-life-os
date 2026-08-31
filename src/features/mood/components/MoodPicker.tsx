import { MoodLifeformA } from './MoodLifeformA'
import { MoodLifeformB } from './MoodLifeformB'
import { MOOD_LABELS } from './MoodLifeformA'
import type { MoodLevel } from './MoodLifeformA'

export type MoodVariant = 'A' | 'B'

interface MoodPickerProps {
  value: MoodLevel | null
  onChange: (level: MoodLevel) => void
  variant: MoodVariant
  size?: number
}

const LEVELS: MoodLevel[] = [1, 2, 3, 4, 5]

export function MoodPicker({ value, onChange, variant, size = 52 }: MoodPickerProps) {
  const Lifeform = variant === 'A' ? MoodLifeformA : MoodLifeformB

  return (
    <div
      className="flex items-center justify-center gap-1 sm:gap-2"
      role="radiogroup"
      aria-label="选择今日心情"
    >
      {LEVELS.map((level) => {
        const isSelected = value === level
        return (
          <button
            key={level}
            role="radio"
            aria-checked={isSelected}
            aria-label={MOOD_LABELS[level]}
            onClick={() => onChange(level)}
            className={`
              relative flex flex-col items-center justify-center
              rounded-2xl transition-all duration-normal ease-standard
              ${isSelected ? 'scale-110 shadow-md' : 'opacity-50 hover:opacity-85 hover:scale-105'}
            `}
            style={{
              width: size + 12,
              height: size + 24,
              backgroundColor: isSelected
                ? 'color-mix(in srgb, var(--color-primary-400) 18%, white)'
                : 'transparent',
              border: isSelected
                ? '1.5px solid color-mix(in srgb, var(--color-primary-400) 45%, transparent)'
                : '1.5px solid transparent',
              backdropFilter: isSelected ? 'var(--blur-content)' : 'none',
              WebkitBackdropFilter: isSelected ? 'var(--blur-content)' : 'none',
              boxShadow: isSelected
                ? '0 4px 16px color-mix(in srgb, var(--color-primary-400) 20%, transparent)'
                : 'none',
            }}
          >
            <Lifeform level={level} size={size} animate={isSelected} />
            <span
              className={`text-[10px] mt-0.5 font-semibold transition-colors duration-normal ${
                isSelected ? '' : ''
              }`}
              style={{
                color: isSelected ? 'var(--color-primary-500)' : 'var(--color-text-tertiary)',
              }}
            >
              {MOOD_LABELS[level]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
