import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {action}
    </div>
  )
}
