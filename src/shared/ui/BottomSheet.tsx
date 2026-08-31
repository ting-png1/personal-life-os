/**
 * BottomSheet — 底部弹出面板
 *
 * glass-strong 背景，从底部滑入，带拖拽手柄。
 * 支持 ESC 关闭、backdrop 点击关闭、body 滚动锁定、safe-area 适配。
 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxHeight?: string
  // 向后兼容：旧版 API 使用 height
  height?: string
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = 'max-h-[75vh]',
  height,
}: BottomSheetProps) {
  // 向后兼容：height 映射到 maxHeight
  const resolvedMaxHeight = height || maxHeight
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
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in"
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
        onClick={onClose}
      />

      {/* Sheet */}
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
          transform: 'translateZ(0)',
          willChange: 'transform',
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
        <div className="px-5 py-3 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
