// ============================================================
// StatCard - 统计卡片组件
// ============================================================

import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number | null
  subtitle?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
}

const colorClasses = {
  primary: 'bg-primary-50 text-primary-500',
  success: 'bg-success-50 text-success-500',
  warning: 'bg-warning-50 text-warning-500',
  error: 'bg-error-50 text-error-500',
  neutral: 'bg-surface text-text-secondary',
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'primary',
}: StatCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-tertiary mb-1">{title}</p>
          <p className="text-2xl font-bold text-text-primary">
            {value !== null && value !== undefined ? value : '--'}
          </p>
          {subtitle && (
            <p className="text-xs text-text-tertiary mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-2 flex items-center gap-1">
          <span className={`text-xs font-medium ${
            trend === 'up' ? 'text-success-500' : trend === 'down' ? 'text-error-500' : 'text-text-tertiary'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        </div>
      )}
    </div>
  )
}
