/**
 * Lifeform 模块入口（v0.4 新增）
 *
 * 可替换资产架构：
 *   LifeformAsset（纯数据）→ LifeformRenderer（通用渲染）→ 业务组件
 *
 * 未来工作流：iPad 手绘 PNG → SVG/矢量重建 → 注册为 LifeformAsset → 直接使用
 * 业务组件（MoodPicker / Dashboard / 图表）不依赖具体 SVG 实现。
 */

export { LifeformRenderer } from './LifeformRenderer'
export { ASSET_FLOWER, ASSET_CORE, BUILTIN_ASSETS } from './assets'
export type {
  LifeformAsset,
  LifeformLevelData,
  LifeformShape,
  LifeformGradient,
  LifeformAnimation,
  LifeformRendererProps,
  MoodLevel,
} from './types'
export { MOOD_LABELS, MOOD_COLORS } from './types'
