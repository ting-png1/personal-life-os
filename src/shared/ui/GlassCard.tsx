import type { ReactNode, HTMLAttributes } from 'react'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  none: '',
}

export function GlassCard({ children, hover = false, padding = 'md', className = '', ...rest }: GlassCardProps) {
  return (
    <div
      className={`
        glass
        ${paddingMap[padding]}
        ${hover ? 'glass-hover transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  )
}
