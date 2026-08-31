import { useState, useEffect } from 'react'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassInput, GlassTextarea } from '@/shared/ui/GlassInput'
import { BottomSheet } from '@/shared/ui/BottomSheet'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import type { Todo, CreateTodoInput } from '../types'

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
  const [priority, setPriority] = useState<'1' | '2' | '3'>('2')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      if (editingTodo) {
        setTitle(editingTodo.title)
        setDescription(editingTodo.description ?? '')
        setDueDate(editingTodo.dueDate ?? '')
        setPriority(String(editingTodo.priority) as '1' | '2' | '3')
      } else {
        setTitle('')
        setDescription('')
        setDueDate('')
        setPriority('2')
      }
      setError('')
    }
  }, [open, editingTodo])

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('请输入待办标题')
      return
    }
    setLoading(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate || null,
        priority: Number(priority) as 1 | 2 | 3,
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
    >
      <div className="space-y-4 pb-4">
        <GlassInput
          label="标题"
          placeholder="请输入待办内容"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={error}
          autoFocus
        />

        <GlassTextarea
          label="备注（可选）"
          placeholder="补充说明..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <GlassInput
          label="截止日期（可选）"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

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
