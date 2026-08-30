// ============================================================
// SyncStatusBadge - 同步状态徽章组件
// 显示当前同步状态（同步中/已同步/离线/错误）
// ============================================================

import { useSyncStore } from '@/features/sync/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { RefreshCw, WifiOff, Cloud, AlertCircle } from 'lucide-react'

interface SyncStatusBadgeProps {
  /** 点击徽章时触发手动同步 */
  onManualSync?: () => void
  /** 是否显示文字标签 */
  showLabel?: boolean
}

export function SyncStatusBadge({ onManualSync, showLabel = true }: SyncStatusBadgeProps) {
  const { isAuthenticated } = useAuth()
  const { isSyncing, isOnline, lastSyncAt, error, syncAll } = useSyncStore()

  // 未登录时不显示
  if (!isAuthenticated) return null

  const handleClick = async () => {
    if (onManualSync) {
      onManualSync()
    } else if (isOnline && !isSyncing) {
      await syncAll()
    }
  }

  // 同步中
  if (isSyncing) {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-medium hover:bg-primary-100 transition-colors"
        title="正在同步..."
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        {showLabel && <span>同步中</span>}
      </button>
    )
  }

  // 离线
  if (!isOnline) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-50 text-warning-600 text-xs font-medium"
        title="离线模式，变更将在联网后自动同步"
      >
        <WifiOff className="w-3.5 h-3.5" />
        {showLabel && <span>离线</span>}
      </div>
    )
  }

  // 同步错误
  if (error) {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-50 text-error-600 text-xs font-medium hover:bg-error-100 transition-colors"
        title={`同步失败：${error}，点击重试`}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        {showLabel && <span>同步失败</span>}
      </button>
    )
  }

  // 已同步
  const syncTime = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-50 text-success-600 text-xs font-medium hover:bg-success-100 transition-colors"
      title={syncTime ? `上次同步：${syncTime}，点击手动同步` : '点击手动同步'}
    >
      <Cloud className="w-3.5 h-3.5" />
      {showLabel && <span>{syncTime ? `已同步 ${syncTime}` : '已同步'}</span>}
    </button>
  )
}
