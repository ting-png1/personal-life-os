import { useNavigate } from 'react-router-dom'
import { Settings, Info, ChevronRight, Heart, BarChart3 } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'

export function MorePage() {
  const navigate = useNavigate()

  const menuItems = [
    {
      icon: BarChart3,
      label: '数据分析',
      description: '情绪趋势、待办完成率、周期统计',
      onClick: () => navigate('/more/analytics'),
    },
    {
      icon: Settings,
      label: '设置',
      description: '偏好、数据管理、通知提醒',
      onClick: () => navigate('/more/settings'),
    },
    {
      icon: Info,
      label: '关于',
      description: '版本、项目信息',
      onClick: () => navigate('/more/about'),
    },
  ]

  return (
    <div className="pt-6">
      {/* ===== 顶部标题 ===== */}
      <header className="animate-fade-slide-up mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">更多</h1>
      </header>

      {/* ===== 菜单列表 ===== */}
      <section className="animate-fade-slide-up stagger-1 space-y-3 mb-8">
        {menuItems.map((item) => (
          <GlassCard key={item.label} hover>
            <button
              onClick={item.onClick}
              className="w-full flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary-400) 12%, transparent)' }}
              >
                <item.icon className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-text-primary">{item.label}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-tertiary shrink-0" />
            </button>
          </GlassCard>
        ))}
      </section>

      {/* ===== 底部标语 ===== */}
      <div className="animate-fade-slide-up stagger-2 text-center pt-8 pb-4">
        <div className="flex items-center justify-center gap-1.5 text-text-tertiary">
          <Heart className="w-3.5 h-3.5" />
          <span className="text-xs">生活状态</span>
        </div>
        <p className="text-xs text-text-tertiary mt-1">照顾好自己的每一天</p>
      </div>
    </div>
  )
}
