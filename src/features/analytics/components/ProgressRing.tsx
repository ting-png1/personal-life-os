// ============================================================
// ProgressRing - 进度环组件
// 纯 SVG 实现
// ============================================================

interface ProgressRingProps {
  value: number // 0-1
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  showLabel?: boolean
  label?: string
  sublabel?: string
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = '#f472b6',
  bgColor = '#f3f4f6',
  showLabel = true,
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
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-primary">
            {label || `${percentage}%`}
          </span>
          {sublabel && (
            <span className="text-xs text-text-tertiary mt-0.5">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
