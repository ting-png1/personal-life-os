import { useEffect, useState } from 'react'
import { useTodoStore } from '@/features/todo/store'
import { useScheduleStore } from '@/features/schedule/store'
import { useMoodStore } from '@/features/mood/store'
import { useCycleStore } from '@/features/cycle/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSyncStore } from '@/features/sync/store'
import { Heart } from 'lucide-react'
interface AppInitializerProps {
  children: React.ReactNode
}

export function AppInitializer({ children }: AppInitializerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        console.log('[AutoSync] 开始自动同步...')
        const result = await pullAll()
        if (result.success && (result.pulled ?? 0) > 0) {
          // 云端有更新，重新加载本地数据到 store
          await Promise.all([loadTodos(), loadSchedule(), loadMood(), loadCycle()])
          console.log(`[AutoSync] 同步完成，拉取 ${result.pulled} 条更新`)
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
          console.log('[AutoSync] 页面重新可见，触发同步...')
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

  useEffect(() => {
    // 初始化网络状态监听
    initNetworkListener()

    let cancelled = false
    // 最大初始化时间：8秒后强制进入 App，避免永久 loading/白屏
    const INIT_TIMEOUT = 8000
    // 云端同步超时：10秒后放弃，不影响本地使用
    const SYNC_TIMEOUT = 10000

    // 带超时的 Promise
    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ])

    async function init() {
      try {
        // 1. 加载本地数据（带超时，超时后使用空数据进入 App）
        const loadResult = await withTimeout(
          Promise.all([loadTodos(), loadSchedule(), loadMood(), loadCycle()]).then(() => true),
          INIT_TIMEOUT,
          false // 超时标记
        )

        if (!cancelled) {
          if (!loadResult) {
            console.warn('[AppInitializer] 本地数据加载超时，使用空数据进入 App')
          }
          setLoading(false)
        }

        // 2. 如果已登录，后台异步拉取云端数据（绝对不阻塞 UI，带超时）
        if (isAuthenticated && !cancelled) {
          try {
            const result = await withTimeout(
              pullAll(),
              SYNC_TIMEOUT,
              { success: false, errors: ['同步超时'], pulled: 0 }
            )
            if (!cancelled && result.success && (result.pulled ?? 0) > 0) {
              // 云端有更新，重新加载本地数据到 store
              await Promise.all([loadTodos(), loadSchedule(), loadMood(), loadCycle()])
              console.log(`[AppInitializer] 云端同步完成，拉取 ${result.pulled} 条更新`)
            }
          } catch (syncErr) {
            console.error('[AppInitializer] 云同步拉取失败:', syncErr)
            // 同步失败不影响本地使用，静默降级
          }
        }
      } catch (err) {
        console.error('[AppInitializer] 初始化失败:', err)
        if (!cancelled) {
          // 致命错误：显示错误页面，但提供重试按钮
          setError(err instanceof Error ? err.message : '数据加载失败')
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [loadTodos, loadSchedule, loadMood, loadCycle, isAuthenticated, pullAll])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-500 flex items-center justify-center shadow-glow animate-pulse">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm text-text-secondary mt-4">正在加载...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-8">
        <p className="text-base font-medium text-text-primary mb-2">数据加载失败</p>
        <p className="text-sm text-text-secondary text-center mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          重新加载
        </button>
      </div>
    )
  }

  return <>{children}</>
}
