/**
 * CleanCard — 轻结构内容卡片
 *
 * 基于 surface-soft 的简单卡片容器，用于普通内容区。
 * 与 GlassCard（玻璃材质）区分使用：普通内容用 CleanCard，重要交互/浮层用玻璃。
 */

import type { ReactNode } from 'react'

interface CleanCardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const PADDING_CLASSES: Record<NonNullable<CleanCardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function CleanCard({
  children,
  className = '',
  padding = 'md',
}: CleanCardProps) {
  return (
    <div className={`surface-soft rounded-2xl ${PADDING_CLASSES[padding]} ${className}`}>
      {children}
    </div>
  )
}
