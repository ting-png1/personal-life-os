import { useState, useEffect } from 'react'
import { GlassButton } from '@/shared/ui/GlassButton'
import { GlassInput, GlassTextarea } from '@/shared/ui/GlassInput'
import { BottomSheet } from '@/shared/ui/BottomSheet'
import type { PeriodRecord, CreatePeriodInput, FlowLevel } from '../types'
import { FLOW_LEVEL_LABELS, PERIOD_SYMPTOM_PRESETS } from '@/shared/lib/constants'
import { todayStr } from '@/shared/lib/date'

interface PeriodFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: CreatePeriodInput) => Promise<void>
  editingRecord?: PeriodRecord | null
  /** 模式：record=记录新经期，end=结束当前经期 */
  mode?: 'record' | 'end'
  /** 编辑模式下的删除回调 */
  onDelete?: () => void
}

export function PeriodForm({ open, onClose, onSubmit, editingRecord, mode = 'record', onDelete }: PeriodFormProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [flowLevel, setFlowLevel] = useState<FlowLevel | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      if (editingRecord) {
        setStartDate(editingRecord.startDate)
        setEndDate(editingRecord.endDate ?? '')
        setFlowLevel(editingRecord.flowLevel)
        setSymptoms(editingRecord.symptoms)
        setNote(editingRecord.note ?? '')
      } else if (mode === 'end') {
        // 结束当前经期：开始日期默认今天（实际应为当前经期的开始日）
        setStartDate(todayStr())
        setEndDate(todayStr())
        setFlowLevel(null)
        setSymptoms([])
        setNote('')
      } else {
        setStartDate(todayStr())
        setEndDate('')
        setFlowLevel(null)
        setSymptoms([])
        setNote('')
      }
      setError('')
    }
  }, [open, editingRecord, mode])

  const toggleSymptom = (symptom: string) => {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    )
  }

  const handleSubmit = async () => {
    if (!startDate) {
      setError('请选择开始日期')
      return
    }
    if (endDate && endDate < startDate) {
      setError('结束日期不能早于开始日期')
      return
    }

    setLoading(true)
    try {
      const input: CreatePeriodInput = {
        startDate,
        endDate: endDate || null,
        flowLevel,
        symptoms,
        note: note.trim() || null,
      }
      await onSubmit(input)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const flowOptions: { label: string; value: FlowLevel }[] = [
    { label: FLOW_LEVEL_LABELS[1], value: 1 },
    { label: FLOW_LEVEL_LABELS[2], value: 2 },
    { label: FLOW_LEVEL_LABELS[3], value: 3 },
  ]

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editingRecord ? '编辑经期记录' : mode === 'end' ? '记录经期结束' : '记录经期'}
      height="large"
    >
      <div className="space-y-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GlassInput
            label="开始日期"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            error={error}
          />
          <GlassInput
            label="结束日期（可选）"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">经量（可选，再次点击可取消）</label>
          <div className="flex gap-2">
            {flowOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFlowLevel(flowLevel === opt.value ? null : opt.value)}
                className={`
                  flex-1 py-2 rounded-lg text-sm font-medium transition-all
                  ${flowLevel === opt.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface text-text-secondary border border-border hover:border-primary-300'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">症状（可选）</label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_SYMPTOM_PRESETS.map((symptom) => (
              <button
                key={symptom}
                onClick={() => toggleSymptom(symptom)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-all
                  ${symptoms.includes(symptom)
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface text-text-secondary border border-border hover:border-primary-300'
                  }
                `}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>

        <GlassTextarea
          label="备注（可选）"
          placeholder="补充说明..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center justify-between gap-3 pt-2">
          {editingRecord && onDelete && (
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
              {editingRecord ? '保存修改' : '保存'}
            </GlassButton>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
