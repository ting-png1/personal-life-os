/**
 * EmptyState — 空状态
 *
 * 用于列表为空、无数据、加载失败等场景。
 * surface-soft 背景，图标 + 标题 + 描述 + 可选操作按钮。
 */

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`
        surface-soft rounded-2xl px-6 py-10
        flex flex-col items-center justify-center text-center
        ${className}
      `}
    >
      <div className="text-text-tertiary mb-3">{icon}</div>
      <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-text-tertiary leading-relaxed max-w-[240px] mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
