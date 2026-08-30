interface StatusBadgeProps {
  text: string
  color?: string // CSS 颜色值，如 'var(--color-type-class)'
  variant?: 'class' | 'personal' | 'rest' | 'other' | 'priority-high' | 'priority-medium' | 'priority-low'
  className?: string
}

const variantColors: Record<string, string> = {
  class: 'var(--color-type-class)',
  personal: 'var(--color-type-personal)',
  rest: 'var(--color-type-rest)',
  other: 'var(--color-type-other)',
  'priority-high': 'var(--color-error)',
  'priority-medium': 'var(--color-warning)',
  'priority-low': 'var(--color-info)',
}

export function StatusBadge({ text, color, variant, className = '' }: StatusBadgeProps) {
  const bgColor = color || (variant ? variantColors[variant] : 'var(--color-primary-300)')
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${bgColor}20`,
        color: bgColor,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bgColor }} />
      {text}
    </span>
  )
}
