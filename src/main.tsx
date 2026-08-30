import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// ============================================================
// 启动诊断日志
// 用于追踪 PWA 启动链路，定位白屏/卡住问题
// ============================================================
const BOOT_START = performance.now()
console.log('[BOOT] 0. main.tsx 开始执行', { time: BOOT_START })

// 先挂载 React，确保 UI 优先渲染
try {
  console.log('[BOOT] 1. 开始挂载 React')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  console.log('[BOOT] 2. React 挂载完成（render 已调用）', {
    elapsed: performance.now() - BOOT_START,
  })
} catch (err) {
  // React 挂载失败，显示兜底错误页面
  console.error('[BOOT] React 挂载失败:', err)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;background:#FFF8FA;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;padding:20px;text-align:center;">
        <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#FFB3C6,#FB6F92);display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <span style="color:white;font-size:28px;">⚠️</span>
        </div>
        <p style="font-size:16px;font-weight:600;color:#333;margin:0 0 8px;">应用启动失败</p>
        <p style="font-size:14px;color:#666;margin:0 0 16px;">${err instanceof Error ? err.message : '未知错误'}</p>
        <button onclick="window.location.reload()" style="padding:10px 20px;border-radius:8px;background:#FB6F92;color:white;border:none;font-size:14px;cursor:pointer;">重新加载</button>
      </div>
    `
  }
}

// 后注册 Service Worker，绝对不阻塞 React 挂载
// 放在 try-catch 中，即使注册失败也不影响 App 使用
try {
  console.log('[BOOT] 3. 开始注册 Service Worker')
  // 动态导入，避免模块加载失败阻塞主线程
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        console.log('[PWA] 发现新版本，下次启动将自动更新')
      },
      onOfflineReady() {
        console.log('[PWA] 离线缓存就绪')
      },
      onRegisterError(error) {
        console.warn('[PWA] Service Worker 注册失败（不影响使用）:', error)
      },
    })
    console.log('[BOOT] 4. Service Worker 注册调用完成', {
      elapsed: performance.now() - BOOT_START,
    })
  }).catch((err) => {
    console.warn('[BOOT] virtual:pwa-register 模块加载失败（不影响使用）:', err)
  })
} catch (err) {
  console.warn('[BOOT] Service Worker 注册异常（不影响使用）:', err)
}
