import './styles.css'
import { CanvasBackground, type CanvasMetrics } from './canvasBackground'

type TransitionMode = 'stagger' | 'crossfade' | 'view-transition'
type GlassMode = 'a' | 'b' | 'c'
type BackgroundMode = 'static' | 'css' | 'canvas'

interface LabState {
  baseline: boolean
  transition: TransitionMode
  glass: GlassMode
  background: BackgroundMode
  activePage: number
  monitorEnabled: boolean
}

interface PageData {
  eyebrow: string
  title: string
  subtitle: string
  score: string
  scoreLabel: string
  rows: Array<{ time: string; title: string; meta: string }>
}

interface ViewTransitionLike {
  finished: Promise<void>
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionLike
}

const pages: PageData[] = [
  {
    eyebrow: '9 月 2 日 · 星期三',
    title: '早上好',
    subtitle: '今天节奏舒缓，先完成最重要的一件事。',
    score: '72%',
    scoreLabel: '今日完成度',
    rows: [
      { time: '09:30', title: '材料实验复盘', meta: '工作 · 45 分钟' },
      { time: '14:00', title: '散步与拉伸', meta: '生活 · 30 分钟' },
      { time: '19:20', title: '整理明日清单', meta: '个人 · 15 分钟' },
    ],
  },
  {
    eyebrow: '本周安排',
    title: '日程',
    subtitle: '把注意力留给确定要发生的事情。',
    score: '4',
    scoreLabel: '今日事件',
    rows: [
      { time: '08:40', title: '晨间课程', meta: '教学楼 A203' },
      { time: '11:15', title: '项目讨论', meta: '线上会议' },
      { time: '16:10', title: '自由阅读', meta: '图书馆' },
    ],
  },
  {
    eyebrow: '轻量清单',
    title: '待办',
    subtitle: '清楚、可完成，不让任务压住呼吸。',
    score: '3/5',
    scoreLabel: '已完成',
    rows: [
      { time: '高', title: '确认本周重点', meta: '工作 · 今天' },
      { time: '中', title: '补充阅读笔记', meta: '学习 · 每周' },
      { time: '低', title: '整理桌面', meta: '生活 · 无截止' },
    ],
  },
  {
    eyebrow: '今日状态',
    title: '平稳',
    subtitle: '情绪和能量都在舒服的中间位置。',
    score: '4.2',
    scoreLabel: '状态均值',
    rows: [
      { time: '08:20', title: '清醒', meta: '睡眠充足' },
      { time: '13:10', title: '专注', meta: '午后记录' },
      { time: '21:00', title: '放松', meta: '晚间记录' },
    ],
  },
  {
    eyebrow: '实验说明',
    title: '更多',
    subtitle: '只比较材质与动效，不连接真实 LifeOS 数据。',
    score: 'L4',
    scoreLabel: '目标证据',
    rows: [
      { time: '01', title: '记录切页体感', meta: '观察粉色 glow 是否迟到' },
      { time: '02', title: '快速往返切换', meta: '观察掉帧与 blur 闪烁' },
      { time: '03', title: '后台再返回', meta: '观察 Canvas 恢复成本' },
    ],
  },
]

const navItems = [
  { label: '今日', icon: '⌂' },
  { label: '日程', icon: '◷' },
  { label: '待办', icon: '✓' },
  { label: '状态', icon: '◌' },
  { label: '更多', icon: '···' },
]

const state: LabState = {
  baseline: true,
  transition: 'stagger',
  glass: 'a',
  background: 'static',
  activePage: 0,
  monitorEnabled: true,
}

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('Material Lab 缺少 #app 根节点')

root.innerHTML = `
  <div class="lab" data-baseline="true" data-transition="stagger" data-glass="a" data-background="static">
    <div class="background" aria-hidden="true">
      <div class="background-static"></div>
      <div class="baseline-blobs">
        <i></i><i></i><i></i><i></i><i></i>
      </div>
      <div class="css-background"><i></i><i></i><i></i></div>
      <canvas id="canvas-background"></canvas>
      <div class="background-veil"></div>
    </div>

    <header class="lab-header">
      <div>
        <p class="lab-kicker">LIFEOS · LAYER 2</p>
        <h1>Material Lab</h1>
      </div>
      <div class="environment-badge" id="environment-badge">检测环境中</div>
    </header>

    <main class="lab-main">
      <section class="control-panel material-surface" aria-labelledby="controls-heading">
        <div class="control-heading">
          <div>
            <p class="section-kicker">实验参数</p>
            <h2 id="controls-heading">独立对照台</h2>
          </div>
          <button class="baseline-button is-active" id="baseline-button" type="button">Baseline</button>
        </div>

        <div class="control-group">
          <span class="control-label">Transition</span>
          <div class="segment" data-control="transition">
            <button class="is-selected" data-value="stagger" type="button">Stagger</button>
            <button data-value="crossfade" type="button">Crossfade</button>
            <button data-value="view-transition" type="button">View Transition</button>
          </div>
        </div>

        <div class="control-group">
          <span class="control-label">Glass</span>
          <div class="segment" data-control="glass">
            <button data-value="a" type="button">候选 A</button>
            <button data-value="b" type="button">候选 B</button>
            <button data-value="c" type="button">候选 C</button>
          </div>
        </div>

        <div class="control-group">
          <span class="control-label">Dynamic Background</span>
          <div class="segment" data-control="background">
            <button data-value="static" type="button">Static</button>
            <button data-value="css" type="button">CSS</button>
            <button data-value="canvas" type="button">Canvas 2D</button>
          </div>
        </div>

        <div class="active-summary" id="active-summary"></div>
      </section>

      <section class="metrics-panel material-surface" aria-labelledby="metrics-heading">
        <div class="metrics-heading-row">
          <div>
            <p class="section-kicker">实时观察</p>
            <h2 id="metrics-heading">帧与切页指标</h2>
          </div>
          <div class="metrics-actions">
            <button id="monitor-toggle" type="button">监测：开</button>
            <button id="metrics-reset" type="button">重置</button>
          </div>
        </div>
        <div class="metrics-grid">
          <div><strong id="fps-value">--</strong><span>近窗 FPS</span></div>
          <div><strong id="long-frame-value">0</strong><span>&gt;33ms 帧</span></div>
          <div><strong id="switch-value">--</strong><span>切页首帧</span></div>
          <div><strong id="settled-value">--</strong><span>动效完成</span></div>
        </div>
        <p class="canvas-metric" id="canvas-metric">Canvas 未运行</p>
      </section>

      <section class="page-stage" id="page-stage" aria-live="polite"></section>
    </main>

    <nav class="bottom-nav material-surface" aria-label="Mock 底部导航">
      ${navItems.map((item, index) => `
        <button type="button" data-page="${index}" class="${index === 0 ? 'is-active' : ''}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `).join('')}
    </nav>
  </div>
`

const lab = getRequiredElement<HTMLElement>('.lab')
const stage = getRequiredElement<HTMLElement>('#page-stage')
const baselineButton = getRequiredElement<HTMLButtonElement>('#baseline-button')
const canvas = getRequiredElement<HTMLCanvasElement>('#canvas-background')
const fpsValue = getRequiredElement<HTMLElement>('#fps-value')
const longFrameValue = getRequiredElement<HTMLElement>('#long-frame-value')
const switchValue = getRequiredElement<HTMLElement>('#switch-value')
const settledValue = getRequiredElement<HTMLElement>('#settled-value')
const canvasMetric = getRequiredElement<HTMLElement>('#canvas-metric')
const monitorToggle = getRequiredElement<HTMLButtonElement>('#monitor-toggle')

let frameSamples: number[] = []
let lastAnimationFrame = 0
let longFrames = 0
let metricsAnimationFrame: number | null = null

const canvasBackground = new CanvasBackground(canvas, updateCanvasMetrics)

function getRequiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Material Lab 缺少元素：${selector}`)
  return element
}

function renderPage(): void {
  const page = pages[state.activePage]
  stage.innerHTML = `
    <article class="mock-page">
      <header class="mock-page-header transition-item" style="--item-index: 0">
        <p>${page.eyebrow}</p>
        <h2>${page.title}</h2>
        <span>${page.subtitle}</span>
      </header>

      <section class="hero-card material-surface transition-item" style="--item-index: 1">
        <div class="mood-orb" aria-hidden="true"><i></i></div>
        <div>
          <p class="section-kicker">今日核心状态</p>
          <strong>${page.score}</strong>
          <span>${page.scoreLabel}</span>
        </div>
      </section>

      <section class="mock-section transition-item" style="--item-index: 2">
        <div class="mock-section-heading">
          <div><p class="section-kicker">NEXT</p><h3>接下来</h3></div>
          <button type="button">查看全部</button>
        </div>
        <div class="list-card material-surface">
          ${page.rows.map((row, index) => `
            <div class="mock-row">
              <span class="row-time">${row.time}</span>
              <span class="row-dot" style="--row-index: ${index}"></span>
              <span class="row-copy"><strong>${row.title}</strong><small>${row.meta}</small></span>
              <span class="row-chevron">›</span>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="insight-card material-surface transition-item" style="--item-index: 3">
        <span class="insight-icon">✦</span>
        <div><strong>观察提示</strong><p>连续快速切换底部页面，留意背景粉色光晕、卡片 blur 和文字是否不同步。</p></div>
      </section>
    </article>
  `
}

function applyState(): void {
  lab.dataset.baseline = String(state.baseline)
  lab.dataset.transition = state.transition
  lab.dataset.glass = state.glass
  lab.dataset.background = state.background
  baselineButton.classList.toggle('is-active', state.baseline)

  document.querySelectorAll<HTMLElement>('[data-control]').forEach((group) => {
    const control = group.dataset.control
    group.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      const selected = control === 'transition'
        ? button.dataset.value === state.transition
        : control === 'glass'
          ? !state.baseline && button.dataset.value === state.glass
          : !state.baseline && button.dataset.value === state.background
      button.classList.toggle('is-selected', selected)
    })
  })

  const summary = getRequiredElement<HTMLElement>('#active-summary')
  summary.textContent = state.baseline
    ? '当前：Layer 1 Baseline · 500ms Stagger · 22px backdrop blur · 静态多光晕'
    : `当前：${transitionLabel(state.transition)} · 玻璃 ${state.glass.toUpperCase()} · ${backgroundLabel(state.background)}`

  if (!state.baseline && state.background === 'canvas') {
    canvasBackground.start()
  } else {
    canvasBackground.stop()
    canvasMetric.textContent = 'Canvas 未运行'
  }
}

function transitionLabel(mode: TransitionMode): string {
  if (mode === 'stagger') return 'Stagger'
  if (mode === 'crossfade') return 'Crossfade'
  return 'View Transition'
}

function backgroundLabel(mode: BackgroundMode): string {
  if (mode === 'static') return 'Static'
  if (mode === 'css') return 'CSS Dynamic'
  return 'Canvas 2D'
}

function setExperimentMode(): void {
  state.baseline = false
  applyState()
}

async function switchPage(nextPage: number): Promise<void> {
  if (nextPage === state.activePage) return
  const startedAt = performance.now()
  const previousPage = state.activePage
  state.activePage = nextPage

  const update = (): void => {
    renderPage()
    updateNav()
  }

  const viewTransitionDocument = document as ViewTransitionDocument
  let transitionFinished: Promise<void> | null = null

  if (!state.baseline && state.transition === 'view-transition' && viewTransitionDocument.startViewTransition) {
    transitionFinished = viewTransitionDocument.startViewTransition(update).finished
  } else {
    stage.classList.remove('is-crossfading')
    if (!state.baseline && state.transition === 'crossfade') {
      stage.classList.add('is-crossfading')
    }
    update()
  }

  await nextPaint()
  switchValue.textContent = `${Math.round(performance.now() - startedAt)}ms`

  if (transitionFinished) {
    await transitionFinished
  } else {
    const duration = state.baseline || state.transition === 'stagger' ? 620 : 280
    await wait(duration)
  }

  settledValue.textContent = `${Math.round(performance.now() - startedAt)}ms`
  stage.classList.remove('is-crossfading')

  if (previousPage !== state.activePage) {
    stage.dataset.lastDirection = nextPage > previousPage ? 'forward' : 'backward'
  }
}

function updateNav(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach((button) => {
    const active = Number(button.dataset.page) === state.activePage
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-current', active ? 'page' : 'false')
  })
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function startFrameMonitor(): void {
  if (metricsAnimationFrame !== null) return
  lastAnimationFrame = performance.now()

  const measure = (timestamp: number): void => {
    if (!state.monitorEnabled) {
      metricsAnimationFrame = null
      return
    }

    const delta = timestamp - lastAnimationFrame
    lastAnimationFrame = timestamp
    if (delta > 0 && delta < 1000) {
      frameSamples.push(delta)
      if (frameSamples.length > 90) frameSamples.shift()
      if (delta > 33.4) longFrames += 1
    }

    if (frameSamples.length > 0) {
      const averageDelta = frameSamples.reduce((sum, sample) => sum + sample, 0) / frameSamples.length
      fpsValue.textContent = `${Math.round(1000 / averageDelta)}`
      longFrameValue.textContent = String(longFrames)
    }

    metricsAnimationFrame = requestAnimationFrame(measure)
  }

  metricsAnimationFrame = requestAnimationFrame(measure)
}

function resetMetrics(): void {
  frameSamples = []
  longFrames = 0
  fpsValue.textContent = '--'
  longFrameValue.textContent = '0'
  switchValue.textContent = '--'
  settledValue.textContent = '--'
  canvasBackground.resetMetrics()
}

function updateCanvasMetrics(metrics: CanvasMetrics): void {
  canvasMetric.textContent = `Canvas：${metrics.targetFps}fps 上限 · 平均绘制 ${metrics.averageDrawMs.toFixed(2)}ms · ${metrics.resolution} · ${metrics.renderedFrames} 帧`
}

function updateEnvironmentBadge(): void {
  const badge = getRequiredElement<HTMLElement>('#environment-badge')
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  const supportsViewTransition = typeof (document as ViewTransitionDocument).startViewTransition === 'function'
  const mode = standalone ? 'Standalone' : '浏览器模式'
  badge.textContent = `${mode} · View Transition ${supportsViewTransition ? '✓' : 'fallback'}`
}

baselineButton.addEventListener('click', () => {
  state.baseline = true
  state.transition = 'stagger'
  state.glass = 'a'
  state.background = 'static'
  applyState()
  renderPage()
})

document.querySelectorAll<HTMLElement>('[data-control]').forEach((group) => {
  group.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-value]')
    if (!button) return
    const value = button.dataset.value
    const control = group.dataset.control
    if (!value || !control) return

    if (control === 'transition') state.transition = value as TransitionMode
    if (control === 'glass') state.glass = value as GlassMode
    if (control === 'background') state.background = value as BackgroundMode
    setExperimentMode()
    renderPage()
  })
})

document.querySelectorAll<HTMLButtonElement>('[data-page]').forEach((button) => {
  button.addEventListener('click', () => {
    void switchPage(Number(button.dataset.page))
  })
})

getRequiredElement<HTMLButtonElement>('#metrics-reset').addEventListener('click', resetMetrics)

monitorToggle.addEventListener('click', () => {
  state.monitorEnabled = !state.monitorEnabled
  monitorToggle.textContent = `监测：${state.monitorEnabled ? '开' : '关'}`
  if (state.monitorEnabled) startFrameMonitor()
})

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.monitorEnabled) {
    lastAnimationFrame = performance.now()
  }
})

renderPage()
applyState()
updateEnvironmentBadge()
startFrameMonitor()
