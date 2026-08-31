/**
 * StatusBadge — 状态标签
 *
 * 小圆角胶囊，用于日程类型、优先级、心情等级等状态展示。
 *
 * 向后兼容：支持旧版 API（text + color）和新版 API（children + variant）。
 */

import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'
// 向后兼容：支持日程类型作为 variant
type CompatibleVariant = BadgeVariant | 'class' | 'personal' | 'rest' | 'other'

interface StatusBadgeProps {
  variant?: CompatibleVariant
  children?: ReactNode
  size?: 'sm' | 'md'
  className?: string
  // 向后兼容：旧版 API
  text?: string
  color?: string
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-accent-sage/15 text-accent-sage',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/15 text-error',
  info: 'bg-info/15 text-info',
  neutral: 'bg-white/25 text-text-secondary',
  primary: 'bg-primary-400/15 text-primary-500',
}

// 日程类型到 variant 的映射
const SCHEDULE_TYPE_MAP: Record<string, BadgeVariant> = {
  class: 'primary',
  personal: 'info',
  rest: 'success',
  other: 'neutral',
}

export function StatusBadge({
  variant = 'neutral',
  children,
  size = 'sm',
  className = '',
  text,
  color,
}: StatusBadgeProps) {
  // 解析 variant：日程类型映射到标准 variant
  const resolvedVariant: BadgeVariant = SCHEDULE_TYPE_MAP[variant] || (variant as BadgeVariant)

  // 内容：优先 children，其次 text（向后兼容）
  const content = children || text

  // 样式：如果有自定义 color（向后兼容），使用内联样式
  const customStyle = color ? { backgroundColor: `${color}20`, color } : undefined

  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${size === 'sm' ? 'px-2 py-0.5 text-[10px] rounded-md' : 'px-2.5 py-1 text-xs rounded-lg'}
        font-medium
        ${color ? '' : VARIANT_STYLES[resolvedVariant]}
        ${className}
      `}
      style={customStyle}
    >
      {content}
    </span>
  )
}
