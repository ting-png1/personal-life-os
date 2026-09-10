/**
 * BottomSheet — 底部弹出面板
 *
 * Glass A glass-strong 背景，从底部滑入，带拖拽手柄。
 * 支持 ESC 关闭、backdrop 点击关闭、body 滚动锁定、safe-area 适配。
 *
 * iOS Safari 渲染兼容性：
 * sheet 层使用 Glass A（12px blur + 克制高光 + 清晰边缘），overlay backdrop
 * 只使用暗色 tint。WebKit 在 fixed portal 首次挂载时若同时执行 transform/fade
 * 动画、创建 backdrop-filter 合成层并重排 visual viewport，可能留下中央 tile
 * seam、残帧或底页穿透。
 *
 * 这是 iOS Safari 的系统级合成层切换问题，不是 Web 代码可以完全解决的。
 * 已尝试的方案及结论：
 * 1. 聚焦时关闭 backdrop-filter → 不可接受，普通输入也失去 glass 效果（v7.5.3/v7.5.4 回归）
 * 2. transform: translateZ(0) + will-change: transform → 用户真机确认无效
 * 3. will-change: backdrop-filter → 创建不必要的合成层（v7.5.5，已移除）
 * 4. 当前方案：仅 sheet 使用一个真实 blur，并用 isolation 隔离合成上下文
 *
 * 因此 iOS WebKit 使用分阶段路径：动画阶段暂不采样 backdrop，进入稳定态后
 * 恢复完整 Glass A；关闭时先停止采样，再执行退出动画并延迟卸载。键盘或原生
 * picker 改变 visual viewport 时也只短暂暂停采样。非 iOS 行为保持不变。
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveBottomSheetHeight } from './bottomSheetSizing'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxHeight?: string
  // 向后兼容：旧版 API 使用 height
  height?: string
  /** 打开时将内容滚动容器复位到顶部；默认关闭，由需要的表单显式启用。 */
  resetScrollOnOpen?: boolean
}

type BottomSheetRenderPhase =
  | 'closed'
  | 'preparing'
  | 'entering'
  | 'open'
  | 'exit-preparing'
  | 'exiting'

const ENTER_DURATION_MS = 360
const EXIT_DURATION_MS = 220
const VIEWPORT_SETTLE_MS = 180

function isIOSWebKitEnvironment(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    CSS.supports('-webkit-touch-callout', 'none')
  )
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = 'max-h-[75vh]',
  height,
  resetScrollOnOpen = false,
}: BottomSheetProps) {
  // 向后兼容：旧版 auto/medium/large 映射为真实高度类
  const resolvedMaxHeight = resolveBottomSheetHeight(height, maxHeight)
  const contentRef = useRef<HTMLDivElement>(null)
  const [useStableIOSPath] = useState(isIOSWebKitEnvironment)
  const [rendered, setRendered] = useState(open)
  const [renderPhase, setRenderPhase] = useState<BottomSheetRenderPhase>(
    open ? 'preparing' : 'closed',
  )
  const [viewportSettling, setViewportSettling] = useState(false)
  const viewportSettleTimerRef = useRef<number | null>(null)

  const markViewportSettling = useCallback(
    (duration = VIEWPORT_SETTLE_MS) => {
      if (!useStableIOSPath) return
      setViewportSettling(true)
      if (viewportSettleTimerRef.current !== null) {
        window.clearTimeout(viewportSettleTimerRef.current)
      }
      viewportSettleTimerRef.current = window.setTimeout(() => {
        setViewportSettling(false)
        viewportSettleTimerRef.current = null
      }, duration)
    },
    [useStableIOSPath],
  )

  useLayoutEffect(() => {
    if (!useStableIOSPath) return

    let firstFrame = 0
    let secondFrame = 0
    let phaseTimer = 0

    if (open) {
      setRendered(true)
      setRenderPhase('preparing')
      setViewportSettling(true)
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          setRenderPhase('entering')
          phaseTimer = window.setTimeout(() => {
            setRenderPhase('open')
            markViewportSettling()
          }, ENTER_DURATION_MS)
        })
      })
    } else if (rendered) {
      setRenderPhase('exit-preparing')
      setViewportSettling(true)
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          setRenderPhase('exiting')
          phaseTimer = window.setTimeout(() => {
            setRendered(false)
            setRenderPhase('closed')
            setViewportSettling(false)
          }, EXIT_DURATION_MS)
        })
      })
    }

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      window.clearTimeout(phaseTimer)
    }
  }, [markViewportSettling, open, rendered, useStableIOSPath])

  useEffect(() => {
    if (!useStableIOSPath || !rendered) return
    const viewport = window.visualViewport
    if (!viewport) return

    const handleViewportChange = () => markViewportSettling()
    viewport.addEventListener('resize', handleViewportChange)
    viewport.addEventListener('scroll', handleViewportChange)
    return () => {
      viewport.removeEventListener('resize', handleViewportChange)
      viewport.removeEventListener('scroll', handleViewportChange)
    }
  }, [markViewportSettling, rendered, useStableIOSPath])

  useEffect(
    () => () => {
      if (viewportSettleTimerRef.current !== null) {
        window.clearTimeout(viewportSettleTimerRef.current)
      }
    },
    [],
  )

  useLayoutEffect(() => {
    if (!open || !resetScrollOnOpen) return
    contentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [open, resetScrollOnOpen])

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // body 滚动锁定
  const shouldRender = useStableIOSPath ? rendered : open

  useLayoutEffect(() => {
    if (!shouldRender) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [shouldRender])

  if (!shouldRender) return null

  return createPortal(
    <div
      className={`bottomsheet-container fixed inset-0 z-[100] flex flex-col justify-end ${!open ? 'pointer-events-none' : ''}`}
      data-render-phase={useStableIOSPath ? renderPhase : undefined}
      data-viewport-settling={
        useStableIOSPath && viewportSettling ? 'true' : undefined
      }
      onFocusCapture={(event) => {
        if ((event.target as HTMLElement).matches('input, textarea, select')) {
          markViewportSettling(ENTER_DURATION_MS)
        }
      }}
      onBlurCapture={() => markViewportSettling()}
      role="dialog"
      aria-modal={open || undefined}
      aria-label={title}
      aria-hidden={!open || undefined}
    >
      {/* Backdrop 只保留暗色 tint；真实 blur 由 sheet 的 Glass A 单层承担。 */}
      <div
        className="bottomsheet-backdrop absolute inset-0 bg-black/20 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — Glass A glass-strong。
          不使用 will-change: backdrop-filter（会创建不必要的合成层，
          在 iOS 原生选择器出现时反而可能加剧渲染 artifact）。
          使用 isolation: isolate 创建独立合成上下文，确保 sheet 层内的
          半透明元素在独立上下文中合成，减少对页面其他部分的影响。
          不做任何聚焦时的视觉降级，保持完整 Glass A 视觉。 */}
      <div
        className={`
          bottomsheet-surface relative w-full
          glass-strong rounded-t-3xl overflow-hidden
          flex flex-col
          ${resolvedMaxHeight}
          animate-slide-up
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'slide-up 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
          isolation: 'isolate',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-text-tertiary/30" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-5 py-2 text-center shrink-0">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          </div>
        )}

        {/* Content — flex-1 min-h-0 确保 Safari 中正确收缩并滚动 */}
        <div
          ref={contentRef}
          data-bottomsheet-scroll
          className="px-5 py-3 overflow-y-auto flex-1 min-h-0"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
