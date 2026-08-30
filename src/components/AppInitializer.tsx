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
  const pullAll = useSyncStore((s) => s.pullAll)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        // 1. 先加载本地数据
        await Promise.all([loadTodos(), loadSchedule(), loadMood(), loadCycle()])
        if (!cancelled) {
          setLoading(false)
        }

        // 2. 如果已登录，后台异步拉取云端数据（不阻塞 UI）
        if (isAuthenticated && !cancelled) {
          try {
            const result = await pullAll()
            if (result.success && (result.pulled ?? 0) > 0) {
              // 云端有更新，重新加载本地数据到 store
              await Promise.all([loadTodos(), loadSchedule(), loadMood(), loadCycle()])
            }
          } catch (syncErr) {
            console.error('云同步拉取失败:', syncErr)
            // 同步失败不影响本地使用
          }
        }
      } catch (err) {
        if (!cancelled) {
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
