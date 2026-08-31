/**
 * MoodTrendChart — 心情趋势折线图（原生 SVG）
 *
 * 可复用组件，用于 TodayPage 和 WellnessPage。
 * 接收心情历史数据，渲染平滑曲线 + 填充区域 + 数据点 + 日期标签。
 */

import type { MoodLevel } from '@/features/mood/types'

export interface MoodTrendData {
  day: string
  level: MoodLevel
}

interface MoodTrendChartProps {
  data: MoodTrendData[]
  height?: number
  showArea?: boolean
  showPoints?: boolean
  showLabels?: boolean
}

export function MoodTrendChart({
  data,
  height = 100,
  showArea = true,
  showPoints = true,
  showLabels = true,
}: MoodTrendChartProps) {
  const width = 320
  const padding = { top: 16, right: 16, bottom: showLabels ? 24 : 12, left: 16 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  if (data.length === 0) return null

  const points = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
    const y = padding.top + chartH - ((d.level - 1) / 4) * chartH
    return { x, y, ...d }
  })

  // 平滑曲线（贝塞尔）
  const pathD = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = arr[i - 1]
    const cpx = (prev.x + p.x) / 2
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`
  }, '')

  // 填充区域
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="心情趋势图"
    >
      <defs>
        <linearGradient id="mood-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary-400)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-primary-400)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 水平参考线 */}
      {[1, 2, 3, 4, 5].map((level) => {
        const y = padding.top + chartH - ((level - 1) / 4) * chartH
        return (
          <line
            key={level}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="rgba(60,45,50,0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )
      })}

      {/* 填充区域 */}
      {showArea && <path d={areaD} fill="url(#mood-area-grad)" />}

      {/* 曲线 */}
      <path
        d={pathD}
        style={{
          fill: 'none',
          stroke: 'var(--color-primary-400)',
          strokeWidth: 2,
          strokeLinecap: 'round',
        }}
      />

      {/* 数据点 */}
      {showPoints &&
        points.map((p, i) => (
          <g key={i}>
            {/* 外层柔光 */}
            <circle
              cx={p.x}
              cy={p.y}
              r={5}
              style={{ fill: 'var(--color-primary-400)', opacity: 0.15 }}
            />
            {/* 数据点本体：暖白填充 + 主色描边 */}
            <circle
              cx={p.x}
              cy={p.y}
              r={3}
              style={{
                fill: 'var(--color-bg-warm)',
                stroke: 'var(--color-primary-400)',
                strokeWidth: 1.5,
              }}
            />
            {showLabels && (
              <text
                x={p.x}
                y={height - 6}
                textAnchor="middle"
                fontSize="9"
                style={{ fill: 'var(--color-text-tertiary)' }}
              >
                {p.day}
              </text>
            )}
          </g>
        ))}
    </svg>
  )
}
