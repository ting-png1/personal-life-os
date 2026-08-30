import { Outlet } from 'react-router-dom'
import { Home, Calendar, CheckSquare, Heart, MoreHorizontal } from 'lucide-react'
import { TabBar } from '@/shared/ui/TabBar'

const NAV_ITEMS = [
  { label: '今日', icon: <Home className="w-5 h-5" />, route: '/today' },
  { label: '日程', icon: <Calendar className="w-5 h-5" />, route: '/schedule' },
  { label: '待办', icon: <CheckSquare className="w-5 h-5" />, route: '/todo' },
  { label: '状态', icon: <Heart className="w-5 h-5" />, route: '/wellness' },
  { label: '更多', icon: <MoreHorizontal className="w-5 h-5" />, route: '/more' },
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <main className="max-w-2xl mx-auto">
        <Outlet />
      </main>
      <TabBar items={NAV_ITEMS} />
    </div>
  )
}
