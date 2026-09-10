/**
 * BottomSheet — 底部弹出面板
 *
 * Glass A glass-strong 背景，从底部滑入，带拖拽手柄。
 * 支持 ESC 关闭、backdrop 点击关闭、body 滚动锁定、safe-area 适配。
 *
 * iOS Safari 渲染兼容性：
 * 真机确认键盘/viewport 变化会使 fixed sheet 的实时 backdrop sampling
 * 出现底页穿透。共享 CSS 因此在 iOS 上自动使用静态 Pink Mist Glass；
 * 非 iOS 仍使用完整 Glass A backdrop-filter。组件本身不做环境或时序判断。
 */

import { useEffect, useLayoutEffect, useRef } from 'react'
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
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="bottomsheet-container fixed inset-0 z-[100] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
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
          relative w-full
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
