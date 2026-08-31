/**
 * BottomSheet — 底部弹出面板
 *
 * glass-strong 背景，从底部滑入，带拖拽手柄。
 * 支持 ESC 关闭、backdrop 点击关闭、body 滚动锁定、safe-area 适配。
 *
 * iOS Safari 渲染兼容性：
 * 当日期/时间输入（datetime-local/date/time）聚焦时，iOS 原生选择器
 * 与全屏 backdrop-filter 层会产生合成层渲染冲突（屏幕中央出现竖线/晕影）。
 * 通过 CSS :has() 选择器，当容器内有日期/时间输入聚焦时，
 * 自动禁用 backdrop 层的 backdrop-filter，改用纯半透明背景。
 * sheet 层的 glass-strong 保持不变（只在底部，不影响屏幕中央）。
 * :has() 在 iOS Safari 15.4+ 支持。
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
      className="bottomsheet-container fixed inset-0 z-[100] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — 日期/时间输入聚焦时通过 CSS :has() 自动降级为纯半透明背景 */}
      <div
        className="bottomsheet-backdrop absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — glass-strong 保持不变，只在底部不影响屏幕中央 */}
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
