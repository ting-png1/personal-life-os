// ============================================================
// Constants & Mappings
// ============================================================

import type { MoodLevel } from '@/features/mood/types'
import type { ScheduleEventType } from '@/features/schedule/types'
import type { CyclePhase, FlowLevel } from '@/features/cycle/types'

// ---------- Todo 优先级 ----------
export const PRIORITY_LABELS: Record<1 | 2 | 3, string> = {
  1: '高',
  2: '中',
  3: '低',
}

export const PRIORITY_COLORS: Record<1 | 2 | 3, string> = {
  1: 'var(--color-error)', // 高=红
  2: 'var(--color-warning)', // 中=橙
  3: 'var(--color-info)', // 低=蓝
}

// ---------- Schedule 类型 ----------
export const SCHEDULE_TYPE_LABELS: Record<ScheduleEventType, string> = {
  class: '课程',
  personal: '个人',
  rest: '休息',
  other: '其他',
}

export const SCHEDULE_TYPE_COLORS: Record<ScheduleEventType, string> = {
  class: 'var(--color-type-class)',
  personal: 'var(--color-type-personal)',
  rest: 'var(--color-type-rest)',
  other: 'var(--color-type-other)',
}

// ---------- Mood 等级 ----------
export const MOOD_LABELS: Record<MoodLevel, string> = {
  1: '很糟',
  2: '不好',
  3: '平稳',
  4: '不错',
  5: '很好',
}

export const MOOD_COLORS: Record<MoodLevel, string> = {
  1: 'var(--color-mood-1)',
  2: 'var(--color-mood-2)',
  3: 'var(--color-mood-3)',
  4: 'var(--color-mood-4)',
  5: 'var(--color-mood-5)',
}

/** 预设情绪标签 */
export const MOOD_PRESET_TAGS: string[] = [
  '焦虑',
  '开心',
  '疲惫',
  '平静',
  '兴奋',
  '难过',
  '烦躁',
  '满足',
  '孤独',
  '充实',
  '迷茫',
  '放松',
]

// ---------- 星期 ----------
export const WEEKDAY_LABELS_CN: string[] = [
  '周日',
  '周一',
  '周二',
  '周三',
  '周四',
  '周五',
  '周六',
]

export const WEEKDAY_LABELS_SHORT_CN: string[] = [
  '日',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
]

// ---------- Cycle 周期阶段 ----------
export const CYCLE_PHASE_LABELS: Record<CyclePhase, string> = {
  period: '经期',
  follicular: '卵泡期',
  ovulation: '排卵期',
  luteal: '黄体期',
}

export const CYCLE_PHASE_DESCRIPTIONS: Record<CyclePhase, string> = {
  period: '经期到来，注意休息和保暖',
  follicular: '经期结束后，身体逐渐恢复',
  ovulation: '排卵期，体温可能略有升高',
  luteal: '黄体期，可能出现经前不适',
}

export const CYCLE_PHASE_COLORS: Record<CyclePhase, string> = {
  period: 'var(--color-error)',
  follicular: 'var(--color-info)',
  ovulation: 'var(--color-mood-5)',
  luteal: 'var(--color-warning)',
}

// ---------- Cycle 经量 ----------
export const FLOW_LEVEL_LABELS: Record<FlowLevel, string> = {
  1: '少',
  2: '中',
  3: '多',
}

/** 预设经期症状标签 */
export const PERIOD_SYMPTOM_PRESETS: string[] = [
  '痛经',
  '腰酸',
  '头痛',
  '乏力',
  '情绪波动',
  '腹胀',
  '乳房胀痛',
  '失眠',
  '食欲变化',
  '长痘',
]
