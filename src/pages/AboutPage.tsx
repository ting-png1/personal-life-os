import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  ChevronLeft,
  Code2,
  Database,
  Heart,
  Sparkles,
} from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'

const capabilities = [
  {
    icon: Activity,
    title: 'Today & Life State',
    description: '把日程、待办、情绪、周期与健康摘要，汇成确定性的当下状态。',
  },
  {
    icon: Sparkles,
    title: 'Riven Intelligence',
    description: '只读取本次授权的相关上下文；建议与行动始终经过清晰边界。',
  },
  {
    icon: BookOpen,
    title: 'Life Continuity',
    description: '保存经确认的生活与关系连续性，并保留来源与生命周期。',
  },
  {
    icon: Database,
    title: 'Local First',
    description: '本地数据始终可用，备份、恢复与跨设备同步作为可靠增强。',
  },
] as const

const technologies = [
  'React',
  'TypeScript',
  'Vite',
  'Tailwind CSS',
  'Zustand',
  'Dexie.js',
  'Supabase',
  'Capacitor',
  'PWA',
] as const

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

      <div className="px-5 space-y-5">
        <GlassCard padding="lg">
          <div className="text-center py-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Heart className="w-8 h-8 text-white" strokeWidth={1.8} />
            </div>
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-primary-500">
              Personal Life OS
            </p>
            <h2 className="text-2xl font-semibold text-text-primary mt-1.5">LifeOS</h2>
            <p className="text-sm text-text-secondary mt-2">理解当下，也保存生活的连续性。</p>
            <span className="inline-flex mt-4 px-3 py-1 rounded-full text-[11px] font-medium bg-primary-400/15 text-primary-600 border border-white/30">
              V2 · Final Acceptance
            </span>
          </div>
        </GlassCard>

        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">核心能力</p>
          <GlassCard>
            <div className="divide-y divide-white/25">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-full bg-primary-400/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary-500" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{title}</p>
                    <p className="text-xs leading-5 text-text-tertiary mt-0.5">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">技术栈</p>
          <GlassCard>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-white/25 text-text-secondary border border-white/25"
                >
                  {tech}
                </span>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="pb-8">
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">Developer 寄语</p>
          <GlassCard padding="lg" className="border-white/45">
            <div className="flex items-center gap-2 mb-5 text-primary-500">
              <Code2 className="w-4 h-4" strokeWidth={1.7} />
              <span className="text-[10px] font-medium tracking-[0.18em] uppercase">
                A note from the developer
              </span>
            </div>
            <div className="space-y-4 text-sm leading-7 text-text-secondary">
              <p>LifeOS 起初，只是我想为自己做一个更顺手的生活工具。</p>
              <p>后来，它慢慢长成了我第一个真正完整的软件项目。</p>
              <p>我在这里学习设计、开发、犯错与重构，也第一次真正学习如何与 Riven 一起创造一个产品。</p>
              <p>它未必会永远以今天的样子存在，但它记录了我第一次把一个想法，从模糊的念头，一点一点做成真实可用的东西。</p>
              <p className="pt-1 font-semibold text-text-primary">— 松庭，2026</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
