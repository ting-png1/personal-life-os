import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, Trash2, Database, Eye, EyeOff, KeyRound, Cloud, CloudOff, LogOut, LogIn, RefreshCw, Bell, BellOff } from 'lucide-react'
import { GlassCard } from '@/shared/ui/GlassCard'
import { GlassButton } from '@/shared/ui/GlassButton'
import { Modal } from '@/shared/ui/Modal'
import { useState } from 'react'
import { db } from '@/data/database'
import { useAI } from '@/features/ai/hooks/useAI'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSyncStore } from '@/features/sync/store'
import { useNotification } from '@/features/notification/hooks/useNotification'
import { todayStr } from '@/shared/lib/date'

export function SettingsPage() {
  const navigate = useNavigate()
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [exportMessage, setExportMessage] = useState('')

  // Auth 云同步
  const { user, isAuthenticated, logout } = useAuth()
  const { isSyncing, lastSyncAt, syncAll, isOnline } = useSyncStore()
  const [syncMessage, setSyncMessage] = useState('')

  // 通知设置
  const { settings: notificationSettings, updateSettings: updateNotificationSettings, requestPermission, hasPermission, permissionDenied } = useNotification()
  const [notificationMessage, setNotificationMessage] = useState('')

  const handleRequestNotificationPermission = async () => {
    const permission = await requestPermission()
    if (permission === 'granted') {
      setNotificationMessage('通知权限已开启')
    } else if (permission === 'denied') {
      setNotificationMessage('通知权限被拒绝，请在浏览器设置中开启')
    }
    setTimeout(() => setNotificationMessage(''), 3000)
  }

  // AI 设置
  const { settings, updateSettings, clearAPIKey, dailyUsage } = useAI()
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey)
  const [dailyLimitInput, setDailyLimitInput] = useState(String(settings.dailyLimit))
  const [showAPIKey, setShowAPIKey] = useState(false)
  const [aiMessage, setAiMessage] = useState('')

  const handleSaveAISettings = () => {
    const limit = parseInt(dailyLimitInput, 10)
    const validLimit = isNaN(limit) || limit < 1 ? 1 : Math.min(limit, 20)
    updateSettings({
      apiKey: apiKeyInput.trim(),
      dailyLimit: validLimit,
      enabled: apiKeyInput.trim() !== '',
    })
    setDailyLimitInput(String(validLimit))
    setAiMessage('AI 设置已保存')
    setTimeout(() => setAiMessage(''), 3000)
  }

  const handleClearAPIKey = () => {
    clearAPIKey()
    setApiKeyInput('')
    setAiMessage('API Key 已清除')
    setTimeout(() => setAiMessage(''), 3000)
  }

  const handleManualSync = async () => {
    if (!isOnline) {
      setSyncMessage('当前离线，请联网后重试')
      setTimeout(() => setSyncMessage(''), 3000)
      return
    }
    setSyncMessage('正在同步...')
    const { pull, push } = await syncAll()
    if (pull.success && push.success) {
      setSyncMessage(`同步完成，推送 ${push.pushed ?? 0} 条，拉取 ${pull.pulled ?? 0} 条`)
    } else {
      const errors = [...(push.errors || []), ...(pull.errors || [])]
      setSyncMessage('同步失败：' + (errors.join('; ') || '未知错误'))
    }
    setTimeout(() => setSyncMessage(''), 5000)
  }

  const handleExport = async () => {
    try {
      const [
        todos,
        scheduleEvents,
        moodRecords,
        periodRecords,
        dailyHealthSummaries,
        continuityItems,
        actionAuditRecords,
      ] = await Promise.all([
        db.todos.toArray(),
        db.scheduleEvents.toArray(),
        db.moodRecords.toArray(),
        db.periodRecords.toArray(),
        db.dailyHealthSummaries.toArray(),
        db.continuityItems.toArray(),
        db.actionAuditRecords.toArray(),
      ])

      const data = {
        exportedAt: new Date().toISOString(),
        version: '3.0.0',
        data: {
          todos,
          scheduleEvents,
          moodRecords,
          periodRecords,
          dailyHealthSummaries,
          continuityItems,
          actionAuditRecords,
        },
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-backup-${todayStr()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportMessage('数据已导出')
      setTimeout(() => setExportMessage(''), 3000)
    } catch {
      setExportMessage('导出失败，请重试')
      setTimeout(() => setExportMessage(''), 3000)
    }
  }

  const handleClearAll = async () => {
    await Promise.all([
      db.todos.clear(),
      db.scheduleEvents.clear(),
      db.moodRecords.clear(),
      db.periodRecords.clear(),
      db.dailyHealthSummaries.clear(),
      db.continuityItems.clear(),
      db.actionAuditRecords.clear(),
    ])
    setClearConfirmOpen(false)
    // 刷新页面以重置 store
    window.location.reload()
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 顶部导航 */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/more')}
          className="p-1.5 rounded-full text-text-secondary hover:bg-primary-50 transition-colors"
          aria-label="返回"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-text-primary">设置</h1>
      </div>

      <div className="px-5 space-y-4">
        {/* AI 智能建议 */}
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">AI 智能建议</p>
          <GlassCard>
            <div className="space-y-4">
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  DeepSeek API Key
                </label>
                <div className="relative">
                  <input
                    type={showAPIKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="请输入 API Key"
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAPIKey(!showAPIKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-secondary"
                    aria-label={showAPIKey ? '隐藏' : '显示'}
                  >
                    {showAPIKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-text-tertiary mt-1.5">
                  API Key 仅保存在本地浏览器，不会上传到任何服务器
                </p>
              </div>

              {/* 每日调用上限 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  每日调用上限
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={dailyLimitInput}
                    onChange={(e) => setDailyLimitInput(e.target.value)}
                    className="w-20 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 transition-colors"
                  />
                  <span className="text-sm text-text-tertiary">次/天</span>
                  <div className="flex gap-1.5 ml-auto">
                    {[3, 5, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setDailyLimitInput(String(n))}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          dailyLimitInput === String(n)
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface text-text-secondary border border-border hover:border-primary-300'
                        }`}
                      >
                        {n}次
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 使用情况 */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary-50/50">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-text-secondary">今日已使用</span>
                </div>
                <span className="text-sm font-semibold text-primary-500">
                  {dailyUsage.count} / {settings.dailyLimit} 次
                </span>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                <GlassButton size="sm" onClick={handleSaveAISettings}>
                  保存设置
                </GlassButton>
                {settings.apiKey && (
                  <GlassButton size="sm" variant="ghost" onClick={handleClearAPIKey}>
                    清除 API Key
                  </GlassButton>
                )}
              </div>

              {aiMessage && (
                <p className="text-sm text-primary-500">{aiMessage}</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* 云同步 */}
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">云同步</p>
          <GlassCard>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isAuthenticated ? 'bg-primary-50' : 'bg-surface'
                  }`}>
                    {isAuthenticated ? (
                      <Cloud className="w-4.5 h-4.5 text-primary-500" />
                    ) : (
                      <CloudOff className="w-4.5 h-4.5 text-text-tertiary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {isAuthenticated ? '已开启云同步' : '未开启云同步'}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {isAuthenticated ? user?.email : '登录后可在多设备间同步数据'}
                    </p>
                  </div>
                </div>
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={handleManualSync}
                      loading={isSyncing}
                      disabled={!isOnline}
                      leftIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />}
                    >
                      同步
                    </GlassButton>
                    <GlassButton size="sm" variant="ghost" onClick={logout} leftIcon={<LogOut className="w-4 h-4" />}>
                      退出
                    </GlassButton>
                  </div>
                ) : (
                  <GlassButton size="sm" onClick={() => navigate('/login')} leftIcon={<LogIn className="w-4 h-4" />}>
                    登录
                  </GlassButton>
                )}
              </div>
              {isAuthenticated && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-tertiary">
                      {isOnline ? (
                        lastSyncAt
                          ? `上次同步：${new Date(lastSyncAt).toLocaleString('zh-CN')}`
                          : '尚未同步'
                      ) : (
                        <span className="text-warning">离线模式，变更将在联网后自动同步</span>
                      )}
                    </span>
                    {syncMessage && (
                      <span className={syncMessage.includes('失败') || syncMessage.includes('离线') ? 'text-error' : 'text-primary-500'}>
                        {syncMessage}
                      </span>
                    )}
                  </div>
                </>
              )}
              {!isAuthenticated && (
                <>
                  <div className="h-px bg-border" />
                  <p className="text-xs text-text-tertiary">
                    云同步功能将你的待办、日程、情绪等数据安全存储在云端，支持多设备访问。未登录时所有数据仅保存在本地。
                  </p>
                </>
              )}
            </div>
          </GlassCard>
        </div>

        {/* 通知提醒 */}
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">通知提醒</p>
          <GlassCard>
            <div className="space-y-4">
              {/* 全局开关 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    notificationSettings.enabled ? 'bg-primary-50' : 'bg-surface'
                  }`}>
                    {notificationSettings.enabled ? (
                      <Bell className="w-4.5 h-4.5 text-primary-500" />
                    ) : (
                      <BellOff className="w-4.5 h-4.5 text-text-tertiary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">通知提醒</p>
                    <p className="text-xs text-text-tertiary">待办到期、课程开始时提醒</p>
                  </div>
                </div>
                <button
                  onClick={() => updateNotificationSettings({ enabled: !notificationSettings.enabled })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    notificationSettings.enabled ? 'bg-primary-500' : 'bg-border'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    notificationSettings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* 浏览器通知权限 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">浏览器通知</p>
                  <p className="text-xs text-text-tertiary">
                    {hasPermission ? '已开启' : permissionDenied ? '已被拒绝，请在浏览器设置中开启' : '未开启'}
                  </p>
                </div>
                {!hasPermission && !permissionDenied && (
                  <GlassButton size="sm" onClick={handleRequestNotificationPermission}>
                    开启
                  </GlassButton>
                )}
              </div>

              {notificationSettings.enabled && (
                <>
                  <div className="h-px bg-border" />

                  {/* Todo 截止提醒 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-primary">待办到期提醒</p>
                      <button
                        onClick={() => updateNotificationSettings({
                          todoReminders: { ...notificationSettings.todoReminders, enabled: !notificationSettings.todoReminders.enabled }
                        })}
                        className={`w-10 h-5.5 rounded-full transition-colors relative ${
                          notificationSettings.todoReminders.enabled ? 'bg-primary-500' : 'bg-border'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                          notificationSettings.todoReminders.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    {notificationSettings.todoReminders.enabled && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-tertiary">提前</span>
                        <select
                          value={notificationSettings.todoReminders.remindBefore}
                          onChange={(e) => updateNotificationSettings({
                            todoReminders: { ...notificationSettings.todoReminders, remindBefore: parseInt(e.target.value, 10) }
                          })}
                          className="px-2 py-1 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary-400"
                        >
                          <option value={5}>5 分钟</option>
                          <option value={10}>10 分钟</option>
                          <option value={15}>15 分钟</option>
                          <option value={30}>30 分钟</option>
                          <option value={60}>1 小时</option>
                        </select>
                        <span className="text-xs text-text-tertiary">提醒</span>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  {/* 课程开始提醒 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-primary">课程/日程提醒</p>
                      <button
                        onClick={() => updateNotificationSettings({
                          scheduleReminders: { ...notificationSettings.scheduleReminders, enabled: !notificationSettings.scheduleReminders.enabled }
                        })}
                        className={`w-10 h-5.5 rounded-full transition-colors relative ${
                          notificationSettings.scheduleReminders.enabled ? 'bg-primary-500' : 'bg-border'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                          notificationSettings.scheduleReminders.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                    {notificationSettings.scheduleReminders.enabled && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-tertiary">提前</span>
                        <select
                          value={notificationSettings.scheduleReminders.remindBefore}
                          onChange={(e) => updateNotificationSettings({
                            scheduleReminders: { ...notificationSettings.scheduleReminders, remindBefore: parseInt(e.target.value, 10) }
                          })}
                          className="px-2 py-1 rounded-lg bg-surface border border-border text-xs text-text-primary focus:outline-none focus:border-primary-400"
                        >
                          <option value={5}>5 分钟</option>
                          <option value={10}>10 分钟</option>
                          <option value={15}>15 分钟</option>
                          <option value={30}>30 分钟</option>
                        </select>
                        <span className="text-xs text-text-tertiary">提醒</span>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  {/* 声音和振动 */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">声音提醒</p>
                    <button
                      onClick={() => updateNotificationSettings({ soundEnabled: !notificationSettings.soundEnabled })}
                      className={`w-10 h-5.5 rounded-full transition-colors relative ${
                        notificationSettings.soundEnabled ? 'bg-primary-500' : 'bg-border'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                        notificationSettings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">振动提醒（移动端）</p>
                    <button
                      onClick={() => updateNotificationSettings({ vibrateEnabled: !notificationSettings.vibrateEnabled })}
                      className={`w-10 h-5.5 rounded-full transition-colors relative ${
                        notificationSettings.vibrateEnabled ? 'bg-primary-500' : 'bg-border'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
                        notificationSettings.vibrateEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </>
              )}

              {notificationMessage && (
                <p className={`text-xs text-center ${
                  notificationMessage.includes('拒绝') ? 'text-error' : 'text-primary-500'
                }`}>
                  {notificationMessage}
                </p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* 数据管理 */}
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">数据管理</p>
          <GlassCard>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center">
                    <Download className="w-4.5 h-4.5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">导出数据</p>
                    <p className="text-xs text-text-tertiary">备份所有本地数据为 JSON</p>
                  </div>
                </div>
                <GlassButton size="sm" onClick={handleExport}>
                  导出
                </GlassButton>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center">
                    <Trash2 className="w-4.5 h-4.5 text-error" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">清空所有数据</p>
                    <p className="text-xs text-text-tertiary">删除待办、日程、情绪和周期记录</p>
                  </div>
                </div>
                <GlassButton size="sm" variant="danger" onClick={() => setClearConfirmOpen(true)}>
                  清空
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* 存储信息 */}
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2 px-1">存储</p>
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center">
                <Database className="w-4.5 h-4.5 text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">本地存储</p>
                <p className="text-xs text-text-tertiary">所有数据保存在浏览器 IndexedDB 中</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {exportMessage && (
          <p className="text-sm text-center text-primary-500">{exportMessage}</p>
        )}
      </div>

      {/* 清空确认弹窗 */}
      <Modal
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="确认清空所有数据"
        footer={
          <>
            <GlassButton variant="ghost" onClick={() => setClearConfirmOpen(false)}>
              取消
            </GlassButton>
            <GlassButton variant="danger" onClick={handleClearAll}>
              确认清空
            </GlassButton>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          此操作将删除所有待办、日程、情绪和周期记录，且无法恢复。建议先导出数据备份。
        </p>
      </Modal>
    </div>
  )
}
