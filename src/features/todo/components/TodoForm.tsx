import { useState, useEffect } from 'react'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassInput, GlassTextarea } from '@/shared/ui/GlassInput'
import { BottomSheet } from '@/shared/ui/BottomSheet'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import type { Todo, CreateTodoInput, TodoRecurrence } from '../types'
import { TODO_CATEGORIES, TODO_RECURRENCE_LABELS } from '../types'

interface TodoFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreateTodoInput) => Promise<void>
  editingTodo?: Todo | null
  onDelete?: () => void
}

export function TodoForm({ open, onClose, onSubmit, editingTodo, onDelete }: TodoFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurrenceStartDate, setRecurrenceStartDate] = useState('')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [priority, setPriority] = useState<'1' | '2' | '3'>('2')
  const [category, setCategory] = useState<string | null>(null)
  const [recurrence, setRecurrence] = useState<TodoRecurrence>('none')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      if (editingTodo) {
        setTitle(editingTodo.title)
        setDescription(editingTodo.description ?? '')
        setDueDate(editingTodo.recurrence === 'none' ? (editingTodo.dueDate ?? '') : '')
        setRecurrenceStartDate(
          editingTodo.recurrence !== 'none'
            ? (editingTodo.recurrenceStartDate ?? editingTodo.dueDate ?? '')
            : ''
        )
        setRecurrenceEndDate(
          editingTodo.recurrence !== 'none' ? (editingTodo.recurrenceEndDate ?? '') : ''
        )
        setPriority(String(editingTodo.priority) as '1' | '2' | '3')
        setCategory(editingTodo.category ?? null)
        setRecurrence(editingTodo.recurrence ?? 'none')
      } else {
        setTitle('')
        setDescription('')
        setDueDate('')
        setRecurrenceStartDate('')
        setRecurrenceEndDate('')
        setPriority('2')
        setCategory(null)
        setRecurrence('none')
      }
      setError('')
    }
  }, [open, editingTodo])

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('请输入待办标题')
      return
    }
    if (recurrence !== 'none' && !recurrenceStartDate) {
      setError('请选择重复起点')
      return
    }
    if (
      recurrence !== 'none' &&
      recurrenceEndDate &&
      recurrenceEndDate < recurrenceStartDate
    ) {
      setError('重复终点不能早于重复起点')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        dueDate: recurrence === 'none' ? (dueDate || null) : null,
        recurrenceStartDate: recurrence === 'none' ? null : recurrenceStartDate,
        recurrenceEndDate: recurrence === 'none' ? null : (recurrenceEndDate || null),
        priority: Number(priority) as 1 | 2 | 3,
        category,
        recurrence,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editingTodo ? '编辑待办' : '新建待办'}
      resetScrollOnOpen
    >
      <div className="space-y-4 pb-4">
        <GlassInput
          label="标题"
          placeholder="请输入待办内容"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={error === '请输入待办标题' ? error : undefined}
        />

        <GlassTextarea
          label="备注（可选）"
          placeholder="补充说明..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {recurrence === 'none' ? (
          <GlassInput
            label="截止日期（可选）"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        ) : (
          <div className="space-y-3">
            <GlassInput
              label="重复起点"
              type="date"
              value={recurrenceStartDate}
              onChange={(e) => {
                setRecurrenceStartDate(e.target.value)
                if (error === '请选择重复起点') setError('')
              }}
              error={error === '请选择重复起点' ? error : undefined}
            />
            {editingTodo && editingTodo.recurrence !== 'none' && !editingTodo.recurrenceStartDate && (
              <p className="text-xs text-text-tertiary mt-1.5">
                {editingTodo?.dueDate
                  ? '这是旧版本任务，已带入原日期；请确认后保存为正式重复起点。'
                  : '当前仅按创建日期临时兼容显示；请设置真实重复起点后再保存。'}
              </p>
            )}
            <div>
              <GlassInput
                label="重复终点（可选）"
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => {
                  setRecurrenceEndDate(e.target.value)
                  if (error === '重复终点不能早于重复起点') setError('')
                }}
                error={error === '重复终点不能早于重复起点' ? error : undefined}
              />
              <p className="text-xs text-text-tertiary mt-1.5">不填则无限重复</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            优先级
          </label>
          <SegmentedControl
            options={[
              { label: '高', value: '1' },
              { label: '中', value: '2' },
              { label: '低', value: '3' },
            ]}
            value={priority}
            onChange={(v) => setPriority(v)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            分类（可选）
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategory(null)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${category === null
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface text-text-secondary border border-border hover:bg-white/40'
                }
              `}
            >
              未分类
            </button>
            {TODO_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all
                  ${category === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface text-text-secondary border border-border hover:bg-white/40'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            重复
          </label>
          <SegmentedControl
            options={[
              { label: TODO_RECURRENCE_LABELS.none, value: 'none' },
              { label: TODO_RECURRENCE_LABELS.daily, value: 'daily' },
              { label: TODO_RECURRENCE_LABELS.weekly, value: 'weekly' },
            ]}
            value={recurrence}
            onChange={(v) => setRecurrence(v as TodoRecurrence)}
          />
          {recurrence !== 'none' && (
            <p className="text-xs text-text-tertiary mt-1.5">
              {recurrence === 'daily' ? '从重复起点开始，每天重复' : '从重复起点开始，每周同一天重复'}
            </p>
          )}
        </div>

        {error &&
          error !== '请输入待办标题' &&
          error !== '请选择重复起点' &&
          error !== '重复终点不能早于重复起点' && (
          <p className="text-sm text-error">{error}</p>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          {editingTodo && onDelete && (
            <button
              onClick={onDelete}
              className="text-sm text-error hover:text-error/80 font-medium transition-colors"
            >
              删除
            </button>
          )}
          <div className="flex justify-end gap-3 ml-auto">
            <GlassButton variant="ghost" onClick={onClose} disabled={loading}>
              取消
            </GlassButton>
            <GlassButton onClick={handleSubmit} loading={loading}>
              {editingTodo ? '保存修改' : '创建'}
            </GlassButton>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
