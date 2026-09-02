const LEGACY_HEIGHT_CLASSES: Record<string, string> = {
  auto: 'max-h-[85vh]',
  medium: 'h-[60vh]',
  large: 'h-[85vh]',
}

/** 将旧版语义化 height 值映射为实际 Tailwind 高度类。 */
export function resolveBottomSheetHeight(height: string | undefined, maxHeight: string): string {
  if (!height) return maxHeight
  return LEGACY_HEIGHT_CLASSES[height] ?? height
}
