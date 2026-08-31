/**
 * 方案 B：System Core 抽象有机生命体
 *
 * 设计方向：生命核心 / System Core / Personal OS
 * 使用场景：Dashboard 110px（大尺寸展示，强调系统核心感和生物感）
 */

import { LifeformRenderer, ASSET_CORE } from './lifeform'
import type { MoodLevel } from './lifeform'

interface MoodLifeformBProps {
  level: MoodLevel
  size?: number
  animate?: boolean
  className?: string
}

export function MoodLifeformB({ level, size = 64, animate = false, className = '' }: MoodLifeformBProps) {
  return (
    <LifeformRenderer
      asset={ASSET_CORE}
      level={level}
      size={size}
      animate={animate}
      className={className}
    />
  )
}
