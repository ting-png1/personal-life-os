/**
 * LifeformRenderer — 通用生命体渲染器（v0.4 新增）
 *
 * 读取 LifeformAsset 纯数据，渲染 SVG。不包含任何特定形态的业务逻辑。
 * 未来替换 SVG 资产（PNG→SVG 重建）只需传入新的 LifeformAsset，无需修改此组件或业务组件。
 *
 * 渲染流程：
 *   1. 生成唯一渐变 ID（React useId，避免多实例冲突）
 *   2. 设置 CSS 变量（渐变颜色随心情等级变化）
 *   3. 渲染 <svg viewBox> + <defs> 渐变
 *   4. 渲染外层光晕（level 5）
 *   5. 渲染主形状 + 内部形状（按顺序）
 *   6. 应用动画（呼吸/脉动/环/光晕/盛放进入）
 */

import { useId, type CSSProperties } from 'react'
import type { LifeformAsset, LifeformRendererProps, LifeformShape, MoodLevel } from './types'
import { MOOD_LABELS } from './types'

/** 心情等级对应的渐变颜色 CSS 变量值 */
function getMoodGradientVars(level: MoodLevel): Record<string, string> {
  const colorVar = `var(--color-mood-${level})`
  return {
    '--grad-petal-deep': colorVar,
    '--grad-core-color': colorVar,
    '--grad-membrane-color': colorVar,
    '--grad-inner-glow-color': colorVar,
  }
}

/** 渲染单个形状（path 或 circle） */
function renderShape(shape: LifeformShape, uniquePrefix: string, key: string) {
  // 替换渐变引用中的 ID，加上唯一前缀
  const fill = shape.fill?.replace(/url\(#([^)]+)\)/g, `url(#${uniquePrefix}-$1)`)
  const commonProps = {
    key,
    opacity: shape.opacity,
    transform: shape.transform,
    style: { transformOrigin: '50px 50px' } as CSSProperties,
  }

  if (shape.d && shape.d.trim()) {
    // Path 形状
    return (
      <path
        {...commonProps}
        d={shape.d}
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
      />
    )
  }

  if (shape.cx !== undefined && shape.cy !== undefined && shape.r !== undefined) {
    // Circle 形状
    return (
      <circle
        {...commonProps}
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r}
        fill={fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
      />
    )
  }

  return null
}

/**
 * 通用生命体渲染器
 *
 * @param asset - 生命体资产（纯数据，可替换）
 * @param level - 心情等级 1-5
 * @param size - 渲染尺寸 px
 * @param animate - 是否播放进入动画
 * @param className - 额外 className
 * @param style - 额外样式
 */
export function LifeformRenderer({
  asset,
  level,
  size = 64,
  animate = false,
  className = '',
  style,
}: LifeformRendererProps) {
  const rawId = useId()
  // React useId 返回如 ":r0:"，需去掉冒号以用作 SVG ID
  const uniquePrefix = `lf-${rawId.replace(/:/g, '')}`

  const levelData = asset.levels[level]
  const anim = asset.animation || {}
  const moodVars = getMoodGradientVars(level)

  // 容器样式：尺寸 + 渐变颜色 CSS 变量
  const containerStyle: CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    ...moodVars,
    ...style,
  }

  // 整体缩放（level data 的 scale，应用到内部 g）
  const groupScale = levelData.scale ?? 1

  // 动画 class 映射
  const getShapeAnimClass = (shapeId?: string): string => {
    if (!shapeId) return ''
    if ((shapeId === 'core' || shapeId === 'core-highlight') && anim.corePulse?.enabled) {
      return 'animate-core-pulse'
    }
    if ((shapeId === 'ring-1' || shapeId === 'ring-2') && anim.ringFade?.enabled) {
      return shapeId === 'ring-2' ? 'animate-ring-fade ring-fade-delay' : 'animate-ring-fade'
    }
    return ''
  }

  return (
    <div
      style={containerStyle}
      className={`${animate && anim.bloomEnter?.enabled ? 'animate-lifeform-bloom' : ''} ${className}`}
      role="img"
      aria-label={`心情：${MOOD_LABELS[level]}`}
    >
      <svg viewBox={asset.viewBox} width={size} height={size}>
        <defs>
          {asset.gradients?.map((grad) => {
            const uid = `${uniquePrefix}-${grad.id}`
            if (grad.type === 'radial') {
              return (
                <radialGradient key={grad.id} id={uid} {...(grad.attrs as Record<string, string>)}>
                  {grad.stops.map((stop, i) => (
                    <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
                  ))}
                </radialGradient>
              )
            }
            return (
              <linearGradient key={grad.id} id={uid} {...(grad.attrs as Record<string, string>)}>
                {grad.stops.map((stop, i) => (
                  <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
                ))}
              </linearGradient>
            )
          })}
        </defs>

        {/* 外层光晕（level 5 盛放） */}
        {levelData.glowRadius && levelData.glowRadius > 0 && (
          <circle
            cx="50"
            cy="50"
            r={levelData.glowRadius}
            fill={levelData.glowColor?.replace(/url\(#([^)]+)\)/g, `url(#${uniquePrefix}-$1)`)}
            className={anim.glowPulse?.enabled ? 'animate-glow-pulse' : ''}
            style={{ transformOrigin: '50px 50px' }}
          />
        )}

        {/* 主体组：应用整体缩放 + 呼吸动画 */}
        <g
          style={{ transformOrigin: '50px 50px' }}
          className={anim.breathe?.enabled ? 'animate-breathe' : ''}
        >
          <g style={{ transformOrigin: '50px 50px', transform: `scale(${groupScale})` }}>
            {/* 主形状（外层轮廓） */}
            {levelData.mainShape &&
              renderShape(levelData.mainShape, uniquePrefix, 'main')}

            {/* 内部形状（按渲染顺序） */}
            {levelData.innerShapes?.map((shape, i) => (
              <g
                key={shape.id || `inner-${i}`}
                className={getShapeAnimClass(shape.id)}
                style={{ transformOrigin: '50px 50px' }}
              >
                {renderShape(shape, uniquePrefix, shape.id || `inner-${i}`)}
              </g>
            ))}
          </g>
        </g>
      </svg>
    </div>
  )
}

export type { LifeformAsset }
