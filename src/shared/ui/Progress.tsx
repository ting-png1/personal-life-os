interface ProgressProps {
  value: number // 0 - 1
  showLabel?: boolean
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function Progress({ value, showLabel = false, label, size = 'md', className = '' }: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(1, value))
  const percent = Math.round(clampedValue * 100)
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${heightClass} rounded-full bg-primary-100 overflow-hidden`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-300 to-primary-500 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1.5 text-xs text-text-secondary">
          {label || `${percent}%`}
        </p>
      )}
    </div>
  )
}
