/**
 * Lifeform 可替换资产架构（v0.4 新增）
 *
 * 设计目标：
 * - Lifeform 是独立视觉资产，不是普通 UI 图标
 * - 未来工作流：iPad 手绘 PNG → SVG/矢量重建 → Lifeform 动画组件 → 接入生息
 * - 不假设设计资产一定来自 Illustrator
 * - 业务逻辑（MoodPicker / Dashboard / 图表）不依赖具体 SVG 实现
 * - 替换 SVG 资产不需要重写业务逻辑
 *
 * 架构：
 *   LifeformAsset（纯数据：5 个 level 的 SVG path + 渐变 + 动画配置）
 *       ↓
 *   LifeformRenderer（通用渲染器：根据 asset 数据渲染 SVG + 应用动画）
 *       ↓
 *   业务组件（MoodPicker / Dashboard / 图表，只传 level + size + asset）
 *
 * 内置资产：
 *   asset-flower（方案 A：五瓣花，MoodPicker 用）
 *   asset-core（方案 B：System Core，Dashboard 用）
 *
 * 未来扩展：
 *   用户/设计师提供 PNG → 矢量重建为 LifeformAsset 数据 → 注册到资产库 → 直接使用
 */

export type MoodLevel = 1 | 2 | 3 | 4 | 5

export const MOOD_LABELS: Record<MoodLevel, string> = {
  1: '特别坏',
  2: '坏',
  3: '一般',
  4: '好',
  5: '很好',
}

export const MOOD_COLORS: Record<MoodLevel, string> = {
  1: 'var(--color-mood-1)',
  2: 'var(--color-mood-2)',
  3: 'var(--color-mood-3)',
  4: 'var(--color-mood-4)',
  5: 'var(--color-mood-5)',
}

/** 单个 SVG 形状定义 */
export interface LifeformShape {
  /** 形状标识（用于动画 targeting，如 'core', 'ring-1', 'petal-1'） */
  id?: string
  /** SVG path d 属性（如果是 path） */
  d?: string
  /** 圆形 cx（如果是 circle，d 为空时使用） */
  cx?: number
  /** 圆形 cy */
  cy?: number
  /** 圆形 r */
  r?: number
  /** 填充色（可以是 CSS variable 或具体色值，或 url(#gradientId)） */
  fill: string
  /** 不透明度 */
  opacity?: number
  /** 描边色 */
  stroke?: string
  /** 描边宽度 */
  strokeWidth?: number
  /** SVG transform（如 "rotate(72 50 50)"） */
  transform?: string
  /** 渐变引用 ID（如果使用渐变填充，fill 设为 url(#id)） */
  gradientId?: string
}

/** 渐变定义 */
export interface LifeformGradient {
  id: string
  type: 'radial' | 'linear'
  /** radial: cx, cy, r；linear: x1, y1, x2, y2 */
  attrs: Record<string, string | number>
  stops: { offset: string; color: string; opacity?: number }[]
}

/** 单个心情等级的生命体形态数据 */
export interface LifeformLevelData {
  /** 主形状路径（外层轮廓，可选；A 方案无单一主轮廓） */
  mainShape?: LifeformShape
  /** 内部形状（核心、花瓣、微粒等，按渲染顺序排列） */
  innerShapes?: LifeformShape[]
  /** 整体缩放（相对于 viewBox 中心） */
  scale?: number
  /** 整体不透明度 */
  opacity?: number
  /** 光晕半径（level 5 盛放时的外层光晕，0 表示无） */
  glowRadius?: number
  /** 光晕颜色 */
  glowColor?: string
}

/** 生命体动画配置 */
export interface LifeformAnimation {
  /** 呼吸动画（整体 scale 微变化） */
  breathe?: {
    enabled: boolean
    /** 周期秒数 */
    duration?: number
    /** 缩放变化量（如 0.03 表示 ±3%） */
    scaleAmount?: number
  }
  /** 核心脉动（核心形状的 scale + opacity 变化） */
  corePulse?: {
    enabled: boolean
    duration?: number
    /** 核心形状在 innerShapes 中的 index（从 0 开始） */
    coreShapeIndex?: number
  }
  /** 能量环呼吸（环形形状的 opacity 变化） */
  ringFade?: {
    enabled: boolean
    duration?: number
    /** 环形形状在 innerShapes 中的 index 列表 */
    ringShapeIndices?: number[]
  }
  /** 盛放进入动画（从 scale 0.85 opacity 0.6 到 1） */
  bloomEnter?: {
    enabled: boolean
    duration?: number
  }
  /** level 5 光晕脉动 */
  glowPulse?: {
    enabled: boolean
    duration?: number
  }
}

/** 生命体完整资产（可替换的视觉数据） */
export interface LifeformAsset {
  /** 资产唯一 ID */
  id: string
  /** 资产名称 */
  name: string
  /** 资产描述（设计方向、使用场景） */
  description: string
  /** SVG viewBox（如 "0 0 100 100"） */
  viewBox: string
  /** 渐变定义（所有 level 共用，在 <defs> 中渲染） */
  gradients?: LifeformGradient[]
  /** 5 个心情等级的形态数据 */
  levels: Record<MoodLevel, LifeformLevelData>
  /** 动画配置 */
  animation?: LifeformAnimation
  /** 推荐使用场景（小尺寸/大尺寸） */
  recommendedSize?: 'small' | 'large' | 'both'
}

/** LifeformRenderer 组件 props */
export interface LifeformRendererProps {
  /** 生命体资产 */
  asset: LifeformAsset
  /** 心情等级 */
  level: MoodLevel
  /** 渲染尺寸（px） */
  size?: number
  /** 是否播放进入动画 */
  animate?: boolean
  /** 额外 className */
  className?: string
  /** 自定义样式 */
  style?: React.CSSProperties
}

/** 资产库（内置资产注册表，未来可扩展） */
export interface LifeformAssetLibrary {
  [id: string]: LifeformAsset
}
