import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Info,
  Send,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react'
import { useAI } from '@/features/ai/hooks/useAI'
import {
  canUseAI,
  incrementUsage,
} from '@/features/ai/services/aiSettings'
import { createConfiguredRivenProvider } from '@/features/intelligence/providers/configuredRivenProvider'
import { createConfiguredIntelligenceContextReaders } from '@/features/intelligence/services/configuredContextReaders'
import { runUserIntelligence } from '@/features/intelligence/services/IntelligenceRuntime'
import type { StructuredIntelligenceResult } from '@/features/intelligence/types'
import { useLifeState } from '@/features/life-state/hooks/useLifeState'
import { nowISO } from '@/shared/lib/date'
import { generateId } from '@/shared/lib/id'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassTextarea } from '@/shared/ui/GlassInput'

type InteractionStatus = 'idle' | 'loading' | 'completed' | 'degraded'

const DEGRADED_MESSAGES = {
  'context-unavailable': '当前生活上下文暂时无法读取，请稍后再试。',
  'context-not-ready': 'LifeOS 仍在准备今天的数据，请稍后再试。',
  'provider-unavailable': 'Riven 暂时无法连接。你的本地数据和其他功能不受影响。',
  'malformed-provider-response': 'Riven 的回复格式异常，本次结果已被安全拦截。',
} as const

export function RivenPage() {
  const navigate = useNavigate()
  const lifeState = useLifeState()
  const {
    settings,
    isConfigured,
    remaining,
    limit,
    refreshUsage,
  } = useAI()
  const [requestText, setRequestText] = useState('')
  const [submittedText, setSubmittedText] = useState('')
  const [status, setStatus] = useState<InteractionStatus>('idle')
  const [answer, setAnswer] = useState<StructuredIntelligenceResult | null>(null)
  const [message, setMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const instruction = requestText.trim()
    if (!instruction || status === 'loading') return

    const usage = canUseAI()
    if (!isConfigured) {
      setAnswer(null)
      setStatus('degraded')
      setMessage('请先在设置中配置并启用 Riven。')
      return
    }
    if (!usage.allowed) {
      setAnswer(null)
      setStatus('degraded')
      setMessage('今天的 Riven 使用次数已用完，请明天再试。')
      return
    }

    const provider = createConfiguredRivenProvider(settings)
    if (!provider) {
      setAnswer(null)
      setStatus('degraded')
      setMessage('Riven 当前不可用，请检查设置后再试。')
      return
    }

    setSubmittedText(instruction)
    setAnswer(null)
    setMessage('')
    setStatus('loading')

    try {
      const result = await runUserIntelligence({
        instruction,
        scope: { lifeContinuity: true },
        permission: {
          allowedDomains: ['current-life-state', 'life-continuity'],
          allowedRelationshipIds: [],
        },
        readers: createConfiguredIntelligenceContextReaders({
          currentLifeState: {
            readiness: 'ready',
            value: lifeState,
            sourceUpdatedAt: lifeState.asOf,
          },
        }),
        providers: { primary: provider },
        now: nowISO,
        generateId,
      })

      if (result.status === 'completed') {
        incrementUsage()
        refreshUsage()
        setAnswer(result.result)
        setStatus('completed')
        return
      }

      setStatus('degraded')
      setMessage(DEGRADED_MESSAGES[result.reason])
    } catch {
      setStatus('degraded')
      setMessage('Riven 暂时不可用。你的本地数据和其他功能不受影响。')
    }
  }

  return (
    <div className="pb-8">
      <header className="animate-fade-slide-up mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/more')}
          className="p-1.5 rounded-full text-text-secondary hover:bg-primary-50 transition-colors"
          aria-label="返回"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text-primary">Riven</h1>
            <Sparkles className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-xs text-text-tertiary mt-0.5">理解当下，不替你做决定</p>
        </div>
      </header>

      <section className="animate-fade-slide-up stagger-1 space-y-4">
        <GlassCard className="overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100/70 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">本次为只读交互</p>
              <p className="text-xs leading-5 text-text-tertiary mt-1">
                Riven 只读取当前 Life State 与已确认的 Life Continuity，不读取关系信息，也不会修改任何生活数据。
              </p>
            </div>
          </div>
        </GlassCard>

        {!isConfigured && (
          <GlassCard className="border border-primary-300/30">
            <div className="flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Riven 尚未启用</p>
                <p className="text-xs text-text-tertiary mt-1">配置 provider 后即可开始单轮对话。</p>
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/more/settings')}
                >
                  前往设置
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-3">
            <GlassTextarea
              label="你想问 Riven 什么？"
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              placeholder="例如：结合我今天的状态，帮我理清接下来最值得关注的事情。"
              rows={5}
              maxLength={1200}
              disabled={status === 'loading'}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-text-tertiary">
                今日剩余 {remaining}/{limit} 次
              </span>
              <GlassButton
                type="submit"
                size="sm"
                loading={status === 'loading'}
                disabled={!requestText.trim() || !isConfigured}
                rightIcon={<Send className="w-4 h-4" />}
              >
                {status === 'loading' ? 'Riven 正在思考' : '发送'}
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      </section>

      <section
        className="animate-fade-slide-up stagger-2 mt-4"
        aria-live="polite"
        aria-busy={status === 'loading'}
      >
        {status === 'loading' && (
          <GlassCard>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Sparkles className="w-5 h-5 text-primary-400 animate-pulse" />
              正在结合本次授权的 LifeOS 上下文…
            </div>
          </GlassCard>
        )}

        {status === 'degraded' && (
          <GlassCard className="border border-primary-300/30">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">本次请求未完成</p>
                <p className="text-xs leading-5 text-text-tertiary mt-1">{message}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {status === 'completed' && answer && (
          <div className="space-y-3">
            <div className="px-1">
              <p className="text-xs font-medium text-text-tertiary">你的请求</p>
              <p className="text-sm text-text-secondary mt-1 break-words">{submittedText}</p>
            </div>
            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <p className="text-sm font-semibold text-text-primary">Riven</p>
              </div>
              <p className="text-sm leading-6 text-text-primary whitespace-pre-wrap break-words">
                {answer.summary}
              </p>
              {answer.statements.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/30 space-y-3">
                  {answer.statements.map((statement, index) => (
                    <div key={`${statement.classification}-${index}`}>
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-primary-100/70 text-[11px] font-medium text-primary-600">
                        {statement.classification === 'inference' ? '推断' : '建议'}
                      </span>
                      <p className="text-sm leading-6 text-text-secondary mt-1.5 whitespace-pre-wrap break-words">
                        {statement.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        )}
      </section>
    </div>
  )
}
