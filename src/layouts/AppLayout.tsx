import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { BottomNav } from '@/shared/ui/BottomNav'
import { BackgroundSystem, DEFAULT_BACKGROUND_CONFIG } from '@/components/BackgroundSystem'
import { GlassFilters } from '@/components/GlassFilters'
import { NotificationCenter } from '@/features/notification/components/NotificationCenter'
import { useNotificationStore } from '@/features/notification/store'

export function AppLayout() {
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <div className="min-h-screen" data-bg={DEFAULT_BACKGROUND_CONFIG.source}>
      {/* SVG 滤镜定义（必须在根节点渲染一次） */}
      <GlassFilters />

      {/* 背景系统（接管 body 背景） */}
      <BackgroundSystem config={DEFAULT_BACKGROUND_CONFIG} />

      {/* 浮动通知按钮 */}
      <button
        onClick={() => setNotificationCenterOpen(true)}
        className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full glass-strong flex items-center justify-center hover:bg-white/40 transition-colors"
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

      {/* 主内容区（底部 padding 避免被 BottomNav 遮挡） */}
      <main className="max-w-2xl mx-auto px-4 pt-20 pb-32">
        <Outlet />
      </main>

      {/* 漂浮式底部导航 */}
      <BottomNav />
    </div>
  )
}
