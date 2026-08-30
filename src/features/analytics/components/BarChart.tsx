// ============================================================
// BarChart - 柱状图组件
// 纯 SVG 实现，不依赖图表库
// ============================================================

interface BarChartDataPoint {
  label: string
  value: number
  sublabel?: string
}

interface BarChartProps {
  data: BarChartDataPoint[]
  height?: number
  color?: string
  showValues?: boolean
  maxValue?: number
}

export function BarChart({
  data,
  height = 160,
  color = '#f472b6',
  showValues = false,
  maxValue,
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-text-tertiary text-sm"
        style={{ height }}
      >
        暂无数据
      </div>
    )
  }

  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1)
  const barWidth = 100 / data.length
  const padding = 2

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {data.map((point, index) => {
          const barHeight = max > 0 ? (point.value / max) * (height - 30) : 0
          const x = index * barWidth + padding
          const width = barWidth - padding * 2
          const y = height - 20 - barHeight

          return (
            <g key={index}>
              {/* 柱子 */}
              <rect
                x={x}
                y={y}
                width={width}
                height={barHeight}
                rx={2}
                fill={color}
                opacity={point.value > 0 ? 0.8 : 0.2}
              />
              {/* 数值 */}
              {showValues && point.value > 0 && (
                <text
                  x={x + width / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6b7280"
                >
                  {point.value}
                </text>
              )}
              {/* 标签 */}
              <text
                x={x + width / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="7"
                fill="#9ca3af"
              >
                {point.sublabel || point.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
