// ============================================================
// ID Utilities
// ============================================================

/**
 * 生成 UUID v4
 *
 * 跨环境可靠实现：
 * - 优先使用 crypto.getRandomValues()（广泛支持，包括 Safari）
 * - 后备使用 Math.random()（极端环境兜底）
 *
 * 不使用 crypto.randomUUID()，因为：
 * - Safari 15.3 以下不支持
 * - 非安全上下文（http://）中可能不可用
 * - 部分 WebView / PWA standalone 环境中可能缺失
 */
export function generateId(): string {
  // 优先使用 crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    // 设置版本号 (4) 和变体位 (10xx)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    // 格式化为 UUID 字符串
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  }

  // 后备：Math.random()（极端环境兜底，不保证唯一性但足够实用）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
