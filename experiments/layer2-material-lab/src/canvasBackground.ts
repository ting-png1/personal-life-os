export interface CanvasMetrics {
  averageDrawMs: number
  renderedFrames: number
  resolution: string
  targetFps: number
}

interface Orb {
  color: [number, number, number]
  radius: number
  speedX: number
  speedY: number
  x: number
  y: number
}

const TARGET_FPS = 30
const FRAME_INTERVAL = 1000 / TARGET_FPS
const MAX_DPR = 1.25

export class CanvasBackground {
  private readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D
  private readonly onMetrics: (metrics: CanvasMetrics) => void
  private animationFrame: number | null = null
  private drawSamples: number[] = []
  private lastFrameAt = 0
  private renderedFrames = 0
  private running = false
  private width = 0
  private height = 0
  private dpr = 1

  private readonly orbs: Orb[] = [
    { x: 0.2, y: 0.18, radius: 0.48, speedX: 0.00018, speedY: 0.00012, color: [221, 165, 181] },
    { x: 0.82, y: 0.34, radius: 0.42, speedX: -0.00014, speedY: 0.0002, color: [207, 192, 225] },
    { x: 0.42, y: 0.84, radius: 0.5, speedX: 0.00012, speedY: -0.00016, color: [247, 221, 214] },
  ]

  constructor(canvas: HTMLCanvasElement, onMetrics: (metrics: CanvasMetrics) => void) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      throw new Error('当前浏览器无法创建 Canvas 2D context')
    }

    this.canvas = canvas
    this.context = context
    this.onMetrics = onMetrics
    this.resize = this.resize.bind(this)
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.tick = this.tick.bind(this)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.resize()
    window.addEventListener('resize', this.resize, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    this.draw(performance.now())
    this.animationFrame = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    window.removeEventListener('resize', this.resize)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.context.clearRect(0, 0, this.width, this.height)
  }

  resetMetrics(): void {
    this.drawSamples = []
    this.renderedFrames = 0
    this.emitMetrics()
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    this.width = Math.max(1, Math.round(window.innerWidth * this.dpr))
    this.height = Math.max(1, Math.round(window.innerHeight * this.dpr))
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${window.innerWidth}px`
    this.canvas.style.height = `${window.innerHeight}px`
    this.draw(performance.now())
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
      return
    }

    this.lastFrameAt = 0
    if (this.running && this.animationFrame === null) {
      this.animationFrame = requestAnimationFrame(this.tick)
    }
  }

  private tick(timestamp: number): void {
    if (!this.running) return

    if (timestamp - this.lastFrameAt >= FRAME_INTERVAL) {
      this.lastFrameAt = timestamp
      this.draw(timestamp)
    }

    this.animationFrame = requestAnimationFrame(this.tick)
  }

  private draw(timestamp: number): void {
    const startedAt = performance.now()
    const { context } = this

    context.fillStyle = '#eee9ef'
    context.fillRect(0, 0, this.width, this.height)

    for (const orb of this.orbs) {
      const phaseX = Math.sin(timestamp * orb.speedX)
      const phaseY = Math.cos(timestamp * orb.speedY)
      const x = (orb.x + phaseX * 0.11) * this.width
      const y = (orb.y + phaseY * 0.1) * this.height
      const radius = orb.radius * Math.max(this.width, this.height)
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
      const [red, green, blue] = orb.color
      gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.58)`)
      gradient.addColorStop(0.46, `rgba(${red}, ${green}, ${blue}, 0.22)`)
      gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`)
      context.fillStyle = gradient
      context.fillRect(0, 0, this.width, this.height)
    }

    const veil = context.createLinearGradient(0, 0, 0, this.height)
    veil.addColorStop(0, 'rgba(255,255,255,0.18)')
    veil.addColorStop(0.55, 'rgba(255,255,255,0.06)')
    veil.addColorStop(1, 'rgba(253,250,249,0.34)')
    context.fillStyle = veil
    context.fillRect(0, 0, this.width, this.height)

    const drawMs = performance.now() - startedAt
    this.drawSamples.push(drawMs)
    if (this.drawSamples.length > 120) this.drawSamples.shift()
    this.renderedFrames += 1
    if (this.renderedFrames % 15 === 0) this.emitMetrics()
  }

  private emitMetrics(): void {
    const total = this.drawSamples.reduce((sum, sample) => sum + sample, 0)
    this.onMetrics({
      averageDrawMs: this.drawSamples.length === 0 ? 0 : total / this.drawSamples.length,
      renderedFrames: this.renderedFrames,
      resolution: `${this.width}×${this.height} @${this.dpr.toFixed(2)}x`,
      targetFps: TARGET_FPS,
    })
  }
}
