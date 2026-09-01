import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Ban, RotateCcw } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassButton } from '@/shared/ui/GlassButton'
import { Modal } from '@/shared/ui/Modal'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { useSchedule } from '@/features/schedule/hooks/useSchedule'
import { WeekView } from '@/features/schedule/components/WeekView'
import { DayView } from '@/features/schedule/components/DayView'
import { ScheduleForm } from '@/features/schedule/components/ScheduleForm'
import type { ScheduleEvent, ScheduleInstance, CreateScheduleInput, ScheduleOverride } from '@/features/schedule/types'
import { todayStr, getWeekdayCN, formatMonthDay, addDays, format } from '@/shared/lib/date'

type ViewMode = 'week' | 'day'

export function SchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEvent | null>(null)
  const [overrideTarget, setOverrideTarget] = useState<ScheduleInstance | null>(null)

  const { events, create, update, remove } = useSchedule(selectedDate)

  const handleCreate = async (input: CreateScheduleInput) => {
    await create(input)
  }

  const handleUpdate = async (input: CreateScheduleInput) => {
    if (!editingEvent) return
    await update(editingEvent.id, input)
  }

  const handleItemClick = (instance: ScheduleInstance) => {
    const event = events.find((e) => e.id === instance.eventId)
    if (event) {
      setEditingEvent(event)
      setFormOpen(true)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  // 临时取消某一天的课程实例
  const handleCancelInstance = async () => {
    if (!overrideTarget) return
    const event = events.find((e) => e.id === overrideTarget.eventId)
    if (!event?.recurrence) {
      setOverrideTarget(null)
      return
    }
    const currentOverrides = event.recurrence.overrides ?? {}
    const newOverrides: Record<string, ScheduleOverride> = {
      ...currentOverrides,
      [selectedDate]: { ...currentOverrides[selectedDate], cancelled: true },
    }
    await update(event.id, {
      recurrence: { ...event.recurrence, overrides: newOverrides },
    })
    setOverrideTarget(null)
  }

  // 恢复某一天的课程实例（移除覆盖）
  const handleRestoreInstance = async () => {
    if (!overrideTarget) return
    const event = events.find((e) => e.id === overrideTarget.eventId)
    if (!event?.recurrence) {
      setOverrideTarget(null)
      return
    }
    const currentOverrides = event.recurrence.overrides ?? {}
    const newOverrides = { ...currentOverrides }
    delete newOverrides[selectedDate]
    await update(event.id, {
      recurrence: {
        ...event.recurrence,
        overrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
      },
    })
    setOverrideTarget(null)
  }

  // 判断当前 overrideTarget 是否已被取消
  const isOverrideCancelled = (): boolean => {
    if (!overrideTarget) return false
    const event = events.find((e) => e.id === overrideTarget.eventId)
    return event?.recurrence?.overrides?.[selectedDate]?.cancelled === true
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingEvent(null)
  }

  const changeDate = (delta: number) => {
    const newDate = format(addDays(new Date(selectedDate + 'T00:00:00'), delta), 'yyyy-MM-dd')
    setSelectedDate(newDate)
  }

  return (
    <div className="pt-6">
      {/* ===== 顶部标题栏 ===== */}
      <header className="animate-fade-slide-up mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-text-primary">日程</h1>
          <SegmentedControl
            size="sm"
            options={[
              { label: '周视图', value: 'week' },
              { label: '日视图', value: 'day' },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
          />
        </div>

        {/* 日期导航 */}
        <div className="surface-soft px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => changeDate(viewMode === 'week' ? -7 : -1)}
            className="p-1.5 rounded-full text-text-secondary hover:bg-white/40 transition-colors"
            aria-label="上一周期"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-base font-medium text-text-primary">
              {formatMonthDay(selectedDate)}
            </span>
            <span className="text-sm text-text-tertiary ml-2">
              {getWeekdayCN(selectedDate)}
            </span>
          </div>
          <button
            onClick={() => changeDate(viewMode === 'week' ? 7 : 1)}
            className="p-1.5 rounded-full text-text-secondary hover:bg-white/40 transition-colors"
            aria-label="下一周期"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 回到今天 */}
        {selectedDate !== todayStr() && (
          <button
            onClick={() => setSelectedDate(todayStr())}
            className="mt-2 text-xs text-primary-400 font-medium hover:underline"
          >
            回到今天
          </button>
        )}
      </header>

      {/* ===== 日程内容 ===== */}
      <section className="animate-fade-slide-up stagger-1 mb-8">
        <GlassCard>
          {viewMode === 'week' ? (
            <WeekView
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onItemClick={handleItemClick}
              onMoreClick={setOverrideTarget}
            />
          ) : (
            <DayView events={events} date={selectedDate} onItemClick={handleItemClick} onMoreClick={setOverrideTarget} />
          )}
        </GlassCard>
      </section>

      {/* 悬浮添加按钮 */}
      <button
        onClick={() => {
          setEditingEvent(null)
          setFormOpen(true)
        }}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full glass-strong flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary-400) 85%, white)' }}
        aria-label="添加日程"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>

      {/* 新建/编辑表单 */}
      <ScheduleForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={editingEvent ? handleUpdate : handleCreate}
        editingEvent={editingEvent}
        onDelete={() => {
          if (editingEvent) {
            setDeleteTarget(editingEvent)
            closeForm()
          }
        }}
      />

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除"
        footer={
          <>
            <GlassButton variant="ghost" onClick={() => setDeleteTarget(null)}>
              取消
            </GlassButton>
            <GlassButton variant="danger" onClick={handleDelete}>
              删除
            </GlassButton>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          确定要删除「{deleteTarget?.title}」吗？此操作无法撤销。
        </p>
      </Modal>

      {/* 日程实例操作菜单（临时取消/恢复默认） */}
      <Modal
        open={!!overrideTarget}
        onClose={() => setOverrideTarget(null)}
        title="课程调整"
        footer={
          <GlassButton variant="ghost" onClick={() => setOverrideTarget(null)} className="w-full">
            关闭
          </GlassButton>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            「{overrideTarget?.title}」· {formatMonthDay(selectedDate)}
          </p>
          {!isOverrideCancelled() ? (
            <button
              onClick={handleCancelInstance}
              className="w-full flex items-center gap-3 p-3 rounded-lg surface-soft hover:bg-white/40 transition-colors text-left"
            >
              <Ban className="w-5 h-5 text-error shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">临时取消本节课</p>
                <p className="text-xs text-text-tertiary">仅取消这一天，其他日期不受影响</p>
              </div>
            </button>
          ) : (
            <button
              onClick={handleRestoreInstance}
              className="w-full flex items-center gap-3 p-3 rounded-lg surface-soft hover:bg-white/40 transition-colors text-left"
            >
              <RotateCcw className="w-5 h-5 text-primary-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">恢复本节课</p>
                <p className="text-xs text-text-tertiary">移除临时取消，恢复正常显示</p>
              </div>
            </button>
          )}
        </div>
      </Modal>
    </div>
  )
}
