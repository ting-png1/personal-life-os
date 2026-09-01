import { useMemo } from 'react'

/**
 * BackgroundSystem — 可扩展背景材质系统
 *
 * 架构设计：
 *   用户图片 → 背景处理 → 材质选择 → UI 玻璃层
 *
 * 当前实现：
 *   - source: 'aurora'（3 个预设光晕版本）
 *   - source: 'image'（用户上传图片）
 *   - material: 5 种材质模式，对背景层应用不同 CSS filter / 动画 / SVG 纹理
 *
 * 材质模式：
 *   - original-soft: 轻微柔化
 *   - mist: 朦胧磨砂
 *   - frosted-glass: 更明显磨砂玻璃
 *   - liquid: 轻微动态液态
 *   - dew: 玻璃水滴效果
 */

export type AuroraVersion = 'rose-mist' | 'lavender-dawn' | 'warm-bloom'
export type BackgroundSource = 'aurora' | 'image'
export type MaterialType = 'original-soft' | 'mist' | 'frosted-glass' | 'liquid' | 'dew'

export interface BackgroundConfig {
  source: BackgroundSource
  auroraVersion?: AuroraVersion
  imageUrl?: string
  material: MaterialType
}

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  'original-soft': '轻柔',
  'mist': '薄雾',
  'frosted-glass': '磨砂玻璃',
  'liquid': '液态',
  'dew': '凝露',
}

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  source: 'aurora',
  auroraVersion: 'lavender-dawn',
  material: 'mist',
}

interface BackgroundSystemProps {
  config: BackgroundConfig
}

/* ===== Aurora 光晕配置（3 版本） ===== */
const auroraConfigs: Record<AuroraVersion, {
  base: string
  blobs: { color: string; x: string; y: string; size: number; opacity: number; blur: string; drift?: boolean }[]
  label: string
}> = {
  'lavender-dawn': {
    base: '#ECE8EF',
    label: '薰衣草晨曦',
    blobs: [
      { color: '#D8CFE0', x: '12%', y: '6%', size: 380, opacity: 0.5, blur: 'blur(80px)', drift: true },
      { color: '#CFC4D8', x: '82%', y: '82%', size: 400, opacity: 0.4, blur: 'blur(90px)', drift: true },
      { color: '#E0D5E5', x: '88%', y: '18%', size: 280, opacity: 0.35, blur: 'blur(60px)' },
      { color: '#D5CCDC', x: '8%', y: '78%', size: 300, opacity: 0.3, blur: 'blur(65px)' },
      { color: '#DDB8C0', x: '62%', y: '38%', size: 180, opacity: 0.35, blur: 'blur(45px)' },
      { color: '#E8D5D0', x: '35%', y: '92%', size: 220, opacity: 0.25, blur: 'blur(55px)' },
    ],
  },
  'rose-mist': {
    base: '#F3ECEA',
    label: '玫瑰雾',
    blobs: [
      { color: '#E8C5CC', x: '15%', y: '8%', size: 360, opacity: 0.45, blur: 'blur(75px)', drift: true },
      { color: '#E0B8C0', x: '78%', y: '80%', size: 380, opacity: 0.35, blur: 'blur(85px)', drift: true },
      { color: '#F0D0C8', x: '85%', y: '22%', size: 260, opacity: 0.32, blur: 'blur(55px)' },
      { color: '#E5C8CC', x: '18%', y: '82%', size: 280, opacity: 0.3, blur: 'blur(60px)' },
      { color: '#DDA5B0', x: '55%', y: '45%', size: 160, opacity: 0.3, blur: 'blur(40px)' },
    ],
  },
  'warm-bloom': {
    base: '#F5EFEA',
    label: '暖盛放',
    blobs: [
      { color: '#EBD0C8', x: '12%', y: '6%', size: 350, opacity: 0.42, blur: 'blur(75px)', drift: true },
      { color: '#E8C8B8', x: '80%', y: '78%', size: 390, opacity: 0.35, blur: 'blur(85px)', drift: true },
      { color: '#F0D8C8', x: '85%', y: '20%', size: 270, opacity: 0.35, blur: 'blur(55px)' },
      { color: '#E5D0C5', x: '20%', y: '85%', size: 260, opacity: 0.32, blur: 'blur(55px)' },
      { color: '#DDB8A8', x: '50%', y: '42%', size: 170, opacity: 0.3, blur: 'blur(42px)' },
    ],
  },
}

/* ===== 材质模式 → CSS 类映射 ===== */
const materialClassMap: Record<MaterialType, string> = {
  'original-soft': 'bg-material-original-soft',
  'mist': 'bg-material-mist',
  'frosted-glass': 'bg-material-frosted',
  'liquid': 'bg-material-liquid',
  'dew': 'bg-material-dew',
}

export function BackgroundSystem({ config }: BackgroundSystemProps) {
  const { source, auroraVersion = 'lavender-dawn', imageUrl, material } = config
  const isLiquid = material === 'liquid'
  const isDew = material === 'dew'

  const aurora = auroraConfigs[auroraVersion]

  const blobs = useMemo(() => {
    if (source !== 'aurora') return []
    return aurora.blobs.map((blob, i) => ({ ...blob, id: i }))
  }, [source, aurora])

  const materialClass = materialClassMap[material]

  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{
        backgroundColor: source === 'aurora' ? aurora.base : '#E8E4E6',
        transform: 'translateZ(0)',
        // 仅在 liquid 动画模式下启用 will-change，避免静态背景创建永久合成层
        // 永久合成层 + 多个 blur 光晕在 iOS 键盘出现/消失时重绘会产生渲染 artifact
        ...(isLiquid ? { willChange: 'transform' } : {}),
      }}
      aria-hidden="true"
    >
      {/* ===== 背景内容层 ===== */}
      {source === 'aurora' ? (
        <div className={materialClass} style={{ position: 'absolute', inset: 0 }}>
          {blobs.map((blob) => (
            <div
              key={blob.id}
              className={`absolute rounded-full ${isLiquid && blob.drift ? (blob.id % 2 === 0 ? 'liquid-drift-1' : 'liquid-drift-2') : ''}`}
              style={{
                left: blob.x,
                top: blob.y,
                width: blob.size,
                height: blob.size,
                backgroundColor: blob.color,
                opacity: blob.opacity,
                filter: blob.blur,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
      ) : (
        imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover ${materialClass}`}
            style={{
              opacity: 0.92,
              transform: 'translateZ(0)',
            }}
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-text-tertiary text-sm">用户图片背景（预留接口）</span>
          </div>
        )
      )}

      {/* ===== Text Protection Layer — 仅对图片背景生效 ===== */}
      {source === 'image' && imageUrl && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to bottom,
              transparent 0%,
              rgba(255,255,255,0.06) 10%,
              rgba(255,255,255,0.10) 30%,
              rgba(255,255,255,0.10) 70%,
              rgba(255,255,255,0.06) 90%,
              transparent 100%)`,
          }}
        />
      )}

      {/* ===== Dew 材质：水滴纹理叠加层 ===== */}
      {isDew && (
        <>
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.04]"
            style={{ filter: 'url(#dew-displace)' }}
            aria-hidden="true"
          >
            <rect width="100%" height="100%" fill="rgba(255,255,255,0.3)" />
          </svg>
          <div className="absolute inset-0 opacity-[0.06]">
            {[
              { x: '15%', y: '20%', s: 60 },
              { x: '70%', y: '15%', s: 45 },
              { x: '40%', y: '55%', s: 80 },
              { x: '85%', y: '60%', s: 50 },
              { x: '25%', y: '80%', s: 55 },
              { x: '60%', y: '85%', s: 40 },
            ].map((drop, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: drop.x,
                  top: drop.y,
                  width: drop.s,
                  height: drop.s,
                  background: i % 2 === 0 ? 'url(#dew-drop-1)' : 'url(#dew-drop-2)',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* ===== 细微噪点纹理层（所有材质共用） ===== */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(60,45,50,0.4) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  )
}

export function getAuroraLabel(version: AuroraVersion): string {
  return auroraConfigs[version].label
}

export function getMaterialLabel(material: MaterialType): string {
  return MATERIAL_LABELS[material]
}
