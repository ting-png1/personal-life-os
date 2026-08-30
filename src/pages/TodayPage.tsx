import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToday } from '@/features/today/hooks/useToday'
import { MoodCard } from '@/features/today/components/MoodCard'
import { ScheduleList } from '@/features/today/components/ScheduleList'
import { TodoCheckList } from '@/features/today/components/TodoCheckList'
import { TodayProgress } from '@/features/today/components/TodayProgress'
import { useTodoStore } from '@/features/todo/store'
import { useMoodStore } from '@/features/mood/store'
import { useCycle } from '@/features/cycle/hooks/useCycle'
import { CycleStatusCard } from '@/features/cycle/components/CycleStatusCard'
import { useAI } from '@/features/ai/hooks/useAI'
import { AIRecommendationCard } from '@/features/ai/components/AIRecommendationCard'
import { buildAIGenerationInput } from '@/features/ai/services/AIService'
import type { AISuggestion } from '@/features/ai/types'
import { TodoForm } from '@/features/todo/components/TodoForm'
import { MoodQuickRecord } from '@/features/mood/components/MoodQuickRecord'
import { Modal } from '@/shared/ui/Modal'
import { GlassButton } from '@/shared/ui/GlassButton'
import type { Todo, CreateTodoInput } from '@/features/todo/types'
import type { ScheduleInstance } from '@/features/schedule/types'
import type { CreateMoodInput, MoodLevel } from '@/features/mood/types'
import type { CreatePeriodInput } from '@/features/cycle/types'
import { PeriodForm } from '@/features/cycle/components/PeriodForm'
import { formatMonthDay } from '@/shared/lib/date'
import { SyncStatusBadge } from '@/features/sync/components/SyncStatusBadge'

export function TodayPage() {
  const { todayState } = useToday()

  const todoToggleComplete = useTodoStore((s) => s.toggleComplete)
  const todoRemove = useTodoStore((s) => s.remove)
  const todoCreate = useTodoStore((s) => s.create)
  const moodCreate = useMoodStore((s) => s.create)
  const { currentCycleState, create: createPeriod, update: updatePeriod } = useCycle()
  const navigate = useNavigate()

  const [todoFormOpen, setTodoFormOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [moodRecordOpen, setMoodRecordOpen] = useState(false)
  const [deleteTodoTarget, setDeleteTodoTarget] = useState<Todo | null>(null)
  const [periodFormOpen, setPeriodFormOpen] = useState(false)

  const handleTodoCreate = async (input: CreateTodoInput) => {
    await todoCreate(input)
  }

  const handleMoodQuickPick = async (level: MoodLevel) => {
    await moodCreate({ level })
  }

  const handleMoodRecord = async (input: CreateMoodInput) => {
    await moodCreate(input)
  }

  const handleTodoDelete = async () => {
    if (!deleteTodoTarget) return
    await todoRemove(deleteTodoTarget.id)
    setDeleteTodoTarget(null)
  }

  const handleScheduleItemClick = (_instance: ScheduleInstance) => {
    // MVP: 点击日程暂不跳转，未来可跳转到日程详情
  }

  const handlePeriodSubmit = async (input: CreatePeriodInput) => {
    await createPeriod(input)
    setPeriodFormOpen(false)
  }

  const handleEndPeriod = async () => {
    if (!currentCycleState.currentPeriodRecord) return
    const today = new Date().toISOString().split('T')[0]
    await updatePeriod(currentCycleState.currentPeriodRecord.id, { endDate: today })
  }

  // AI 智能建议
  const ai = useAI()

  const handleGenerateAI = async () => {
    const input = buildAIGenerationInput({
      date: todayState.date,
      weekday: todayState.weekday,
      moodHasRecorded: todayState.mood.hasRecorded,
      moodLatestLevel: todayState.mood.latest?.level ?? null,
      moodLatestNote: todayState.mood.latest?.note ?? null,
      scheduleTotal: todayState.schedule.items.length,
      scheduleItems: todayState.schedule.items.map((item) => ({
        title: item.title,
        startTime: item.startDateTime.slice(11, 16),
        endTime: item.endDateTime.slice(11, 16),
        type: item.type,
      })),
      todosTotal: todayState.todos.totalDue,
      todosCompleted: todayState.todos.completedCount,
      todosPending: todayState.todos.allToday
        .filter((t) => !t.completed)
        .map((t) => ({
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
        })),
      cycleIsInPeriod: currentCycleState.isInPeriod,
      cycleCurrentPhase: currentCycleState.currentPhase,
      cycleDaysUntilNextPeriod: currentCycleState.daysUntilNextPeriod,
    })
    await ai.generate(input)
  }

  const handleConfirmAISuggestion = (_suggestion: AISuggestion) => {
    // MVP: 确认建议仅标记状态，不自动执行
    // 未来可根据 suggestion.type 跳转到对应模块
    ai.confirmSuggestion(_suggestion.id)
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 顶部日期与问候 */}
      <div className="px-5 pt-8 pb-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-text-secondary">
            {formatMonthDay(todayState.date)} · {todayState.weekday}
          </p>
          <SyncStatusBadge showLabel={false} />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">{todayState.greeting}</h1>
      </div>

      <div className="px-5 space-y-5">
        {/* 情绪卡片 */}
        <MoodCard
          latest={todayState.mood.latest}
          hasRecorded={todayState.mood.hasRecorded}
          onQuickPick={handleMoodQuickPick}
          onOpenRecord={() => setMoodRecordOpen(true)}
        />

        {/* 周期状态卡片 */}
        <CycleStatusCard
          state={currentCycleState}
          onRecordClick={() => setPeriodFormOpen(true)}
          onEndPeriodClick={handleEndPeriod}
        />

        {/* AI 智能建议 */}
        <AIRecommendationCard
          recommendation={ai.currentRecommendation}
          loading={ai.loading}
          error={ai.error}
          canGenerate={ai.canGenerate}
          remaining={ai.remaining}
          limit={ai.limit}
          isConfigured={ai.isConfigured}
          onGenerate={handleGenerateAI}
          onDismiss={ai.dismissCurrent}
          onConfirmSuggestion={handleConfirmAISuggestion}
          onGoToSettings={() => navigate('/settings')}
        />

        {/* 今日安排 */}
        <ScheduleList
          items={todayState.schedule.items}
          currentItem={todayState.schedule.currentItem}
          onItemClick={handleScheduleItemClick}
        />

        {/* 今日待办 */}
        <TodoCheckList
          todos={todayState.todos.allToday}
          onToggle={todoToggleComplete}
          onDelete={(id) => {
            const todo = todayState.todos.allToday.find((t) => t.id === id)
            if (todo) setDeleteTodoTarget(todo)
          }}
          onItemClick={(todo) => {
            setEditingTodo(todo)
            setTodoFormOpen(true)
          }}
          onAddClick={() => {
            setEditingTodo(null)
            setTodoFormOpen(true)
          }}
        />

        {/* 今日进度 */}
        {todayState.todos.totalDue > 0 && (
          <TodayProgress
            completedCount={todayState.todos.completedCount}
            totalDue={todayState.todos.totalDue}
            completionRate={todayState.todos.completionRate}
          />
        )}
      </div>

      {/* 待办新建/编辑表单 */}
      <TodoForm
        open={todoFormOpen}
        onClose={() => {
          setTodoFormOpen(false)
          setEditingTodo(null)
        }}
        onSubmit={handleTodoCreate}
        editingTodo={editingTodo}
      />

      {/* 情绪记录弹窗 */}
      <MoodQuickRecord
        open={moodRecordOpen}
        onClose={() => setMoodRecordOpen(false)}
        onSubmit={handleMoodRecord}
      />

      {/* 删除待办确认 */}
      <Modal
        open={!!deleteTodoTarget}
        onClose={() => setDeleteTodoTarget(null)}
        title="确认删除"
        footer={
          <>
            <GlassButton variant="ghost" onClick={() => setDeleteTodoTarget(null)}>
              取消
            </GlassButton>
            <GlassButton variant="danger" onClick={handleTodoDelete}>
              删除
            </GlassButton>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          确定要删除「{deleteTodoTarget?.title}」吗？此操作无法撤销。
        </p>
      </Modal>

      {/* 经期记录弹窗 */}
      <PeriodForm
        open={periodFormOpen}
        onClose={() => setPeriodFormOpen(false)}
        onSubmit={handlePeriodSubmit}
      />
    </div>
  )
}
