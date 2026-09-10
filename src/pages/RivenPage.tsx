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
import {
  executePreparedUserTodoAction,
  prepareUserTodoActions,
  undoExecutedUserTodoAction,
} from '@/features/action/services/UserTodoActionClosedLoop'
import { localTodoActionRuntime } from '@/features/action/todoActionRuntime'
import type {
  TodoActionPermission,
  TodoActionProposal,
  TodoActionUndoToken,
} from '@/features/action/types'
import {
  confirmPreparedUserContinuityCandidate,
  prepareUserContinuityCandidates,
} from '@/features/continuity/services/UserContinuityClosedLoop'
import { localContinuityCandidateRuntime } from '@/features/continuity/candidateRuntime'
import type { ContinuityCandidate } from '@/features/continuity/candidateTypes'
import { createConfiguredDeepSeekProvider } from '@/features/intelligence/providers/configuredDeepSeekProvider'
import { createConfiguredIntelligenceContextReaders } from '@/features/intelligence/services/configuredContextReaders'
import { runUserIntelligence } from '@/features/intelligence/services/IntelligenceRuntime'
import type {
  ProviderNeutralIntelligenceRequest,
  StructuredIntelligenceResult,
} from '@/features/intelligence/types'
import { useLifeState } from '@/features/life-state/hooks/useLifeState'
import { useTodoStore } from '@/features/todo/store'
import type { Todo } from '@/features/todo/types'
import { nowISO } from '@/shared/lib/date'
import { generateId } from '@/shared/lib/id'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassTextarea } from '@/shared/ui/GlassInput'

type InteractionStatus = 'idle' | 'loading' | 'completed' | 'degraded'

interface ActionViewState {
  status: 'executing' | 'executed' | 'failed' | 'undoing' | 'undone'
  message: string
  undoToken?: TodoActionUndoToken
}

interface CandidateViewState {
  status: 'confirming' | 'confirmed' | 'failed' | 'dismissed'
  message: string
}

const DEGRADED_MESSAGES = {
  'context-unavailable': '当前生活上下文暂时无法读取，请稍后再试。',
  'context-not-ready': 'LifeOS 仍在准备今天的数据，请稍后再试。',
  'provider-unavailable': 'Riven 暂时无法连接。你的本地数据和其他功能不受影响。',
  'malformed-provider-response': 'Riven 的回复格式异常，本次结果已被安全拦截。',
} as const

function actionLabel(proposal: TodoActionProposal): string {
  if (proposal.action === 'todo.create') {
    return `新建待办：${proposal.payload.title}`
  }
  if (proposal.action === 'todo.update') return '更新现有待办'
  return proposal.payload.completed ? '标记待办为完成' : '恢复待办为未完成'
}

function actionDetails(
  proposal: TodoActionProposal,
  todos: Todo[],
): string[] {
  if (proposal.action === 'todo.create') {
    return [
      `标题：${proposal.payload.title}`,
      ...(proposal.payload.dueDate ? [`截止：${proposal.payload.dueDate}`] : []),
      ...(proposal.payload.recurrence && proposal.payload.recurrence !== 'none'
        ? [`重复：${proposal.payload.recurrence === 'daily' ? '每天' : '每周'}`]
        : []),
    ]
  }

  const target = todos.find((todo) => todo.id === proposal.payload.todoId)
  if (proposal.action === 'todo.set-completion') {
    return [
      `待办：${target?.title ?? proposal.payload.todoId}`,
      `日期：${proposal.payload.date}`,
    ]
  }

  const labels: Record<string, string> = {
    title: '标题',
    description: '描述',
    dueDate: '截止日期',
    recurrenceStartDate: '重复起点',
    recurrenceEndDate: '重复终点',
    priority: '优先级',
    category: '分类',
    recurrence: '重复规则',
  }
  return [
    `待办：${target?.title ?? proposal.payload.todoId}`,
    ...Object.entries(proposal.payload.patch).map(
      ([key, value]) => `${labels[key] ?? key}：${value ?? '清空'}`,
    ),
  ]
}

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
  const todos = useTodoStore((state) => state.todos)
  const reloadTodos = useTodoStore((state) => state.loadAll)
  const [requestText, setRequestText] = useState('')
  const [submittedText, setSubmittedText] = useState('')
  const [status, setStatus] = useState<InteractionStatus>('idle')
  const [answer, setAnswer] = useState<StructuredIntelligenceResult | null>(null)
  const [message, setMessage] = useState('')
  const [intelligenceRequest, setIntelligenceRequest] =
    useState<ProviderNeutralIntelligenceRequest | null>(null)
  const [todoProposals, setTodoProposals] = useState<TodoActionProposal[]>([])
  const [continuityCandidates, setContinuityCandidates] = useState<
    ContinuityCandidate[]
  >([])
  const [actionStates, setActionStates] = useState<
    Record<string, ActionViewState>
  >({})
  const [candidateStates, setCandidateStates] = useState<
    Record<string, CandidateViewState>
  >({})

  const todoPermission = (): TodoActionPermission => ({
    allowedActions: ['todo.create', 'todo.update', 'todo.set-completion'],
    allowedTodoIds: todos.map((todo) => todo.id),
  })

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

    const provider = createConfiguredDeepSeekProvider(settings)
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
    setIntelligenceRequest(null)
    setTodoProposals([])
    setContinuityCandidates([])
    setActionStates({})
    setCandidateStates({})

    try {
      const interactionAt = nowISO()
      const result = await runUserIntelligence({
        instruction,
        scope: { lifeContinuity: true, conversation: true },
        permission: {
          allowedDomains: [
            'current-life-state',
            'life-continuity',
            'conversation',
          ],
          allowedRelationshipIds: [],
        },
        readers: createConfiguredIntelligenceContextReaders({
          currentLifeState: {
            readiness: 'ready',
            value: lifeState,
            sourceUpdatedAt: lifeState.asOf,
          },
          conversation: {
            readiness: 'ready',
            value: {
              conversationId: null,
              turns: [
                {
                  id: generateId(),
                  role: 'user',
                  content: instruction,
                  createdAt: interactionAt,
                },
              ],
            },
            sourceUpdatedAt: interactionAt,
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
        setIntelligenceRequest(result.request)
        setTodoProposals(
          prepareUserTodoActions({
            result: result.result,
            request: result.request,
            permission: todoPermission(),
            proposedAt: nowISO(),
            generateProposalId: generateId,
          }).proposals,
        )
        setContinuityCandidates(
          prepareUserContinuityCandidates({
            result: result.result,
            request: result.request,
            proposedAt: nowISO(),
            generateCandidateId: generateId,
          }).candidates,
        )
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

  const handleExecuteAction = async (proposal: TodoActionProposal) => {
    setActionStates((current) => ({
      ...current,
      [proposal.proposalId]: { status: 'executing', message: '正在执行…' },
    }))
    try {
      const result = await executePreparedUserTodoAction({
        proposal,
        permission: todoPermission(),
        confirmation: {
          proposalId: proposal.proposalId,
          confirmedAt: nowISO(),
        },
        dependencies: localTodoActionRuntime,
      })

      if (result.status === 'executed') {
        await reloadTodos()
        setActionStates((current) => ({
          ...current,
          [proposal.proposalId]: {
            status: 'executed',
            message: '已执行并记录审计，可撤销。',
            undoToken: result.undoToken,
          },
        }))
        return
      }

      const resultMessage = {
        'permission-denied': '当前权限不允许执行此操作。',
        'confirmation-required': '此操作仍需要有效确认。',
        'validation-failed': 'Todo 领域校验未通过，未修改数据。',
        'execution-failed': '执行失败，未完成的数据变更已被安全处理。',
      }[result.status]
      setActionStates((current) => ({
        ...current,
        [proposal.proposalId]: {
          status: 'failed',
          message: resultMessage,
        },
      }))
    } catch {
      setActionStates((current) => ({
        ...current,
        [proposal.proposalId]: {
          status: 'failed',
          message: '操作未完成；没有绕过 Action 审计边界重试。',
        },
      }))
    }
  }

  const handleUndoAction = async (
    proposalId: string,
    token: TodoActionUndoToken,
  ) => {
    setActionStates((current) => ({
      ...current,
      [proposalId]: { ...current[proposalId], status: 'undoing', message: '正在撤销…' },
    }))
    try {
      const result = await undoExecutedUserTodoAction({
        token,
        permission: {
          allowedActions: [token.action],
          allowedTodoIds: [token.todoId],
        },
        dependencies: localTodoActionRuntime,
      })
      await reloadTodos()
      setActionStates((current) => ({
        ...current,
        [proposalId]: result.status === 'undone'
          ? { status: 'undone', message: '已撤销。' }
          : {
              status: 'failed',
              message: result.status === 'undo-conflict'
                ? '待办在执行后已发生变化，为保护新数据未撤销。'
                : '撤销失败，请检查待办当前状态。',
            },
      }))
    } catch {
      setActionStates((current) => ({
        ...current,
        [proposalId]: {
          status: 'failed',
          message: '撤销未完成，请检查待办当前状态。',
        },
      }))
    }
  }

  const handleConfirmCandidate = async (candidate: ContinuityCandidate) => {
    if (!intelligenceRequest) return
    setCandidateStates((current) => ({
      ...current,
      [candidate.candidateId]: { status: 'confirming', message: '正在保存…' },
    }))
    try {
      const result = await confirmPreparedUserContinuityCandidate({
        candidate,
        request: intelligenceRequest,
        confirmation: {
          candidateId: candidate.candidateId,
          decision: 'confirm',
          confirmedAt: nowISO(),
        },
        dependencies: localContinuityCandidateRuntime,
      })
      setCandidateStates((current) => ({
        ...current,
        [candidate.candidateId]: result.status === 'confirmed'
          ? { status: 'confirmed', message: '已确认进入 Life Continuity。' }
          : {
              status: 'failed',
              message: result.status === 'persistence-failed'
                ? '保存失败，Candidate 仍可重试。'
                : '确认校验未通过，未写入 Continuity。',
            },
      }))
    } catch {
      setCandidateStates((current) => ({
        ...current,
        [candidate.candidateId]: {
          status: 'failed',
          message: '保存失败，Candidate 仍可重试。',
        },
      }))
    }
  }

  const handleDismissCandidate = (candidateId: string) => {
    setCandidateStates((current) => ({
      ...current,
      [candidateId]: { status: 'dismissed', message: '已忽略，未写入 Continuity。' },
    }))
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
              <p className="text-sm font-medium text-text-primary">Riven 不会直接改动数据</p>
              <p className="text-xs leading-5 text-text-tertiary mt-1">
                本次只读取当前 Life State、已确认的 Life Continuity 与这条请求。Todo 操作和长期记忆只会成为候选，必须由你确认。
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

            {todoProposals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-tertiary px-1">待确认的 Todo 操作</p>
                {todoProposals.map((proposal) => {
                  const viewState = actionStates[proposal.proposalId]
                  const busy =
                    viewState?.status === 'executing' ||
                    viewState?.status === 'undoing'
                  return (
                    <GlassCard key={proposal.proposalId}>
                      <p className="text-sm font-medium text-text-primary">
                        {actionLabel(proposal)}
                      </p>
                      <p className="text-xs leading-5 text-text-tertiary mt-1">
                        {proposal.reason}
                      </p>
                      <div className="mt-2 space-y-0.5">
                        {actionDetails(proposal, todos).map((detail) => (
                          <p key={detail} className="text-xs text-text-secondary">
                            {detail}
                          </p>
                        ))}
                      </div>
                      {viewState && (
                        <p className="text-xs text-text-secondary mt-2">
                          {viewState.message}
                        </p>
                      )}
                      <div className="flex justify-end gap-2 mt-3">
                        {viewState?.status === 'executed' && viewState.undoToken ? (
                          <GlassButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleUndoAction(proposal.proposalId, viewState.undoToken!)
                            }
                          >
                            撤销
                          </GlassButton>
                        ) : !viewState || viewState.status === 'executing' ? (
                          <GlassButton
                            type="button"
                            size="sm"
                            loading={busy}
                            onClick={() => handleExecuteAction(proposal)}
                          >
                            确认执行
                          </GlassButton>
                        ) : null}
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
            )}

            {continuityCandidates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-tertiary px-1">建议记住</p>
                {continuityCandidates.map((candidate) => {
                  const viewState = candidateStates[candidate.candidateId]
                  const awaiting =
                    !viewState ||
                    viewState.status === 'failed' ||
                    viewState.status === 'confirming'
                  return (
                    <GlassCard key={candidate.candidateId}>
                      <p className="text-sm leading-6 text-text-primary">
                        {candidate.content}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        Life Continuity · {viewState?.status === 'confirmed' ? '已确认' : '尚未写入'}
                      </p>
                      {viewState && (
                        <p className="text-xs text-text-secondary mt-2">
                          {viewState.message}
                        </p>
                      )}
                      {awaiting && (
                        <div className="flex justify-end gap-2 mt-3">
                          <GlassButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={viewState?.status === 'confirming'}
                            onClick={() => handleDismissCandidate(candidate.candidateId)}
                          >
                            忽略
                          </GlassButton>
                          <GlassButton
                            type="button"
                            size="sm"
                            loading={viewState?.status === 'confirming'}
                            onClick={() => handleConfirmCandidate(candidate)}
                          >
                            确认记住
                          </GlassButton>
                        </div>
                      )}
                    </GlassCard>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
