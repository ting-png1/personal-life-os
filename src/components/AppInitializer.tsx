import { useEffect, useState } from 'react'
import { useTodoStore } from '@/features/todo/store'
import { useScheduleStore } from '@/features/schedule/store'
import { useMoodStore } from '@/features/mood/store'
import { useCycleStore } from '@/features/cycle/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSyncStore } from '@/features/sync/store'
import { Heart } from 'lucide-react'
import { openAppDatabase } from '@/data/database'

interface AppInitializerProps {
  children: React.ReactNode
}

// 启动诊断工具
function bootLog(step: string, detail?: Record<string, unknown>) {
  console.log(`[BOOT] ${step}`, detail ?? '')
}

export function AppInitializer({ children }: AppInitializerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bootStage, setBootStage] = useState<string>('初始化中...')

  const loadTodos = useTodoStore((s) => s.loadAll)
  const loadSchedule = useScheduleStore((s) => s.loadAll)
  const loadMood = useMoodStore((s) => s.loadAll)
  const loadCycle = useCycleStore((s) => s.loadAll)
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { syncNow, startRuntimeListeners } = useSyncStore()

  // Sync v1 是唯一 runtime 同步入口；监听 online / focus / PWA resume。
  useEffect(() => startRuntimeListeners(), [startRuntimeListeners])

  // 主初始化流程
  useEffect(() => {
    const BOOT_START = performance.now()
    bootLog('AppInitializer 挂载')

    let cancelled = false
    // 最大初始化时间：6秒后强制进入 App，避免永久 loading/白屏
    const INIT_TIMEOUT = 6000
    // 带超时的 Promise - 确保永远不会永久 pending
    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> =>
      Promise.race([
        promise.then((val) => {
          bootLog(`${label} 完成`, { elapsed: performance.now() - BOOT_START })
          return val
        }),
        new Promise<T>((resolve) => {
          setTimeout(() => {
            console.warn(`[BOOT] ${label} 超时（${ms}ms），使用降级方案`)
            resolve(fallback)
          }, ms)
        }),
      ])

    async function init() {
      try {
        // 1. 加载本地数据（带超时，超时后使用空数据进入 App）
        setBootStage('加载本地数据...')
        bootLog('开始加载本地数据', { elapsed: performance.now() - BOOT_START })

        const migrationReady = await withTimeout(
          openAppDatabase().then((status) => {
            bootLog('本地数据库 Migration Gate 通过', {
              schemaVersion: status.schemaVersion,
            })
            return true
          }),
          INIT_TIMEOUT,
          false,
          '本地数据库 Migration Gate',
        )
        if (!migrationReady) {
          throw new Error('本地数据库升级超时，未进入 READY 状态')
        }

        const loadResult = await withTimeout(
          Promise.all([
            loadTodos().catch((e) => { console.warn('[BOOT] loadTodos 失败:', e); return null }),
            loadSchedule().catch((e) => { console.warn('[BOOT] loadSchedule 失败:', e); return null }),
            loadMood().catch((e) => { console.warn('[BOOT] loadMood 失败:', e); return null }),
            loadCycle().catch((e) => { console.warn('[BOOT] loadCycle 失败:', e); return null }),
          ]).then(() => true),
          INIT_TIMEOUT,
          false,
          '本地数据加载'
        )

        if (cancelled) {
          bootLog('组件已卸载，中止初始化')
          return
        }

        if (!loadResult) {
          console.warn('[BOOT] 本地数据加载超时，使用空数据进入 App')
        }

        // 关键：无论成功还是超时，都必须进入 App
        setBootStage('准备就绪')
        setLoading(false)
        bootLog('App 进入 READY 状态', {
          elapsed: performance.now() - BOOT_START,
          loadResult,
        })

      } catch (err) {
        console.error('[BOOT] 初始化异常:', err)
        if (!cancelled) {
          // 即使出错，也尝试进入 App（而不是永远停在 loading）
          setError(err instanceof Error ? err.message : '数据加载失败')
          setLoading(false)
          bootLog('初始化异常，但已进入 App（显示错误页）', {
            elapsed: performance.now() - BOOT_START,
          })
        }
      }
    }

    init()

    // 安全兜底：8秒后如果还在 loading，强制进入 App
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn('[BOOT] 安全兜底触发：8秒仍未完成初始化，强制进入 App')
        setLoading(false)
      }
    }, 8000)

    return () => {
      cancelled = true
      clearTimeout(safetyTimer)
    }
  }, [loadTodos, loadSchedule, loadMood, loadCycle])

  // Local READY 后再做一次 best-effort Sync v1。认证、网络或云端失败均不阻塞 App。
  useEffect(() => {
    if (loading || authLoading || !isAuthenticated) return
    let cancelled = false

    void syncNow().then((result) => {
      if (!cancelled) {
        bootLog('Sync v1 启动同步完成', {
          success: result.success,
          pushed: result.pushed ?? 0,
          pulled: result.pulled ?? 0,
        })
      }
    }).catch((error) => {
      console.error('[BOOT] Sync v1 启动同步失败，本地模式继续可用:', error)
    })

    return () => {
      cancelled = true
    }
  }, [loading, authLoading, isAuthenticated, syncNow])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center shadow-glow animate-pulse">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm text-text-secondary mt-4">正在加载...</p>
        <p className="text-xs text-text-tertiary mt-2">{bootStage}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-8">
        <p className="text-base font-medium text-text-primary mb-2">数据加载遇到问题</p>
        <p className="text-sm text-text-secondary text-center mb-4">{error}</p>
        <p className="text-xs text-text-tertiary text-center mb-4">您可以继续使用应用，部分功能可能受限</p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            重新加载
          </button>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 rounded-lg bg-white/60 text-text-primary text-sm font-medium hover:bg-white/80 transition-colors border border-primary-100"
          >
            继续使用
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
