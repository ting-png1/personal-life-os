/**
 * GlassFilters — SVG 滤镜定义
 *
 * 定义 Dew 水滴 displacement、玻璃边缘柔化、Lifeform 核心发光等 SVG filter。
 * 必须在应用根节点渲染一次，供其他组件引用。
 */

interface GlassFiltersProps {
  id?: string
}

export function GlassFilters({ id = 'glass-filters' }: GlassFiltersProps) {
  return (
    <svg
      id={id}
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      aria-hidden="true"
    >
      <defs>
        {/* Dew 水滴 displacement filter */}
        <filter id="dew-displace" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.018"
            numOctaves="3"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* 玻璃边缘增强 filter（用于 SVG 元素） */}
        <filter id="glass-edge-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.95
                    0 1 0 0 0.92
                    0 0 1 0 0.93
                    0 0 0 0.3 0"
            result="soft-edge"
          />
          <feMerge>
            <feMergeNode in="soft-edge" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Lifeform 核心发光 filter */}
        <filter id="lifeform-core-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Dew 水滴图案（gradient 定义） */}
        <radialGradient id="dew-drop-1" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="dew-drop-2" cx="60%" cy="65%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
    </svg>
  )
}
