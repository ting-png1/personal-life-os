// ============================================================
// CycleCalculator — 纯函数
// 生理周期计算：预测、阶段、平均周期、可孕窗口
// 不依赖 React / DOM / Dexie，可单测可移植
// 注意：不做医疗诊断，仅基于历史数据做统计预测
// ============================================================

import { differenceInDays, parseISO, addDays, isBefore, isAfter, isSameDay } from 'date-fns'
import type {
  PeriodRecord,
  CurrentCycleState,
  CycleStats,
  CyclePhase,
} from '../types'

/** 默认周期长度（天），数据不足时使用 */
const DEFAULT_CYCLE_LENGTH = 28
/** 黄体期长度（天），排卵日 = 下次经期 - 黄体期 */
const LUTEAL_PHASE_LENGTH = 14
/** 可孕窗口：排卵日前 5 天到排卵日后 1 天 */
const FERTILE_WINDOW_BEFORE = 5
const FERTILE_WINDOW_AFTER = 1
/** 至少需要多少个完整周期才能做可靠预测 */
const MIN_CYCLES_FOR_PREDICTION = 2

/** 将 "YYYY-MM-DD" 转为 Date */
function toDate(dateStr: string): Date {
  return parseISO(dateStr + 'T00:00:00')
}

/** 按开始日期升序排序（最旧的在前） */
function sortByStartDateAsc(records: PeriodRecord[]): PeriodRecord[] {
  return [...records].sort(
    (a, b) => toDate(a.startDate).getTime() - toDate(b.startDate).getTime()
  )
}

/** 计算所有完整周期的长度（天） */
export function calculateCycleLengths(records: PeriodRecord[]): number[] {
  const sorted = sortByStartDateAsc(records)
  const lengths: number[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const length = differenceInDays(
      toDate(sorted[i + 1].startDate),
      toDate(sorted[i].startDate)
    )
    // 过滤异常值（周期长度在 15-60 天之间才算合理）
    if (length >= 15 && length <= 60) {
      lengths.push(length)
    }
  }
  return lengths
}

/** 计算平均周期长度 */
export function calculateAverageCycleLength(records: PeriodRecord[]): number | null {
  const lengths = calculateCycleLengths(records)
  if (lengths.length === 0) return null
  const sum = lengths.reduce((acc, l) => acc + l, 0)
  return Math.round(sum / lengths.length)
}

/** 计算所有经期长度（天） */
export function calculatePeriodLengths(records: PeriodRecord[]): number[] {
  return records
    .filter((r) => r.endDate !== null)
    .map((r) => differenceInDays(toDate(r.endDate!), toDate(r.startDate)) + 1)
    .filter((l) => l >= 1 && l <= 15) // 过滤异常值
}

/** 计算平均经期长度 */
export function calculateAveragePeriodLength(records: PeriodRecord[]): number | null {
  const lengths = calculatePeriodLengths(records)
  if (lengths.length === 0) return null
  const sum = lengths.reduce((acc, l) => acc + l, 0)
  return Math.round(sum / lengths.length)
}

/** 已记录的完整周期数（有 n 条经期记录则有 n-1 个完整周期） */
export function getRecordedCycleCount(records: PeriodRecord[]): number {
  return Math.max(0, records.length - 1)
}

/** 是否有足够数据做预测 */
export function hasEnoughDataForPrediction(records: PeriodRecord[]): boolean {
  return getRecordedCycleCount(records) >= MIN_CYCLES_FOR_PREDICTION
}

/** 获取当前进行中的经期记录（endDate 为 null 且开始日期 <= 今天） */
export function getCurrentPeriodRecord(
  records: PeriodRecord[],
  today: string
): PeriodRecord | null {
  const todayDate = toDate(today)
  const current = records.find(
    (r) =>
      r.endDate === null &&
      (isBefore(toDate(r.startDate), todayDate) || isSameDay(toDate(r.startDate), todayDate))
  )
  return current ?? null
}

/** 判断某日期是否在经期中 */
export function isDateInPeriod(record: PeriodRecord, date: string): boolean {
  const dateObj = toDate(date)
  const start = toDate(record.startDate)
  if (isBefore(dateObj, start) && !isSameDay(dateObj, start)) return false
  if (record.endDate) {
    const end = toDate(record.endDate)
    return isAfter(dateObj, end) ? false : true
  }
  // 进行中的经期，默认按平均经期长度或默认长度判断
  return true
}

/** 计算是经期第几天（1-based） */
export function getPeriodDay(record: PeriodRecord, date: string): number | null {
  if (!isDateInPeriod(record, date)) return null
  return differenceInDays(toDate(date), toDate(record.startDate)) + 1
}

/** 预测下次经期开始日 */
export function predictNextPeriodDate(
  records: PeriodRecord[],
  _today: string
): string | null {
  if (records.length === 0) return null

  const sorted = sortByStartDateAsc(records)
  const latestStart = sorted[sorted.length - 1].startDate
  const avgCycle = calculateAverageCycleLength(records) ?? DEFAULT_CYCLE_LENGTH

  // 从最近一次经期开始日 + 平均周期长度
  const predicted = addDays(toDate(latestStart), avgCycle)

  // 如果预测日已经过去（可能推迟了），仍然返回预测日
  return predicted.toISOString().split('T')[0]
}

/** 计算排卵日（下次经期 - 14 天） */
export function calculateOvulationDate(nextPeriodDate: string | null): string | null {
  if (!nextPeriodDate) return null
  return addDays(toDate(nextPeriodDate), -LUTEAL_PHASE_LENGTH)
    .toISOString()
    .split('T')[0]
}

/** 计算可孕窗口 */
export function calculateFertileWindow(ovulationDate: string | null): {
  start: string
  end: string
} | null {
  if (!ovulationDate) return null
  const start = addDays(toDate(ovulationDate), -FERTILE_WINDOW_BEFORE)
    .toISOString()
    .split('T')[0]
  const end = addDays(toDate(ovulationDate), FERTILE_WINDOW_AFTER)
    .toISOString()
    .split('T')[0]
  return { start, end }
}

/** 判断当前处于哪个阶段 */
export function determineCurrentPhase(
  records: PeriodRecord[],
  today: string
): CyclePhase | null {
  const currentPeriod = getCurrentPeriodRecord(records, today)
  if (currentPeriod && isDateInPeriod(currentPeriod, today)) {
    return 'period'
  }

  const nextPeriod = predictNextPeriodDate(records, today)
  if (!nextPeriod) return null

  const ovulation = calculateOvulationDate(nextPeriod)
  if (!ovulation) return null

  const todayDate = toDate(today)
  const ovulationDate = toDate(ovulation)
  const nextPeriodDate = toDate(nextPeriod)

  // 排卵期：排卵日前后各 1 天
  const ovulationStart = addDays(ovulationDate, -1)
  const ovulationEnd = addDays(ovulationDate, 1)
  if (
    (isAfter(todayDate, ovulationStart) || isSameDay(todayDate, ovulationStart)) &&
    (isBefore(todayDate, ovulationEnd) || isSameDay(todayDate, ovulationEnd))
  ) {
    return 'ovulation'
  }

  // 卵泡期：经期结束后到排卵期前
  if (isBefore(todayDate, ovulationStart)) {
    return 'follicular'
  }

  // 黄体期：排卵期后到下次经期前
  if (isAfter(todayDate, ovulationEnd) && isBefore(todayDate, nextPeriodDate)) {
    return 'luteal'
  }

  // 如果已经过了预测经期日（推迟了），仍可能是黄体期或即将进入经期
  if (isAfter(todayDate, nextPeriodDate) || isSameDay(todayDate, nextPeriodDate)) {
    return 'luteal'
  }

  return null
}

/** 判断是否推迟（预测经期日已过但还没来） */
export function isPeriodDelayed(
  records: PeriodRecord[],
  today: string
): { delayed: boolean; delayDays: number } {
  const nextPeriod = predictNextPeriodDate(records, today)
  if (!nextPeriod) return { delayed: false, delayDays: 0 }

  const currentPeriod = getCurrentPeriodRecord(records, today)
  // 如果正在经期，不算推迟
  if (currentPeriod && isDateInPeriod(currentPeriod, today)) {
    return { delayed: false, delayDays: 0 }
  }

  const todayDate = toDate(today)
  const nextPeriodDate = toDate(nextPeriod)

  if (isAfter(todayDate, nextPeriodDate)) {
    const delayDays = differenceInDays(todayDate, nextPeriodDate)
    return { delayed: true, delayDays }
  }

  return { delayed: false, delayDays: 0 }
}

/** 计算距下次经期的天数 */
export function getDaysUntilNextPeriod(
  records: PeriodRecord[],
  today: string
): number | null {
  const nextPeriod = predictNextPeriodDate(records, today)
  if (!nextPeriod) return null
  const days = differenceInDays(toDate(nextPeriod), toDate(today))
  return days
}

/** 构建当前周期状态（核心聚合函数） */
export function buildCurrentCycleState(
  records: PeriodRecord[],
  today: string
): CurrentCycleState {
  const currentPeriod = getCurrentPeriodRecord(records, today)
  const isInPeriod = currentPeriod !== null && isDateInPeriod(currentPeriod, today)
  const periodDay = isInPeriod && currentPeriod ? getPeriodDay(currentPeriod, today) : null

  const nextPeriodDate = predictNextPeriodDate(records, today)
  const ovulationDate = calculateOvulationDate(nextPeriodDate)
  const fertileWindow = calculateFertileWindow(ovulationDate)
  const currentPhase = determineCurrentPhase(records, today)

  const { delayed, delayDays } = isPeriodDelayed(records, today)
  const daysUntilNextPeriod = getDaysUntilNextPeriod(records, today)

  const averageCycleLength = calculateAverageCycleLength(records)
  const averagePeriodLength = calculateAveragePeriodLength(records)
  const recordedCycles = getRecordedCycleCount(records)
  const hasEnoughData = hasEnoughDataForPrediction(records)

  return {
    isInPeriod,
    currentPhase,
    periodDay,
    daysUntilNextPeriod,
    nextPeriodDate,
    ovulationDate,
    fertileWindow,
    isDelayed: delayed,
    delayDays,
    averageCycleLength,
    averagePeriodLength,
    recordedCycles,
    recordCount: records.length,
    hasEnoughData,
    currentPeriodRecord: currentPeriod,
  }
}

/** 构建所有周期的统计信息列表（用于历史展示） */
export function buildCycleStatsList(records: PeriodRecord[]): CycleStats[] {
  const sorted = sortByStartDateAsc(records)
  const stats: CycleStats[] = []

  for (let i = 0; i < sorted.length; i++) {
    const record = sorted[i]
    const nextRecord = sorted[i + 1] ?? null

    const periodLength = record.endDate
      ? differenceInDays(toDate(record.endDate), toDate(record.startDate)) + 1
      : null

    const cycleLength = nextRecord
      ? differenceInDays(toDate(nextRecord.startDate), toDate(record.startDate))
      : null

    const nextPeriodStart = nextRecord ? nextRecord.startDate : null
    const ovulationDate = nextPeriodStart
      ? calculateOvulationDate(nextPeriodStart)
      : null
    const fertileWindow = ovulationDate ? calculateFertileWindow(ovulationDate) : null

    stats.push({
      cycleNumber: i + 1,
      periodStartDate: record.startDate,
      periodEndDate: record.endDate,
      nextPeriodStartDate: nextPeriodStart,
      cycleLength,
      periodLength,
      ovulationDate,
      fertileWindowStart: fertileWindow?.start ?? null,
      fertileWindowEnd: fertileWindow?.end ?? null,
    })
  }

  return stats.reverse() // 最新的在前
}
