import { Sparkles, RefreshCw, AlertCircle, Lock, Check, X } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassButton } from '@/shared/ui/GlassButton'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { AIRecommendation, AISuggestion, SuggestionType } from '../types'

const SUGGESTION_TYPE_LABELS: Record<SuggestionType, string> = {
  todo: '待办',
  schedule: '日程',
  rest: '休息',
  mood: '情绪',
  general: '建议',
}

const SUGGESTION_TYPE_COLORS: Record<SuggestionType, string> = {
  todo: 'var(--color-primary-500)',
  schedule: 'var(--color-info)',
  rest: 'var(--color-success)',
  mood: 'var(--color-warning)',
  general: 'var(--color-text-tertiary)',
}

const PRIORITY_LABELS: Record<string, string> = {
  high: '优先',
  medium: '一般',
  low: '可选',
}

interface AIRecommendationCardProps {
  recommendation: AIRecommendation | null
  loading: boolean
  error: string | null
  canGenerate: boolean
  remaining: number
  limit: number
  isConfigured: boolean
  onGenerate: () => void
  onDismiss: () => void
  onConfirmSuggestion?: (suggestion: AISuggestion) => void
  onGoToSettings?: () => void
}

export function AIRecommendationCard({
  recommendation,
  loading,
  error,
  canGenerate,
  remaining,
  limit,
  isConfigured,
  onGenerate,
  onDismiss,
  onConfirmSuggestion,
  onGoToSettings,
}: AIRecommendationCardProps) {
  // 未配置 API Key
  if (!isConfigured) {
    return (
      <GlassCard>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-primary-400" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">AI 智能建议</p>
          <p className="text-xs text-text-tertiary mb-4">配置 API Key 后，AI 将根据你今天的状态给出建议</p>
          {onGoToSettings && (
            <GlassButton size="sm" onClick={onGoToSettings}>
              去配置
            </GlassButton>
          )}
        </div>
      </GlassCard>
    )
  }

  // 加载中
  if (loading) {
    return (
      <GlassCard>
        <div className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary-400 animate-pulse" />
            <span className="text-sm font-medium text-text-primary">AI 正在分析你的今天...</span>
          </div>
          {/* 骨架屏 */}
          <div className="space-y-2">
            <div className="h-3 bg-primary-50 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-primary-50 rounded animate-pulse w-full" />
            <div className="h-3 bg-primary-50 rounded animate-pulse w-2/3" />
          </div>
          <div className="mt-4 space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="p-2 rounded-lg bg-primary-50/50">
                <div className="h-3 bg-surface-solid rounded animate-pulse w-1/3 mb-1.5" />
                <div className="h-2 bg-surface-solid rounded animate-pulse w-full" />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    )
  }

  // 错误
  if (error) {
    return (
      <GlassCard>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-error" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">AI 生成失败</p>
          <p className="text-xs text-text-tertiary mb-4 px-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            {canGenerate && (
              <GlassButton size="sm" onClick={onGenerate}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                重试
              </GlassButton>
            )}
            {onGoToSettings && (
              <GlassButton size="sm" variant="ghost" onClick={onGoToSettings}>
                检查设置
              </GlassButton>
            )}
          </div>
        </div>
      </GlassCard>
    )
  }

  // 次数耗尽
  if (!canGenerate && !recommendation) {
    return (
      <GlassCard>
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-warning" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">今日 AI 次数已用完</p>
          <p className="text-xs text-text-tertiary mb-2">今日上限 {limit} 次，已全部使用</p>
          <p className="text-xs text-text-tertiary">明天可以继续使用，或在设置中调整上限</p>
        </div>
      </GlassCard>
    )
  }

  // 有建议内容
  if (recommendation) {
    return (
      <GlassCard>
        <div className="space-y-3">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-text-primary">AI 今日建议</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary">今日剩余 {remaining}/{limit}</span>
              <button
                onClick={onDismiss}
                className="p-1 rounded-full text-text-tertiary hover:text-text-secondary hover:bg-primary-50 transition-colors"
                aria-label="关闭"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 总结 */}
          <p className="text-sm text-text-secondary leading-relaxed">{recommendation.summary}</p>

          {/* 建议列表 */}
          <div className="space-y-2">
            {recommendation.suggestions.map((suggestion) => (
              <SuggestionItem
                key={suggestion.id}
                suggestion={suggestion}
                onConfirm={onConfirmSuggestion}
              />
            ))}
          </div>

          {/* 底部操作 */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-text-tertiary">AI 建议仅供参考，请根据实际情况判断</span>
            {canGenerate && (
              <GlassButton size="sm" variant="ghost" onClick={onGenerate} loading={loading}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                重新生成
              </GlassButton>
            )}
          </div>
        </div>
      </GlassCard>
    )
  }

  // 空状态（未生成过建议）
  return (
    <GlassCard>
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-primary-400" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">AI 智能建议</p>
        <p className="text-xs text-text-tertiary mb-3">根据你今天的情绪、日程、待办和周期状态，生成个性化建议</p>
        <div className="flex items-center justify-center gap-3">
          <GlassButton size="sm" onClick={onGenerate} disabled={!canGenerate}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            生成今日建议
          </GlassButton>
          <span className="text-xs text-text-tertiary">今日剩余 {remaining}/{limit}</span>
        </div>
      </div>
    </GlassCard>
  )
}

/** 单条建议 */
function SuggestionItem({
  suggestion,
  onConfirm,
}: {
  suggestion: AISuggestion
  onConfirm?: (suggestion: AISuggestion) => void
}) {
  return (
    <div className="p-3 rounded-lg bg-primary-50/30 border border-primary-100/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge
              text={SUGGESTION_TYPE_LABELS[suggestion.type]}
              color={SUGGESTION_TYPE_COLORS[suggestion.type]}
            />
            <span className="text-xs text-text-tertiary">{PRIORITY_LABELS[suggestion.priority]}</span>
          </div>
          <p className="text-sm font-medium text-text-primary">{suggestion.title}</p>
          <p className="text-xs text-text-secondary mt-0.5">{suggestion.description}</p>
        </div>
        {onConfirm && (
          <button
            onClick={() => onConfirm(suggestion)}
            className="p-1.5 rounded-full text-primary-500 hover:bg-primary-100 transition-colors shrink-0"
            aria-label="采纳建议"
            title="采纳建议"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
