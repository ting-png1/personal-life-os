interface SegmentedControlOption<T extends string> {
  label: string
  value: T
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const heightClass = size === 'sm' ? 'h-8' : 'h-10'
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div
      className={`
        inline-flex items-center p-1 rounded-lg
        bg-surface border border-border backdrop-blur-md
        ${heightClass} ${className}
      `}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              px-4 h-full rounded-md font-medium transition-all duration-200
              ${textClass}
              ${isActive
                ? 'bg-surface-solid text-primary-500 shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
