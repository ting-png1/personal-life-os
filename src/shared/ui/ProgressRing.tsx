interface ProgressRingProps {
  value: number // 0-1
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedValue = Math.max(0, Math.min(1, value))
  const offset = circumference * (1 - clampedValue)
  const percentage = Math.round(clampedValue * 100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(60,45,50,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary-400)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </svg>
      {/* 中心文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-text-primary">{percentage}%</span>
        {label && <span className="text-xs text-text-secondary mt-0.5">{label}</span>}
        {sublabel && <span className="text-[10px] text-text-tertiary">{sublabel}</span>}
      </div>
    </div>
  )
}
