import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Home, Calendar, CheckSquare, Heart, MoreHorizontal, Bell } from 'lucide-react'
import { TabBar } from '@/shared/ui/TabBar'
import { NotificationCenter } from '@/features/notification/components/NotificationCenter'
import { useNotificationStore } from '@/features/notification/store'

const NAV_ITEMS = [
  { label: '今日', icon: <Home className="w-5 h-5" />, route: '/today' },
  { label: '日程', icon: <Calendar className="w-5 h-5" />, route: '/schedule' },
  { label: '待办', icon: <CheckSquare className="w-5 h-5" />, route: '/todo' },
  { label: '状态', icon: <Heart className="w-5 h-5" />, route: '/wellness' },
  { label: '更多', icon: <MoreHorizontal className="w-5 h-5" />, route: '/more' },
]

export function AppLayout() {
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <div className="min-h-screen bg-bg">
      {/* 浮动通知按钮 */}
      <button
        onClick={() => setNotificationCenterOpen(true)}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg flex items-center justify-center hover:bg-white transition-colors"
        title="通知中心"
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-500 text-white text-xs font-medium flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 通知中心 */}
      <NotificationCenter
        open={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />

      <main className="max-w-2xl mx-auto">
        <Outlet />
      </main>
      <TabBar items={NAV_ITEMS} />
    </div>
  )
}
