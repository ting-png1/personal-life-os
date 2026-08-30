import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// ============================================================
// ErrorBoundary - 捕获渲染异常，一次性定位问题
// ============================================================
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到渲染异常:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#FFF8FA',
          padding: '20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          overflow: 'auto',
        }}>
          <div style={{
            maxWidth: '600px',
            margin: '40px auto',
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FFB3C6, #FB6F92)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ color: 'white', fontSize: '24px' }}>⚠️</span>
            </div>
            <h1 style={{ fontSize: '18px', color: '#333', margin: '0 0 12px' }}>
              渲染异常已捕获
            </h1>
            <p style={{ fontSize: '14px', color: '#666', margin: '0 0 16px' }}>
              以下是导致 App 无法启动的具体错误信息：
            </p>
            <div style={{
              background: '#FFF0F3',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ fontSize: '14px', color: '#C2185B', margin: '0 0 8px', fontWeight: '600' }}>
                错误信息:
              </p>
              <p style={{ fontSize: '13px', color: '#880E4F', margin: '0', wordBreak: 'break-all' }}>
                {this.state.error?.message ?? '未知错误'}
              </p>
            </div>
            {this.state.errorInfo && (
              <div style={{
                background: '#F5F5F5',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px', fontWeight: '600' }}>
                  组件栈:
                </p>
                <pre style={{ fontSize: '11px', color: '#333', margin: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            <div style={{
              background: '#E8F5E9',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ fontSize: '12px', color: '#2E7D32', margin: '0' }}>
                💡 请把这个截图发给开发者，这会直接定位问题所在的组件和文件。
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: '#FB6F92',
                color: 'white',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// 启动诊断
// ============================================================
const BOOT_START = performance.now()
console.log('[BOOT] 0. main.tsx 开始执行')

try {
  console.log('[BOOT] 1. 开始挂载 React (带 ErrorBoundary)')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
  console.log('[BOOT] 2. React render 已调用', { elapsed: performance.now() - BOOT_START })
} catch (err) {
  console.error('[BOOT] React 挂载失败:', err)
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;background:#FFF8FA;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;font-family:-apple-system,sans-serif;">
        <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#FFB3C6,#FB6F92);display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
          <span style="color:white;font-size:28px;">⚠️</span>
        </div>
        <p style="font-size:18px;font-weight:600;color:#333;margin:0 0 8px;">React 挂载失败</p>
        <p style="font-size:14px;color:#666;margin:0 0 16px;">${err instanceof Error ? err.message : String(err)}</p>
        <button onclick="window.location.reload()" style="padding:10px 20px;border-radius:8px;background:#FB6F92;color:white;border:none;font-size:14px;cursor:pointer;">重新加载</button>
      </div>
    `
  }
}

// 后注册 Service Worker（动态 import，不阻塞）
try {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() { console.log('[PWA] 发现新版本') },
      onOfflineReady() { console.log('[PWA] 离线缓存就绪') },
      onRegisterError(error) { console.warn('[PWA] SW 注册失败:', error) },
    })
  }).catch((err) => {
    console.warn('[BOOT] virtual:pwa-register 加载失败:', err)
  })
} catch (err) {
  console.warn('[BOOT] SW 注册异常:', err)
}
