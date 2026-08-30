import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassButton } from '@/shared/ui/GlassButton'
import { Modal } from '@/shared/ui/Modal'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { useSchedule } from '@/features/schedule/hooks/useSchedule'
import { WeekView } from '@/features/schedule/components/WeekView'
import { DayView } from '@/features/schedule/components/DayView'
import { ScheduleForm } from '@/features/schedule/components/ScheduleForm'
import type { ScheduleEvent, ScheduleInstance, CreateScheduleInput } from '@/features/schedule/types'
import { todayStr, getWeekdayCN, formatMonthDay, addDays, format } from '@/shared/lib/date'

type ViewMode = 'week' | 'day'

export function SchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEvent | null>(null)

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

  const closeForm = () => {
    setFormOpen(false)
    setEditingEvent(null)
  }

  const changeDate = (delta: number) => {
    const newDate = format(addDays(new Date(selectedDate + 'T00:00:00'), delta), 'yyyy-MM-dd')
    setSelectedDate(newDate)
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 顶部标题栏 */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-text-primary">日程</h1>
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => changeDate(-7)}
            className="p-1.5 rounded-full text-text-secondary hover:bg-primary-50 transition-colors"
            aria-label="上一周"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-base font-semibold text-text-primary">
              {formatMonthDay(selectedDate)}
            </span>
            <span className="text-sm text-text-secondary ml-2">
              {getWeekdayCN(selectedDate)}
            </span>
          </div>
          <button
            onClick={() => changeDate(7)}
            className="p-1.5 rounded-full text-text-secondary hover:bg-primary-50 transition-colors"
            aria-label="下一周"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 回到今天 */}
        {selectedDate !== todayStr() && (
          <button
            onClick={() => setSelectedDate(todayStr())}
            className="mt-2 text-xs text-primary-500 font-medium hover:underline"
          >
            回到今天
          </button>
        )}
      </div>

      {/* 日程内容 */}
      <div className="px-5">
        <GlassCard>
          {viewMode === 'week' ? (
            <WeekView
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onItemClick={handleItemClick}
            />
          ) : (
            <DayView events={events} date={selectedDate} onItemClick={handleItemClick} />
          )}
        </GlassCard>
      </div>

      {/* 悬浮添加按钮 */}
      <button
        onClick={() => {
          setEditingEvent(null)
          setFormOpen(true)
        }}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-gradient-to-r from-primary-400 to-primary-500 text-white shadow-glow flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        aria-label="添加日程"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 新建/编辑表单 */}
      <ScheduleForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={editingEvent ? handleUpdate : handleCreate}
        editingEvent={editingEvent}
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
    </div>
  )
}
