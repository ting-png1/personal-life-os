/**
 * SectionHeader — 区块标题
 *
 * 用于 Dashboard 各区块（今日日程、今日待办等）的标题行。
 * 左侧标题，右侧可选操作按钮（如"全部"/"更多"）。
 */

import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  action?: ReactNode
  subtitle?: string
  className?: string
}

export function SectionHeader({
  title,
  action,
  subtitle,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
