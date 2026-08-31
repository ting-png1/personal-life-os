import { useState, useEffect } from 'react'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassInput, GlassTextarea } from '@/shared/ui/GlassInput'
import { BottomSheet } from '@/shared/ui/BottomSheet'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import type { ScheduleEvent, CreateScheduleInput, ScheduleEventType } from '../types'
import { toDateTimeLocalValue, fromDateTimeLocalValue } from '@/shared/lib/date'

interface ScheduleFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreateScheduleInput) => Promise<void>
  onDelete?: () => void
  editingEvent?: ScheduleEvent | null
}

const TYPE_OPTIONS: { label: string; value: ScheduleEventType }[] = [
  { label: '课程', value: 'class' },
  { label: '个人', value: 'personal' },
  { label: '休息', value: 'rest' },
  { label: '其他', value: 'other' },
]

export function ScheduleForm({ open, onClose, onSubmit, onDelete, editingEvent }: ScheduleFormProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ScheduleEventType>('class')
  const [startDateTime, setStartDateTime] = useState('')
  const [endDateTime, setEndDateTime] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      if (editingEvent) {
        setTitle(editingEvent.title)
        setType(editingEvent.type)
        setStartDateTime(toDateTimeLocalValue(editingEvent.startDateTime))
        setEndDateTime(toDateTimeLocalValue(editingEvent.endDateTime))
        setLocation(editingEvent.location ?? '')
        setNote(editingEvent.note ?? '')
        setIsRecurring(!!editingEvent.recurrence)
        setDaysOfWeek(editingEvent.recurrence?.daysOfWeek ?? [])
      } else {
        setTitle('')
        setType('class')
        setStartDateTime('')
        setEndDateTime('')
        setLocation('')
        setNote('')
        setIsRecurring(false)
        setDaysOfWeek([])
      }
      setError('')
    }
  }, [open, editingEvent])

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('请输入标题')
      return
    }
    if (!startDateTime || !endDateTime) {
      setError('请选择开始和结束时间')
      return
    }
    if (isRecurring && daysOfWeek.length === 0) {
      setError('请至少选择一个重复日')
      return
    }

    setLoading(true)
    try {
      const input: CreateScheduleInput = {
        title: title.trim(),
        type,
        startDateTime: fromDateTimeLocalValue(startDateTime),
        endDateTime: fromDateTimeLocalValue(endDateTime),
        location: location.trim() || null,
        note: note.trim() || null,
        recurrence: isRecurring
          ? {
              freq: 'weekly',
              daysOfWeek,
              startDate: startDateTime.split('T')[0],
              endDate: endDateTime.split('T')[0],
            }
          : null,
      }
      await onSubmit(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const weekDays = [
    { label: '日', value: 0 },
    { label: '一', value: 1 },
    { label: '二', value: 2 },
    { label: '三', value: 3 },
    { label: '四', value: 4 },
    { label: '五', value: 5 },
    { label: '六', value: 6 },
  ]

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editingEvent ? '编辑日程' : '新建日程'}
      height="large"
    >
      <div className="space-y-4 pb-4">
        <GlassInput
          label="标题"
          placeholder="请输入日程标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={error}
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">类型</label>
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={type}
            onChange={(v) => setType(v as ScheduleEventType)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GlassInput
            label="开始时间"
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
          />
          <GlassInput
            label="结束时间"
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
          />
        </div>

        <GlassInput
          label="地点（可选）"
          placeholder="如：教学楼 A301"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        {/* 重复设置 */}
        <div className="p-3 rounded-lg bg-primary-50/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 accent-primary-500"
            />
            <span className="text-sm font-medium text-text-primary">每周重复（课程）</span>
          </label>
          {isRecurring && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {weekDays.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`
                    w-9 h-9 rounded-full text-sm font-medium transition-all
                    ${daysOfWeek.includes(day.value)
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface text-text-secondary border border-border'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <GlassTextarea
          label="备注（可选）"
          placeholder="补充说明..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex justify-between items-center pt-2">
          {/* 编辑模式下显示删除按钮 */}
          {editingEvent && onDelete && (
            <GlassButton variant="ghost" onClick={onDelete} disabled={loading} className="text-error hover:text-error">
              删除
            </GlassButton>
          )}
          <div className="flex gap-3 ml-auto">
            <GlassButton variant="ghost" onClick={onClose} disabled={loading}>
              取消
            </GlassButton>
            <GlassButton onClick={handleSubmit} loading={loading}>
              {editingEvent ? '保存修改' : '创建'}
            </GlassButton>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
