import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { registerSW } from 'virtual:pwa-register'

// 手动注册 Service Worker，确保更新机制可控
registerSW({
  onNeedRefresh() {
    // 发现新版本，下次启动时自动更新
    console.log('[PWA] 发现新版本，下次启动将自动更新')
  },
  onOfflineReady() {
    // 离线缓存就绪
    console.log('[PWA] 离线缓存就绪')
  },
  onRegisterError(error) {
    // 注册失败，不影响 App 正常使用
    console.error('[PWA] Service Worker 注册失败:', error)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
