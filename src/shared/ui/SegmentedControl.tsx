/**
 * SegmentedControl — 分段选择器
 *
 * glass-subtle 背景，选中项有主色微背景，平滑过渡。
 */

import { useId } from 'react'

interface SegmentedOption<T extends string> {
  label: string
  value: T
  icon?: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const baseId = useId()

  return (
    <div
      className={`
        inline-flex p-1 rounded-[12px]
        glass-subtle
        ${className}
      `}
      role="tablist"
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            id={`${baseId}-${option.value}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`
              relative inline-flex items-center justify-center gap-1.5
              ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
              rounded-[9px] font-medium
              transition-all duration-normal ease-standard
              ${isActive
                ? 'bg-primary-400/15 text-primary-500 shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-white/20'
              }
            `}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
