/**
 * 方案 A：五瓣花生命体
 *
 * 设计方向：生命形态 / 情绪变化
 * 使用场景：MoodPicker 46px（小尺寸识别度和生命感）
 */

import { LifeformRenderer, ASSET_FLOWER } from './lifeform'
import type { MoodLevel } from './lifeform'

export type { MoodLevel }
export { MOOD_LABELS, MOOD_COLORS } from './lifeform'

interface MoodLifeformAProps {
  level: MoodLevel
  size?: number
  animate?: boolean
  className?: string
}

export function MoodLifeformA({ level, size = 64, animate = false, className = '' }: MoodLifeformAProps) {
  return (
    <LifeformRenderer
      asset={ASSET_FLOWER}
      level={level}
      size={size}
      animate={animate}
      className={className}
    />
  )
}
