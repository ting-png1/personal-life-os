/**
 * Lifeform 内置资产（v0.4 新增）
 *
 * 将当前 A/B 实现转换为纯数据资产，证明可替换资产架构可行。
 * 未来资产来源：iPad 手绘 PNG → SVG/矢量重建 → 注册为 LifeformAsset → 直接使用
 *
 * 内置资产：
 *   asset-flower（方案 A：五瓣花，MoodPicker 小尺寸用）
 *   asset-core（方案 B：System Core，Dashboard 大尺寸用）
 */

import type { LifeformAsset, LifeformLevelData, LifeformShape, MoodLevel } from './types'

// ─── 通用工具 ───────────────────────────────────────────────

const MOOD_COLOR_VAR: Record<MoodLevel, string> = {
  1: 'var(--color-mood-1)',
  2: 'var(--color-mood-2)',
  3: 'var(--color-mood-3)',
  4: 'var(--color-mood-4)',
  5: 'var(--color-mood-5)',
}

/** 线性插值 */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ─── 方案 B：System Core 路径预计算 ──────────────────────────

/**
 * B 的 12 控制点有机轮廓。
 * 每个等级有不同的收缩偏移，用 Catmull-Rom → Bezier 平滑闭合。
 * 在模块加载时预计算 5 个等级的静态路径，渲染器只读数据不计算。
 */
const B_BASE_POINTS = [
  { x: 50, y: 14 }, { x: 66, y: 19 }, { x: 79, y: 31 }, { x: 85, y: 47 },
  { x: 81, y: 63 }, { x: 69, y: 75 }, { x: 53, y: 83 }, { x: 37, y: 79 },
  { x: 23, y: 67 }, { x: 16, y: 51 }, { x: 20, y: 35 }, { x: 33, y: 22 },
]

const B_CONTRACT_OFFSETS = [
  { x: 3, y: 7 }, { x: -5, y: 5 }, { x: -7, y: 2 }, { x: -9, y: 0 },
  { x: -6, y: -4 }, { x: -4, y: -6 }, { x: 2, y: -8 }, { x: 5, y: -5 },
  { x: 7, y: -2 }, { x: 9, y: 0 }, { x: 5, y: 3 }, { x: 4, y: 5 },
]

/** Catmull-Rom → Bezier 平滑闭合路径 */
function catmullRomToBezier(points: { x: number; y: number }[]): string {
  if (points.length < 3) return ''
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length; i++) {
    const curr = points[i]
    const next = points[(i + 1) % points.length]
    const nextNext = points[(i + 2) % points.length]
    const cpx = next.x + (nextNext.x - curr.x) / 6
    const cpy = next.y + (nextNext.y - curr.y) / 6
    const cpx2 = nextNext.x - (nextNext.x - next.x) / 6
    const cpy2 = nextNext.y - (nextNext.y - next.y) / 6
    d += ` C ${cpx.toFixed(1)} ${cpy.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${nextNext.x.toFixed(1)} ${nextNext.y.toFixed(1)}`
  }
  return d + ' Z'
}

/** 预计算 B 的某个等级路径 */
function computeBPath(level: MoodLevel): string {
  const morph = (level - 1) / 4
  const t = 1 - morph // level 1: t=1 全收缩，level 5: t=0
  const points = B_BASE_POINTS.map((p, i) => ({
    x: p.x + B_CONTRACT_OFFSETS[i].x * t,
    y: p.y + B_CONTRACT_OFFSETS[i].y * t,
  }))
  return catmullRomToBezier(points)
}

// 预计算全部 5 个等级路径（模块加载时执行一次）
const B_PATHS: Record<MoodLevel, string> = {
  1: computeBPath(1),
  2: computeBPath(2),
  3: computeBPath(3),
  4: computeBPath(4),
  5: computeBPath(5),
}

// ─── 方案 A：五瓣花资产构建 ──────────────────────────────────

/** A 的有机花瓣路径（静态，所有等级共用，仅 scale/opacity 不同） */
const A_PETAL_PATH = `
  M 50,53
  C 45,46 42,36 44,26
  C 46,18 54,18 56,26
  C 58,36 55,46 50,53
  Z
`

const A_PETAL_ANGLES = [0, 72, 144, 216, 288]

/** 构建 A 的某个等级数据 */
function buildALevel(level: MoodLevel): LifeformLevelData {
  const morph = (level - 1) / 4
  const petalScale = lerp(0.5, 1.0, morph)
  const petalOpacity = lerp(0.55, 0.95, morph)
  const coreScale = lerp(0.55, 1.0, morph)
  const coreOpacity = lerp(0.4, 0.95, morph)
  const color = MOOD_COLOR_VAR[level]
  const ringOpacity = 0.1 + morph * 0.25

  const innerShapes: LifeformShape[] = []

  // 5 个花瓣（每个有独立旋转 + 等级缩放）
  A_PETAL_ANGLES.forEach((angle, i) => {
    innerShapes.push({
      id: `petal-${i}`,
      d: A_PETAL_PATH,
      fill: 'url(#petal-grad)',
      opacity: petalOpacity,
      stroke: 'rgba(255,255,255,0.2)',
      strokeWidth: 0.5,
      transform: `rotate(${angle} 50 50) scale(${petalScale})`,
    })
  })

  // 核心主体
  innerShapes.push({
    id: 'core',
    cx: 50, cy: 50, r: 11,
    fill: 'url(#core-grad)',
    opacity: coreOpacity,
    transform: `scale(${coreScale})`,
  })

  // 核心高光点
  innerShapes.push({
    id: 'core-highlight',
    cx: 47, cy: 47, r: 3.5,
    fill: 'rgba(255,255,255,0.6)',
    opacity: coreOpacity,
    transform: `scale(${coreScale})`,
  })

  // 核心外环
  innerShapes.push({
    id: 'core-ring',
    cx: 50, cy: 50, r: 13,
    fill: 'none',
    stroke: color,
    strokeWidth: 0.8,
    opacity: ringOpacity,
    transform: `scale(${coreScale})`,
  })

  return {
    innerShapes,
    glowRadius: level === 5 ? 45 : 0,
    glowColor: 'url(#bloom-glow)',
  }
}

// ─── 方案 B：System Core 资产构建 ────────────────────────────

const B_PARTICLES = [
  { x: 42, y: 38, r: 1.8 },
  { x: 58, y: 55, r: 1.5 },
  { x: 45, y: 62, r: 1.2 },
]

/** 构建 B 的某个等级数据 */
function buildBLevel(level: MoodLevel): LifeformLevelData {
  const morph = (level - 1) / 4
  const scale = lerp(0.55, 1.0, morph)
  const membraneOpacity = lerp(0.5, 0.92, morph)
  const color = MOOD_COLOR_VAR[level]
  const pathD = B_PATHS[level]
  const coreR = 6 + morph * 5
  const coreOpacity = 0.3 + morph * 0.65
  const highlightR = 2 + morph * 1.5
  const highlightOpacity = 0.3 + morph * 0.6
  const innerGlowOpacity = 0.3 + morph * 0.4
  const innerEdgeOpacity = 0.3 + morph * 0.4
  const ring1Opacity = morph * 0.25
  const particleOpacity = morph * 0.5

  const innerShapes: LifeformShape[] = []

  // 膜内层暗边（厚度感）
  innerShapes.push({
    id: 'membrane-inner-edge',
    d: pathD,
    fill: 'none',
    stroke: 'rgba(60,45,50,0.12)',
    strokeWidth: 1.5,
    opacity: innerEdgeOpacity,
    transform: 'scale(0.94)',
  })

  // 内部微光场
  innerShapes.push({
    id: 'inner-glow',
    d: pathD,
    fill: 'url(#inner-glow-grad)',
    opacity: innerGlowOpacity,
  })

  // 核心环 1
  innerShapes.push({
    id: 'ring-1',
    cx: 50, cy: 50, r: 18,
    fill: 'none',
    stroke: color,
    strokeWidth: 0.6,
    opacity: ring1Opacity,
  })

  // 核心环 2（level 4+）
  if (level >= 4) {
    innerShapes.push({
      id: 'ring-2',
      cx: 50, cy: 50, r: 24,
      fill: 'none',
      stroke: color,
      strokeWidth: 0.4,
      opacity: 0.12,
    })
  }

  // 内部微粒
  B_PARTICLES.forEach((p, i) => {
    innerShapes.push({
      id: `particle-${i}`,
      cx: p.x, cy: p.y, r: p.r,
      fill: 'rgba(255,255,255,0.4)',
      opacity: particleOpacity,
    })
  })

  // 核心主体
  innerShapes.push({
    id: 'core',
    cx: 50, cy: 50, r: coreR,
    fill: 'url(#core-grad)',
    opacity: coreOpacity,
  })

  // 核心高光
  innerShapes.push({
    id: 'core-highlight',
    cx: 47.5, cy: 47.5, r: highlightR,
    fill: 'rgba(255,255,255,0.7)',
    opacity: highlightOpacity,
  })

  return {
    mainShape: {
      d: pathD,
      fill: 'url(#membrane-grad)',
      opacity: membraneOpacity,
      stroke: 'rgba(255,255,255,0.25)',
      strokeWidth: 0.8,
    },
    innerShapes,
    scale,
    glowRadius: level === 5 ? 47 : 0,
    glowColor: 'url(#bloom-glow)',
  }
}

// ─── 导出内置资产 ─────────────────────────────────────────────

/**
 * 方案 A：五瓣花生命体
 * 设计方向：生命形态 / 情绪变化
 * 使用场景：MoodPicker 46px（小尺寸识别度和生命感）
 */
export const ASSET_FLOWER: LifeformAsset = {
  id: 'asset-flower',
  name: '五瓣花',
  description: '有机贝塞尔花瓣，根部到尖端渐变，径向渐变核心。小尺寸识别度高，有生命感。',
  viewBox: '0 0 100 100',
  recommendedSize: 'small',
  gradients: [
    {
      id: 'petal-grad',
      type: 'linear',
      attrs: { x1: '50%', y1: '100%', x2: '50%', y2: '0%' },
      stops: [
        { offset: '0%', color: 'var(--grad-petal-deep)', opacity: 0.95 },
        { offset: '60%', color: 'var(--grad-petal-deep)', opacity: 0.75 },
        { offset: '100%', color: '#ffffff', opacity: 0.45 },
      ],
    },
    {
      id: 'core-grad',
      type: 'radial',
      attrs: { cx: '42%', cy: '38%', r: '60%' },
      stops: [
        { offset: '0%', color: 'rgba(255,255,255,0.85)' },
        { offset: '35%', color: 'var(--grad-core-color)', opacity: 0.7 },
        { offset: '100%', color: 'var(--grad-core-color)', opacity: 0.15 },
      ],
    },
    {
      id: 'bloom-glow',
      type: 'radial',
      attrs: { cx: '50%', cy: '50%', r: '50%' },
      stops: [
        { offset: '0%', color: 'rgba(156,184,160,0.16)' },
        { offset: '55%', color: 'rgba(232,201,208,0.08)' },
        { offset: '100%', color: 'rgba(232,201,208,0)' },
      ],
    },
  ],
  levels: {
    1: buildALevel(1),
    2: buildALevel(2),
    3: buildALevel(3),
    4: buildALevel(4),
    5: buildALevel(5),
  },
  animation: {
    breathe: { enabled: true, duration: 3.5, scaleAmount: 0.03 },
    bloomEnter: { enabled: true, duration: 0.6 },
    glowPulse: { enabled: true, duration: 3.5 },
  },
}

/**
 * 方案 B：System Core 抽象有机生命体
 * 设计方向：生命核心 / System Core / Personal OS
 * 使用场景：Dashboard 110px（大尺寸展示，强调系统核心感和生物感）
 */
export const ASSET_CORE: LifeformAsset = {
  id: 'asset-core',
  name: 'System Core',
  description: '12 控制点有机轮廓，膜厚度，脉动核心，双层能量环，内部微粒。大尺寸有丰富细节和生物感。',
  viewBox: '0 0 100 100',
  recommendedSize: 'large',
  gradients: [
    {
      id: 'membrane-grad',
      type: 'radial',
      attrs: { cx: '50%', cy: '45%', r: '55%' },
      stops: [
        { offset: '0%', color: 'var(--grad-membrane-color)', opacity: 0.5 },
        { offset: '70%', color: 'var(--grad-membrane-color)', opacity: 0.75 },
        { offset: '92%', color: 'var(--grad-membrane-color)', opacity: 0.9 },
        { offset: '100%', color: '#ffffff', opacity: 0.25 },
      ],
    },
    {
      id: 'core-grad',
      type: 'radial',
      attrs: { cx: '42%', cy: '38%', r: '60%' },
      stops: [
        { offset: '0%', color: 'rgba(255,255,255,0.9)' },
        { offset: '30%', color: 'var(--grad-core-color)', opacity: 0.75 },
        { offset: '100%', color: 'var(--grad-core-color)', opacity: 0.1 },
      ],
    },
    {
      id: 'inner-glow-grad',
      type: 'radial',
      attrs: { cx: '50%', cy: '50%', r: '50%' },
      stops: [
        { offset: '0%', color: 'var(--grad-inner-glow-color)', opacity: 0.2 },
        { offset: '100%', color: 'var(--grad-inner-glow-color)', opacity: 0 },
      ],
    },
    {
      id: 'bloom-glow',
      type: 'radial',
      attrs: { cx: '50%', cy: '50%', r: '50%' },
      stops: [
        { offset: '0%', color: 'rgba(156,184,160,0.15)' },
        { offset: '60%', color: 'rgba(232,201,208,0.07)' },
        { offset: '100%', color: 'rgba(232,201,208,0)' },
      ],
    },
  ],
  levels: {
    1: buildBLevel(1),
    2: buildBLevel(2),
    3: buildBLevel(3),
    4: buildBLevel(4),
    5: buildBLevel(5),
  },
  animation: {
    breathe: { enabled: true, duration: 3.5, scaleAmount: 0.02 },
    corePulse: { enabled: true, duration: 2.8, coreShapeIndex: 0 },
    ringFade: { enabled: true, duration: 4, ringShapeIndices: [0, 1] },
    bloomEnter: { enabled: true, duration: 0.6 },
    glowPulse: { enabled: true, duration: 3.5 },
  },
}

/** 内置资产库 */
export const BUILTIN_ASSETS: Record<string, LifeformAsset> = {
  [ASSET_FLOWER.id]: ASSET_FLOWER,
  [ASSET_CORE.id]: ASSET_CORE,
}
