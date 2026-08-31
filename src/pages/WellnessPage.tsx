import { useState } from 'react'
import { Plus, Heart, Droplets } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassButton } from '@/shared/ui/GlassButton'
import { Modal } from '@/shared/ui/Modal'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { useMood } from '@/features/mood/hooks/useMood'
import { MoodQuickRecord } from '@/features/mood/components/MoodQuickRecord'
import { MoodHistoryList } from '@/features/mood/components/MoodHistoryList'
import { MoodPicker } from '@/features/mood/components/MoodPicker'
import { useCycle } from '@/features/cycle/hooks/useCycle'
import { CycleStatusCard } from '@/features/cycle/components/CycleStatusCard'
import { CycleHistoryList } from '@/features/cycle/components/CycleHistoryList'
import { PeriodForm } from '@/features/cycle/components/PeriodForm'
import type { MoodRecord, CreateMoodInput, MoodLevel } from '@/features/mood/types'
import type { PeriodRecord, CreatePeriodInput } from '@/features/cycle/types'
import { MOOD_LABELS, MOOD_COLORS } from '@/shared/lib/constants'
import { MOOD_EMOJIS } from '@/features/mood/services/moodServices'
import { getWeekdayCN, formatMonthDay } from '@/shared/lib/date'

type ModuleMode = 'mood' | 'cycle'
type MoodViewMode = 'today' | 'history'

export function WellnessPage() {
  const [moduleMode, setModuleMode] = useState<ModuleMode>('mood')
  const [moodViewMode, setMoodViewMode] = useState<MoodViewMode>('today')

  // Mood state
  const [quickRecordOpen, setQuickRecordOpen] = useState(false)
  const [moodDeleteTarget, setMoodDeleteTarget] = useState<MoodRecord | null>(null)
  const { records: moodRecords, latest, hasRecorded, create: createMood, remove: removeMood } = useMood()

  // Cycle state
  const [periodFormOpen, setPeriodFormOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<PeriodRecord | null>(null)
  const [periodMode, setPeriodMode] = useState<'record' | 'end'>('record')
  const [cycleDeleteTarget, setCycleDeleteTarget] = useState<PeriodRecord | null>(null)
  const {
    records: periodRecords,
    currentCycleState,
    cycleStats,
    create: createPeriod,
    update: updatePeriod,
    remove: removePeriod,
  } = useCycle()

  // Mood handlers
  const handleMoodQuickRecord = async (input: CreateMoodInput) => {
    await createMood(input)
  }
  const handleMoodQuickPick = async (level: MoodLevel) => {
    await createMood({ level })
  }
  const handleMoodDelete = async () => {
    if (!moodDeleteTarget) return
    await removeMood(moodDeleteTarget.id)
    setMoodDeleteTarget(null)
  }

  // Cycle handlers
  const handlePeriodSubmit = async (input: CreatePeriodInput) => {
    if (editingPeriod) {
      await updatePeriod(editingPeriod.id, input)
    } else {
      await createPeriod(input)
    }
  }
  const handleEndPeriod = async () => {
    if (!currentCycleState.currentPeriodRecord) return
    const today = new Date().toISOString().split('T')[0]
    await updatePeriod(currentCycleState.currentPeriodRecord.id, { endDate: today })
  }
  const handleCycleDelete = async () => {
    if (!cycleDeleteTarget) return
    await removePeriod(cycleDeleteTarget.id)
    setCycleDeleteTarget(null)
  }
  const openRecordForm = () => {
    setEditingPeriod(null)
    setPeriodMode('record')
    setPeriodFormOpen(true)
  }
  const openEditPeriod = (record: PeriodRecord) => {
    setEditingPeriod(record)
    setPeriodMode('record')
    setPeriodFormOpen(true)
  }

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen pb-24">
      {/* 顶部标题 + 模块切换 */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-text-primary">状态</h1>
          <SegmentedControl
            size="sm"
            options={[
              { label: '情绪', value: 'mood' },
              { label: '周期', value: 'cycle' },
            ]}
            value={moduleMode}
            onChange={(v) => setModuleMode(v as ModuleMode)}
          />
        </div>
        <p className="text-sm text-text-secondary">
          {formatMonthDay(new Date().toISOString())} · {getWeekdayCN(todayStr)}
        </p>
      </div>

      {/* 情绪模块 */}
      {moduleMode === 'mood' && (
        <>
          {/* 情绪视图切换 */}
          <div className="px-5 mb-3">
            <SegmentedControl
              size="sm"
              options={[
                { label: '今日', value: 'today' },
                { label: '历史', value: 'history' },
              ]}
              value={moodViewMode}
              onChange={(v) => setMoodViewMode(v as MoodViewMode)}
            />
          </div>

          {moodViewMode === 'today' ? (
            <div className="px-5 space-y-4">
              {/* 今日心情卡片 */}
              <GlassCard>
                <div className="text-center py-4">
                  {hasRecorded && latest ? (
                    <>
                      <div className="text-5xl mb-3">{MOOD_EMOJIS[latest.level]}</div>
                      <p className="text-lg font-semibold" style={{ color: MOOD_COLORS[latest.level] }}>
                        {MOOD_LABELS[latest.level]}
                      </p>
                      {latest.tags.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                          {latest.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2.5 py-1 rounded-full text-xs bg-primary-50 text-primary-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {latest.note && (
                        <p className="text-sm text-text-secondary mt-3 px-4">{latest.note}</p>
                      )}
                      <button
                        onClick={() => setQuickRecordOpen(true)}
                        className="mt-4 text-xs text-primary-500 font-medium hover:underline"
                      >
                        再记一条
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-8 h-8 text-primary-300" />
                      </div>
                      <p className="text-base font-medium text-text-primary mb-1">今天感觉怎么样？</p>
                      <p className="text-sm text-text-secondary mb-5">点一下表情，快速记录心情</p>
                      <MoodPicker value={null} onChange={handleMoodQuickPick} variant="A" size={46} />
                      <button
                        onClick={() => setQuickRecordOpen(true)}
                        className="mt-5 text-xs text-primary-500 font-medium hover:underline"
                      >
                        添加标签和备注
                      </button>
                    </>
                  )}
                </div>
              </GlassCard>

              {/* 今日记录列表 */}
              {hasRecorded && (
                <GlassCard padding="none">
                  <div className="p-2">
                    <MoodHistoryList
                      records={moodRecords.filter((r) => r.date === todayStr)}
                      onDelete={(id) => {
                        const record = moodRecords.find((r) => r.id === id)
                        if (record) setMoodDeleteTarget(record)
                      }}
                    />
                  </div>
                </GlassCard>
              )}
            </div>
          ) : (
            /* 情绪历史视图 */
            <div className="px-5">
              <GlassCard padding="none">
                <div className="p-2">
                  <MoodHistoryList
                    records={moodRecords}
                    onDelete={(id) => {
                      const record = moodRecords.find((r) => r.id === id)
                      if (record) setMoodDeleteTarget(record)
                    }}
                  />
                </div>
              </GlassCard>
            </div>
          )}
        </>
      )}

      {/* 周期模块 */}
      {moduleMode === 'cycle' && (
        <div className="px-5 space-y-4">
          {/* 周期状态卡片 */}
          <CycleStatusCard
            state={currentCycleState}
            onRecordClick={openRecordForm}
            onEndPeriodClick={handleEndPeriod}
          />

          {/* 历史周期列表 */}
          {periodRecords.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-sm font-medium text-text-secondary">历史记录</p>
                <span className="text-xs text-text-tertiary">{periodRecords.length} 条</span>
              </div>
              <CycleHistoryList
                stats={cycleStats}
                records={periodRecords}
                onDelete={(id) => {
                  const record = periodRecords.find((r) => r.id === id)
                  if (record) setCycleDeleteTarget(record)
                }}
                onEdit={openEditPeriod}
              />
            </div>
          )}
        </div>
      )}

      {/* 悬浮添加按钮（根据模块切换） */}
      <button
        onClick={moduleMode === 'mood' ? () => setQuickRecordOpen(true) : openRecordForm}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-gradient-to-r from-primary-400 to-primary-500 text-white shadow-glow flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        aria-label={moduleMode === 'mood' ? '记录心情' : '记录经期'}
      >
        {moduleMode === 'mood' ? <Plus className="w-6 h-6" /> : <Droplets className="w-6 h-6" />}
      </button>

      {/* 情绪快速记录弹窗 */}
      <MoodQuickRecord
        open={quickRecordOpen}
        onClose={() => setQuickRecordOpen(false)}
        onSubmit={handleMoodQuickRecord}
      />

      {/* 经期记录/编辑弹窗 */}
      <PeriodForm
        open={periodFormOpen}
        onClose={() => {
          setPeriodFormOpen(false)
          setEditingPeriod(null)
        }}
        onSubmit={handlePeriodSubmit}
        editingRecord={editingPeriod}
        mode={periodMode}
      />

      {/* 情绪删除确认 */}
      <Modal
        open={!!moodDeleteTarget}
        onClose={() => setMoodDeleteTarget(null)}
        title="确认删除"
        footer={
          <>
            <GlassButton variant="ghost" onClick={() => setMoodDeleteTarget(null)}>
              取消
            </GlassButton>
            <GlassButton variant="danger" onClick={handleMoodDelete}>
              删除
            </GlassButton>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          确定要删除这条心情记录吗？此操作无法撤销。
        </p>
      </Modal>

      {/* 经期删除确认 */}
      <Modal
        open={!!cycleDeleteTarget}
        onClose={() => setCycleDeleteTarget(null)}
        title="确认删除"
        footer={
          <>
            <GlassButton variant="ghost" onClick={() => setCycleDeleteTarget(null)}>
              取消
            </GlassButton>
            <GlassButton variant="danger" onClick={handleCycleDelete}>
              删除
            </GlassButton>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          确定要删除这条经期记录吗？删除后周期预测可能会变化，此操作无法撤销。
        </p>
      </Modal>
    </div>
  )
}
