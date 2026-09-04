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
  const { isAuthenticated } = useAuth()
  const { pullAll, initNetworkListener, isOnline } = useSyncStore()

  // 定时自动拉取：每 5 分钟自动同步一次云端数据
  useEffect(() => {
    if (!isAuthenticated) return

    const AUTO_SYNC_INTERVAL = 5 * 60 * 1000 // 5 分钟

    const timer = setInterval(async () => {
      if (!isOnline) return
      try {
        bootLog('AutoSync 定时同步开始')
        const result = await pullAll()
        if (result.success && (result.pulled ?? 0) > 0) {
          await Promise.all([loadTodos(), loadSchedule(), loadMood(), loadCycle()])
          bootLog('AutoSync 定时同步完成', { pulled: result.pulled })
        }
      } catch (error) {
        console.error('[AutoSync] 自动同步失败:', error)
      }
    }, AUTO_SYNC_INTERVAL)

    return () => clearInterval(timer)
  }, [isAuthenticated, isOnline, pullAll, loadTodos, loadSchedule, loadMood, loadCycle])

  // 页面重新获得焦点时自动同步一次
  useEffect(() => {
    if (!isAuthenticated) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isOnline) {
        try {
          bootLog('AutoSync 焦点同步开始')
          const result = await pullAll()
          if (result.success && (result.pulled ?? 0) > 0) {
            await Promise.all([loadTodos(), loadSchedule(), loadMood(), loadCycle()])
          }
        } catch (error) {
          console.error('[AutoSync] 焦点同步失败:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isAuthenticated, isOnline, pullAll, loadTodos, loadSchedule, loadMood, loadCycle])

  // 主初始化流程
  useEffect(() => {
    const BOOT_START = performance.now()
    bootLog('AppInitializer 挂载', { isAuthenticated })

    initNetworkListener()

    let cancelled = false
    // 最大初始化时间：6秒后强制进入 App，避免永久 loading/白屏
    const INIT_TIMEOUT = 6000
    // 云端同步超时：8秒后放弃，不影响本地使用
    const SYNC_TIMEOUT = 8000

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

        // 2. 如果已登录，后台异步拉取云端数据（绝对不阻塞 UI，带超时）
        if (isAuthenticated) {
          setBootStage('后台同步中...')
          bootLog('开始后台云端同步', { elapsed: performance.now() - BOOT_START })
          try {
            const result = await withTimeout(
              pullAll(),
              SYNC_TIMEOUT,
              { success: false, errors: ['同步超时'], pulled: 0 },
              '云端同步'
            )
            if (!cancelled && result.success && (result.pulled ?? 0) > 0) {
              // 云端有更新，重新加载本地数据到 store
              await Promise.all([loadTodos(), loadSchedule(), loadMood(), loadCycle()])
              bootLog('云端同步完成，已更新本地数据', { pulled: result.pulled })
            }
          } catch (syncErr) {
            console.error('[BOOT] 云同步拉取失败:', syncErr)
            // 同步失败不影响本地使用，静默降级
          }
        }
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
  }, [loadTodos, loadSchedule, loadMood, loadCycle, isAuthenticated, pullAll, initNetworkListener])

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
