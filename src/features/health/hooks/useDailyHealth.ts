import { useEffect, useState } from 'react'
import { healthRepository } from '../repository'
import type { DailyHealthSummary } from '../types'

type DailyHealthQueryState =
  | Readonly<{
      date: string
      status: 'loading'
      summary: null
      error: null
    }>
  | Readonly<{
      date: string
      status: 'ready'
      summary: DailyHealthSummary | null
      error: null
    }>
  | Readonly<{
      date: string
      status: 'error'
      summary: null
      error: string
    }>

export interface DailyHealthQueryResult {
  summary: DailyHealthSummary | null
  ready: boolean
  loading: boolean
  error: string | null
}

/** 从 Health Repository 读取指定本地日期的一份 normalized summary。 */
export function useDailyHealth(date: string): DailyHealthQueryResult {
  const [state, setState] = useState<DailyHealthQueryState>(() => ({
    date,
    status: 'loading',
    summary: null,
    error: null,
  }))

  useEffect(() => {
    let active = true
    setState({ date, status: 'loading', summary: null, error: null })

    healthRepository.getByDate(date).then(
      (summary) => {
        if (!active) return
        setState({
          date,
          status: 'ready',
          summary: summary ?? null,
          error: null,
        })
      },
      (error: unknown) => {
        if (!active) return
        setState({
          date,
          status: 'error',
          summary: null,
          error: error instanceof Error ? error.message : 'Health data load failed',
        })
      }
    )

    return () => {
      active = false
    }
  }, [date])

  // date 改变后的首次 render 不得短暂暴露上一日期的数据。
  if (state.date !== date) {
    return { summary: null, ready: false, loading: true, error: null }
  }

  return {
    summary: state.status === 'ready' ? state.summary : null,
    ready: state.status === 'ready',
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
  }
}
