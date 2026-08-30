import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Heart, Code2, Sparkles } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'

export function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen pb-24">
      {/* 顶部导航 */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/more')}
          className="p-1.5 rounded-full text-text-secondary hover:bg-primary-50 transition-colors"
          aria-label="返回"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-text-primary">关于</h1>
      </div>

      <div className="px-5 space-y-4">
        {/* 应用信息卡片 */}
        <GlassCard>
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center mx-auto mb-3 shadow-glow">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">生活状态</h2>
            <p className="text-sm text-text-secondary mt-1">个人生活状态管理与智能规划</p>
            <p className="text-xs text-text-tertiary mt-2">版本 0.1.0 (MVP)</p>
          </div>
        </GlassCard>

        {/* 功能说明 */}
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">当前功能</p>
          <GlassCard>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">今日状态中心</p>
                  <p className="text-xs text-text-tertiary mt-0.5">聚合日程、待办、情绪，一目了然</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Code2 className="w-4 h-4 text-primary-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">日程与课程</p>
                  <p className="text-xs text-text-tertiary mt-0.5">支持每周重复课程，周视图/日视图</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* 技术栈 */}
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">技术栈</p>
          <GlassCard>
            <div className="flex flex-wrap gap-2">
              {['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Zustand', 'Dexie.js', 'PWA'].map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-full text-xs bg-primary-50 text-primary-600 font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* 底部 */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-text-tertiary">用 ❤️ 为自己而做</p>
          <p className="text-xs text-text-tertiary mt-1">数据完全保存在本地，尊重你的隐私</p>
        </div>
      </div>
    </div>
  )
}
