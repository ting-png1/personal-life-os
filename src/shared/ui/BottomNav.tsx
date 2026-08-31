import { NavLink } from 'react-router-dom'
import { Home, Calendar, CheckSquare, Heart, MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

interface TabItem {
  label: string
  icon: ReactNode
  route: string
}

const NAV_ITEMS: TabItem[] = [
  { label: '今日', icon: <Home size={22} strokeWidth={1.75} />, route: '/today' },
  { label: '日程', icon: <Calendar size={22} strokeWidth={1.75} />, route: '/schedule' },
  { label: '待办', icon: <CheckSquare size={22} strokeWidth={1.75} />, route: '/todo' },
  { label: '状态', icon: <Heart size={22} strokeWidth={1.75} />, route: '/wellness' },
  { label: '更多', icon: <MoreHorizontal size={22} strokeWidth={1.75} />, route: '/more' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)] max-w-[440px]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      aria-label="主导航"
    >
      <div
        className="glass flex items-center justify-around h-16"
        style={{ borderRadius: 'var(--radius-2xl)' }}
      >
        {/* 动态玻璃微光 */}
        <div className="glass-sheen" />

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.route}
            to={item.route}
            end={item.route === '/today'}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center gap-0.5
              flex-1 h-full
              text-[11px] font-medium
              transition-all duration-normal ease-standard
              ${isActive ? 'text-primary-400' : 'text-text-tertiary hover:text-text-secondary'}
            `}
          >
            {({ isActive }) => (
              <>
                {/* 激活态背景微圆 */}
                {isActive && (
                  <span
                    className="absolute top-1.5 w-10 h-10 rounded-full"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary-400) 14%, transparent)' }}
                  />
                )}
                <span className={`relative z-10 transition-transform duration-fast ${isActive ? 'scale-105' : ''}`}>
                  {item.icon}
                </span>
                <span className="relative z-10">{item.label}</span>
                {/* 激活态底部短横线 */}
                {isActive && (
                  <span
                    className="absolute bottom-1 w-4 h-[3px] rounded-full"
                    style={{ backgroundColor: 'var(--color-primary-400)' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
