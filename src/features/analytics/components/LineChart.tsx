// ============================================================
// LineChart - 折线图组件
// 纯 SVG 实现，不依赖图表库
// ============================================================

interface LineChartDataPoint {
  label: string
  value: number | null
  sublabel?: string
}

interface LineChartProps {
  data: LineChartDataPoint[]
  height?: number
  color?: string
  showDots?: boolean
  showArea?: boolean
  minValue?: number
  maxValue?: number
}

export function LineChart({
  data,
  height = 160,
  color = '#f472b6',
  showDots = true,
  showArea = true,
  minValue = 0,
  maxValue = 5,
}: LineChartProps) {
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

  const padding = { top: 20, right: 10, bottom: 25, left: 10 }
  const chartWidth = 100
  const chartHeight = height - padding.top - padding.bottom
  const range = maxValue - minValue

  // 计算点的位置
  const points = data.map((point, index) => {
    const x = padding.left + (index / (data.length - 1 || 1)) * (chartWidth - padding.left - padding.right)
    const y = point.value !== null
      ? padding.top + chartHeight - ((point.value - minValue) / range) * chartHeight
      : null
    return { x, y, value: point.value, label: point.sublabel || point.label }
  })

  // 生成折线路径
  const validPoints = points.filter((p) => p.y !== null)
  const linePath = validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // 生成面积路径
  const areaPath = validPoints.length > 0
    ? `${linePath} L ${validPoints[validPoints.length - 1].x} ${padding.top + chartHeight} L ${validPoints[0].x} ${padding.top + chartHeight} Z`
    : ''

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
      >
        {/* 网格线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={padding.top + chartHeight * ratio}
            x2={chartWidth - padding.right}
            y2={padding.top + chartHeight * ratio}
            stroke="#f3f4f6"
            strokeWidth="0.3"
          />
        ))}

        {/* 面积 */}
        {showArea && areaPath && (
          <path
            d={areaPath}
            fill={color}
            opacity="0.1"
          />
        )}

        {/* 折线 */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* 数据点 */}
        {showDots && validPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y as number}
            r="1.5"
            fill="white"
            stroke={color}
            strokeWidth="1"
          />
        ))}

        {/* 标签（只显示首尾和中间） */}
        {points.length > 0 && (
          <>
            <text
              x={points[0].x}
              y={height - 8}
              textAnchor="start"
              fontSize="6"
              fill="#9ca3af"
            >
              {points[0].label}
            </text>
            <text
              x={points[points.length - 1].x}
              y={height - 8}
              textAnchor="end"
              fontSize="6"
              fill="#9ca3af"
            >
              {points[points.length - 1].label}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
