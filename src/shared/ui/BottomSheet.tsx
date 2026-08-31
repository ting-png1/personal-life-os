/**
 * BottomSheet — 底部弹出面板
 *
 * glass-strong 背景，从底部滑入，带拖拽手柄。
 * 支持 ESC 关闭、backdrop 点击关闭、body 滚动锁定、safe-area 适配。
 *
 * iOS Safari 渲染兼容性（技术边界）：
 * sheet 层使用 glass-strong（backdrop-filter: blur(28px) + 伪元素高光/反射 + 多层阴影）。
 * 在 iOS Safari 中，当 date/time 原生选择器（UIDatePicker）出现/消失时，
 * backdrop-filter 的 GPU 合成层需要重新采样背景，可能出现临时渲染 artifact
 * （屏幕中央竖线/晕影，持续数秒后自行消失）。
 *
 * 这是 iOS Safari 的系统级合成层切换问题，不是 Web 代码可以完全解决的。
 * 已尝试的方案及结论：
 * 1. 聚焦时关闭 backdrop-filter → 不可接受，普通输入也失去 glass 效果（v7.5.3/v7.5.4 回归）
 * 2. transform: translateZ(0) + will-change: transform → 用户真机确认无效
 * 3. 当前方案：will-change: backdrop-filter 保持合成层稳定，减少切换 artifact
 *
 * 如果 will-change 方案在真机上仍不能完全消除竖线/晕影，则接受为 iOS 技术边界，
 * 不再做任何视觉降级。普通输入场景必须保持完整 Layer 1 glass 视觉。
 *
 * 注意：backdrop 层的 Tailwind backdrop-blur-sm 因 CSS 变量未完整定义
 * 本身就是无效的（computed style 为 none），实际为纯半透明 bg-black/20。
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
      {/* Backdrop — Tailwind backdrop-blur-sm 本身无效（CSS 变量未完整定义），
          实际为纯半透明 bg-black/20，不参与渲染冲突 */}
      <div
        className="bottomsheet-backdrop absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — glass-strong。will-change: backdrop-filter 提示浏览器保持合成层稳定，
          减少 iOS 原生选择器出现/消失时的合成层切换 artifact。
          不做任何聚焦时的视觉降级，保持完整 Layer 1 glass 视觉。 */}
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
          willChange: 'backdrop-filter',
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
