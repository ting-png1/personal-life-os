import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-300 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-text-secondary mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
