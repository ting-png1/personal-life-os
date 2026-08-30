import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

interface TabItem {
  label: string
  icon: ReactNode
  route: string
}

interface TabBarProps {
  items: TabItem[]
  className?: string
}

export function TabBar({ items, className = '' }: TabBarProps) {
  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-surface backdrop-blur-lg border-t border-border
        pb-[env(safe-area-inset-bottom)]
        ${className}
      `}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {items.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            end={item.route === '/'}
            className={({ isActive }) => `
              flex flex-col items-center justify-center gap-0.5 flex-1 h-full
              text-xs transition-colors duration-200
              ${isActive ? 'text-primary-500' : 'text-text-tertiary hover:text-text-secondary'}
            `}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
