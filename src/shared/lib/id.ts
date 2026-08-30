// ============================================================
// ID Utilities
// ============================================================

/** 生成 UUID v4 */
export function generateId(): string {
  return crypto.randomUUID()
}
