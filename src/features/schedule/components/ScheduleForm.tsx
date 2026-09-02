import { useState, useEffect } from 'react'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassInput, GlassTextarea } from '@/shared/ui/GlassInput'
import { BottomSheet } from '@/shared/ui/BottomSheet'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { X, Plus } from 'lucide-react'
import type { ScheduleEvent, CreateScheduleInput, ScheduleEventType, RecurrenceRule } from '../types'
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

const WEEK_PARITY_OPTIONS = [
  { label: '每周', value: 'all' as const },
  { label: '单周', value: 'odd' as const },
  { label: '双周', value: 'even' as const },
]

export function ScheduleForm({ open, onClose, onSubmit, onDelete, editingEvent }: ScheduleFormProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ScheduleEventType>('class')
  const [startDateTime, setStartDateTime] = useState('')
  const [endDateTime, setEndDateTime] = useState('')
  const [recurrenceStartDate, setRecurrenceStartDate] = useState('')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [weekParity, setWeekParity] = useState<'all' | 'odd' | 'even'>('all')
  const [startWeek, setStartWeek] = useState('')
  const [endWeek, setEndWeek] = useState('')
  const [excludedDates, setExcludedDates] = useState<string[]>([])
  const [newExcludedDate, setNewExcludedDate] = useState('')
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
        setRecurrenceStartDate(editingEvent.recurrence?.startDate ?? '')
        setRecurrenceEndDate(editingEvent.recurrence?.endDate ?? '')
        setDaysOfWeek(editingEvent.recurrence?.daysOfWeek ?? [])
        setWeekParity(editingEvent.recurrence?.weekParity ?? 'all')
        setStartWeek(editingEvent.recurrence?.weekRange ? String(editingEvent.recurrence.weekRange[0]) : '')
        setEndWeek(editingEvent.recurrence?.weekRange ? String(editingEvent.recurrence.weekRange[1]) : '')
        setExcludedDates(editingEvent.recurrence?.excludedDates ?? [])
      } else {
        setTitle('')
        setType('class')
        setStartDateTime('')
        setEndDateTime('')
        setLocation('')
        setNote('')
        setIsRecurring(false)
        setRecurrenceStartDate('')
        setRecurrenceEndDate('')
        setDaysOfWeek([])
        setWeekParity('all')
        setStartWeek('')
        setEndWeek('')
        setExcludedDates([])
        setNewExcludedDate('')
      }
      setError('')
    }
  }, [open, editingEvent])

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const addExcludedDate = () => {
    if (!newExcludedDate) return
    if (excludedDates.includes(newExcludedDate)) {
      setNewExcludedDate('')
      return
    }
    setExcludedDates((prev) => [...prev, newExcludedDate].sort())
    setNewExcludedDate('')
  }

  const removeExcludedDate = (date: string) => {
    setExcludedDates((prev) => prev.filter((d) => d !== date))
  }

  const buildRecurrence = (): RecurrenceRule | null => {
    if (!isRecurring) return null

    const recurrence: RecurrenceRule = {
      ...(editingEvent?.recurrence ?? {}),
      freq: 'weekly',
      daysOfWeek,
      startDate: recurrenceStartDate,
      endDate: recurrenceEndDate,
    }

    if (weekParity !== 'all') {
      recurrence.weekParity = weekParity
    } else {
      delete recurrence.weekParity
    }

    const sw = parseInt(startWeek, 10)
    const ew = parseInt(endWeek, 10)
    if (!isNaN(sw) && !isNaN(ew) && sw > 0 && ew >= sw) {
      recurrence.weekRange = [sw, ew]
    } else {
      delete recurrence.weekRange
    }

    if (excludedDates.length > 0) {
      recurrence.excludedDates = excludedDates
    } else {
      delete recurrence.excludedDates
    }

    return recurrence
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
    if (isRecurring && (!recurrenceStartDate || !recurrenceEndDate)) {
      setError('请选择重复开始和结束日期')
      return
    }
    if (isRecurring && recurrenceEndDate < recurrenceStartDate) {
      setError('重复结束日期不能早于开始日期')
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
        recurrence: buildRecurrence(),
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

        {/* 重复设置 — 使用较不透明背景减少半透明层叠加，降低 iOS 合成 artifact */}
        <div className="p-3 rounded-lg bg-primary-50/80 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => {
                const checked = e.target.checked
                setIsRecurring(checked)
                if (checked && !recurrenceStartDate && startDateTime) {
                  setRecurrenceStartDate(startDateTime.split('T')[0])
                }
              }}
              className="w-4 h-4 accent-primary-500"
            />
            <span className="text-sm font-medium text-text-primary">每周重复（课程）</span>
          </label>

          {isRecurring && (
            <>
              {/* 重复生效日期范围 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">重复日期范围</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <GlassInput
                    label="开始日期"
                    type="date"
                    value={recurrenceStartDate}
                    onChange={(e) => setRecurrenceStartDate(e.target.value)}
                  />
                  <GlassInput
                    label="结束日期"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* 星期几选择 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">重复日</label>
                <div className="flex gap-2 flex-wrap">
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
              </div>

              {/* 单双周 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">单双周</label>
                <SegmentedControl
                  options={WEEK_PARITY_OPTIONS}
                  value={weekParity}
                  onChange={(v) => setWeekParity(v as 'all' | 'odd' | 'even')}
                />
              </div>

              {/* 周范围 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">周范围（可选，留空表示整学期）</label>
                <div className="flex items-center gap-2">
                  <GlassInput
                    type="number"
                    placeholder="第"
                    value={startWeek}
                    onChange={(e) => setStartWeek(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-text-secondary text-sm">至</span>
                  <GlassInput
                    type="number"
                    placeholder="第"
                    value={endWeek}
                    onChange={(e) => setEndWeek(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-text-secondary text-sm">周</span>
                </div>
              </div>

              {/* 排除日期 */}
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">排除日期（放假/调课休课，可选）</label>
                <div className="flex items-center gap-2 mb-2">
                  <GlassInput
                    type="date"
                    value={newExcludedDate}
                    onChange={(e) => setNewExcludedDate(e.target.value)}
                    className="flex-1"
                  />
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={addExcludedDate}
                    leftIcon={<Plus size={14} />}
                  >
                    添加
                  </GlassButton>
                </div>
                {excludedDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {excludedDates.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface text-xs text-text-secondary border border-border"
                      >
                        {date}
                        <button
                          onClick={() => removeExcludedDate(date)}
                          className="hover:text-error transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
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
