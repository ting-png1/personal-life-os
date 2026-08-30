import React from 'react'
import ReactDOM from 'react-dom/client'

// ============================================================
// 最小 React Mount Test
// 完全绕过所有业务模块，只验证 React 本身能不能挂载
// ============================================================

const BOOT_START = performance.now()

// 在页面上直接显示启动阶段，不依赖控制台
function showStage(stage: string, detail?: string) {
  console.log(`[BOOT] ${stage}`, detail ?? '')
  const el = document.getElementById('boot-stage')
  if (el) {
    el.innerHTML = `
      <div style="text-align:center;margin-top:20px;">
        <p style="font-size:14px;color:#FB6F92;font-weight:600;">${stage}</p>
        ${detail ? `<p style="font-size:12px;color:#999;margin-top:4px;">${detail}</p>` : ''}
      </div>
    `
  }
}

// 最小测试组件 - 完全不依赖任何业务模块
function MinimalTest() {
  React.useEffect(() => {
    showStage('REACT MOUNTED', `耗时 ${Math.round(performance.now() - BOOT_START)}ms`)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFF8FA',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #FFB3C6, #FB6F92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <span style={{ color: 'white', fontSize: '28px' }}>✓</span>
      </div>
      <h1 style={{ fontSize: '20px', color: '#333', margin: '0 0 8px' }}>
        React 挂载成功
      </h1>
      <p style={{ fontSize: '14px', color: '#666', margin: '0 0 16px', textAlign: 'center' }}>
        如果你看到这个页面，说明 React 本身可以正常挂载
      </p>
      <div id="boot-stage"></div>
      <p style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>
        总耗时: {Math.round(performance.now() - BOOT_START)}ms
      </p>
    </div>
  )
}

// 执行挂载
try {
  showStage('BOOT 0', 'main.tsx 开始执行')

  const rootEl = document.getElementById('root')
  if (!rootEl) {
    showStage('ERROR', '找不到 #root 元素')
  } else {
    showStage('BOOT 1', '开始挂载 React')

    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <MinimalTest />
      </React.StrictMode>,
    )

    showStage('BOOT 2', 'React render 已调用')
  }
} catch (err) {
  showStage('FATAL ERROR', err instanceof Error ? err.message : String(err))
  // 显示兜底错误
  const rootEl = document.getElementById('root')
  if (rootEl) {
    rootEl.innerHTML = `
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
