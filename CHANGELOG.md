# Personal Life OS — 变更日志

> **定位**：项目历史变更记录。只记录已经实际发生的重要变更。描述"项目是怎么一步一步变成现在这样的"。
> **与 PROJECT_PLAN 的关系**：PROJECT_PLAN 描述"现在是什么样"，本文档描述"过去发生了什么"。
> **格式**：按版本倒序排列，最新版本在最上方。

---

## [v6.1.0] — 2026-08-31

### UI Migration Layer 1 — Phase 1：设计基础（tokens.css + globals.css 合并）

**背景**：
- UI Preview 项目（`D:\lifeUI_preview`）已完成 Layer 1 设计并正式冻结
- 迁移交接文档：`D:\lifeUI_preview\docs\UI_MIGRATION_HANDOFF.md`
- 迁移在独立分支 `feature/ui-migration-layer1` 进行，未 push，未触发 Netlify 部署
- 严格按照 6 Phase 顺序逐步迁移，Phase 1 仅修改 2 个样式文件

**修改文件（仅 2 个）**：
- `src/styles/tokens.css` — 合并重写
- `src/styles/globals.css` — 合并重写

**未修改**：所有组件、页面、Hook、Store、Domain、Repository、Infrastructure、AI、Sync、PWA、app 目录、vite.config.ts、tailwind.config.js、index.html

---

#### tokens.css 合并详情

**替换的视觉 token（Layer 1 核心设计决策）**：

| 类别 | 旧值 | 新值 | 原因 |
|---|---|---|---|
| 主色 | `#FB6F92`（亮粉，高饱和） | `#C98B9E`（Dusty Rose，低饱和） | Layer 1 核心视觉决策 |
| 背景 | `#FFF8FA`（极浅粉白） | `#EEE9EF`（清冷紫灰）+ `#FDFAF9`（暖白） | 配合极光背景系统 |
| 文字 | `#2D2327` | `#3D3537` | 更柔和 |
| 语义色 | 高饱和版 | 低饱和柔和版 | 统一视觉气质 |
| 情绪等级色 | 彩虹色（红→绿） | 统一玫瑰色系（深→浅） | Layer 1 核心设计决策 |
| 模糊值 | 简单 blur | blur + saturate + brightness | 玻璃材质需要更强模糊 |
| 阴影 | 4 种 | 7 种（+xs/glass/float） | 玻璃专用阴影和漂浮元素阴影 |

**保留的业务语义色（变量名和语义完全保留，代码无需修改）**：
- `--color-type-class` / `personal` / `rest` / `other`（日程类型色，值同步为新低饱和版，与对应语义色保持一致）
- `--color-text-on-primary`
- `--color-border` / `--color-border-focus`（基于新主色调整）
- `--color-surface-hover`

**新增的 token 类别**：
1. 辅助色：`--color-accent-lavender` / `sage` / `warm-gray`
2. 玻璃材质基础：`--glass-bg` / `glass-bg-strong` / `glass-bg-subtle` / `glass-border` / `glass-border-strong` / `glass-specular`
3. 玻璃材质增强（五层结构）：`--glass-surface-light`（表面光线）/ `--glass-edge-inner`（边缘厚度）/ `--glass-bottom-reflect`（底部反光）/ `--glass-svg-filter` / `--dew-svg-filter`
4. 内容层：`--surface-content-border`
5. 背景材质系统（5 种）：`--bg-material-original-soft` / `mist` / `frosted` / `liquid` / `dew`
6. Lifeform 统一 token：`--lifeform-core-highlight` / `core-glow` / `membrane-edge` / `bloom-glow`
7. Motion Tokens：`--duration-fast/normal/slow/slower` + `--ease-standard/emphasized/exit/spring-soft`
8. 圆角扩展：`--radius-2xl`

---

#### globals.css 合并详情

**@layer base**：
- 保留 LifeOS 基础样式，微调
- body 背景渐变保留作为 Phase 1 fallback（BackgroundSystem 在 Phase 3 迁移），颜色值更新为新 token
- 新增 `overflow-x: hidden`
- 滚动条宽度：6px → 4px（更细更精致）

**@layer components（新增）**：
1. `.glass` 五层增强版（替换旧版简单玻璃）：底色 + 模糊 + `::before` 表面光线 + `::after` 底部反光 + 边缘厚度 + 内容自动在光线层之上
2. `.glass-strong` / `.glass-subtle`（新增）
3. `.glass-hover`（保留 LifeOS 悬停效果）
4. `.surface-soft` / `.divider-soft` / `.scrim-card`（新增）
5. 背景材质类（5 种，Phase 3 BackgroundSystem 迁移后生效）
6. `.liquid-drift-1/2` / `.glass-sheen`（新增）
7. Text Protection：`[data-bg="image"] h1` + `.text-shield`（新增，Phase 3 后生效）

**@layer utilities（动画系统扩展）**：
- 保留 LifeOS 4 个基础动画，工具类更新为使用 Motion Tokens
- 新增动画：breathe / glow-pulse / lifeform-bloom / shimmer / core-pulse / glass-sheen-move / liquid-drift-1/2 / ring-fade
- 新增交错延迟：`.stagger-1` ~ `.stagger-6`
- 新增 Safe Area：`.pb-safe` / `.pt-safe`

**无障碍**：
- 新增 `@media (prefers-reduced-motion: reduce)`

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过，无错误
- ✅ `npm run build` 成功（8.70s，2489 modules，CSS 31.29 kB / gzip 6.69 kB）
- ✅ dev 服务器运行正常（HTTP 200，局域网 http://10.15.23.93:5173）
- ✅ 构建产物 CSS 验证：主色 Dusty Rose #C98B9E、玻璃材质五层 token、业务语义色保留、`.glass:before` / `.glass:after` 存在（CSS 压缩为单冒号）
- ✅ 未使用的类被 Tailwind purge 移除（正常行为，后续 Phase 迁移组件使用时自动包含）

---

#### 业务语义色调整说明

日程类型色（`--color-type-class` / `personal` / `rest` / `other`）的值从高饱和版同步为新低饱和版，这是**有意识的视觉值调整，不是误覆盖**：

- 设计原则：日程类型色始终与对应语义色保持一致（class=主色、personal=info、rest=success、other=tertiary）
- 当语义色整体从高饱和版变为低饱和版时，日程类型色同步更新
- 变量名和语义完全保留，代码中引用这些变量的地方不需要任何修改
- 业务语义和功能依赖未被破坏

---

#### 下一步

Phase 2：共享组件（低风险，组件级替换）
- 逐个替换 `shared/ui` 组件：GlassButton / GlassInput / SegmentedControl / StatusBadge / EmptyState / SectionHeader / Modal / BottomSheet
- 新增：CleanCard / ProgressRing / MoodTrendChart
- 保留：TabBar（Phase 3 再替换）、GlassCard（与 CleanCard 共存）、Progress（与 ProgressRing 共存）

---

## [v6.0.5] — 2026-08-30

### 开发阶段调整 + Bug 修复经验总结

**开发阶段调整**：
- 暂停 Netlify / Supabase 云端功能配置与部署
- 现有功能冻结，进入第一版 UI 与本地验收阶段
- 等待用户提供 UI/UX 优化方案
- 建立"本地验证优先"开发流程，禁止频繁生产部署

**近几次 Bug 修复的可复用经验总结**：

#### 1. 启动卡住/白屏排查公式

**适用场景**：App 启动时白屏、永远停留在 loading/启动界面、React 不挂载。

**四步排查法**：
1. **最小 React Mount Test**：完全绕过业务模块，只渲染 `<div>Test</div>`，验证 React 本身能不能挂载
2. **ErrorBoundary 一次性捕获**：如果最小测试成功，添加 ErrorBoundary 包裹整个 App，页面上直接显示错误信息和组件栈
3. **检查模块加载时的同步异常**：如果 ErrorBoundary 也没捕获，检查是否有模块在顶层调用可能抛异常的函数（如 `createClient('')`）
4. **验证修复**：本地 tsc + build + preview + 手机局域网测试

**关键认知**：
- React ErrorBoundary **无法捕获模块加载时的同步异常**
- 模块加载异常会导致整个应用崩溃，表现为永远显示 index.html 内联的启动界面
- 常见元凶：Supabase `createClient('')` 空 URL、第三方 SDK 初始化缺少参数、模块顶层访问 `window`/`document`

#### 2. 二分定位法

遇到复杂问题时：
1. **最小化测试**：先验证最基础的功能是否正常
2. **逐层恢复**：基础功能正常后，逐层添加业务模块，每加一层测试一次
3. **一次性捕获**：或者用 ErrorBoundary 等工具一次性捕获异常
4. **定位根因后再修复**：不要在没有定位根因的情况下盲目修改
5. **修复后真实环境验证**：不只是类型检查通过

#### 3. 本地验证优先（开发流程铁律）

**禁止每次小修改都 push 触发生产部署。**

标准流程：
```
修改代码 → tsc检查 → build → preview/局域网测试 → 确认 → commit → 等用户确认 → push部署
```

**局域网测试方法**：
```bash
npm run dev -- --host
# 手机和电脑连同一 Wi-Fi，访问 http://电脑IP:5173
```

**生产部署需用户明确确认**。

**原因**：
- 频繁生产部署会导致 Service Worker 缓存混乱
- 用户端版本不一致，调试困难
- PWA 调试期间，每次部署都可能让已安装的 PWA 进入不确定状态
- 局域网测试足够验证大多数功能，不消耗部署额度

#### 4. 外部服务初始化安全降级

- 环境变量未配置 / 服务不可用时，必须返回 null 或 mock 对象
- **绝对不能在模块顶层调用可能抛异常的函数**
- `console.warn` 不是错误处理：检查到问题后只警告但继续执行危险操作，等于没有检查
- 本地正常 ≠ 生产正常：本地 `.env` 配置了，但生产环境（Netlify/Vercel）可能没配置

**文档更新**：
- PROJECT_RULES.md：新增 11.5 启动卡住/白屏排查公式、11.6 二分定位法、11.7 本地验证优先
- PROJECT_PLAN.md：记录开发阶段调整，进入第一版 UI 与本地验收阶段
- CHANGELOG.md：记录本次经验总结

---

## [v6.0.4] — 2026-08-30

### Bug 修复 — Supabase 未配置时应用启动崩溃

**问题现象**：
- Netlify 部署后，iPhone Safari 打开应用永远停留在启动界面
- Edge 控制台报错：`Supabase 环境变量未配置，云同步功能将不可用`
- 随后出现：`Uncaught Error: supabaseUrl is required.`
- 整个应用崩溃，无法进入主界面

**根本原因**：
`src/shared/lib/supabase.ts` 中虽然检查了环境变量是否为空，但只是 `console.warn`，仍然继续调用 `createClient('', '')`。

```typescript
// 修复前（有问题）
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 环境变量未配置...')  // 只是警告
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {...})
// ↑ 这里会抛出 'supabaseUrl is required' 错误
```

- `createClient` 不接受空 URL，会在模块加载时抛出同步异常
- 因为 `supabase.ts` 被 `auth/store.ts` 和 `CloudRepository.ts` 导入，模块加载失败导致整个应用崩溃
- 本地开发时 `.env` 配置了环境变量，所以本地正常；Netlify 上未配置，所以生产环境崩溃
- **这就是 iPhone Safari 永远停留在启动界面的真正根因！** 不是 PWA 问题，不是 Service Worker 问题，是 Supabase 初始化崩溃。

**修复方案**：

| 文件 | 修改 |
|---|---|
| `src/shared/lib/supabase.ts` | 环境变量未配置时，`supabase` 导出为 `null`，不调用 `createClient`；新增 `isSupabaseConfigured` 标志 |
| `src/features/auth/store.ts` | 所有方法检查 `isSupabaseConfigured`，未配置时返回安全默认值（未登录状态、登录失败提示），不阻塞应用启动 |
| `src/features/sync/CloudRepository.ts` | 所有方法检查 `isSupabaseConfigured`，未配置时返回空数组或静默跳过，不抛异常 |

**关键修复点**：
```typescript
// 修复后（安全）
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {...})
  : null  // 未配置时为 null，不崩溃
```

**验证结果**：
- 类型检查通过
- 生产构建成功（9.04 秒）
- PWA 预缓存 17 个条目（745.70 KiB）
- 本地预览服务器正常运行（HTTP 200）
- 未配置 Supabase 时，应用以本地模式正常启动，云同步功能禁用
- 云同步逻辑未改动，配置环境变量后仍正常工作

**经验教训**：
1. **外部服务初始化必须有安全降级**：不能假设环境变量永远存在，未配置时必须返回 null 或 mock 对象，不能抛异常
2. **模块加载时的同步异常是致命的**：在模块顶层调用可能抛异常的函数，会导致整个模块加载失败，进而导致整个应用崩溃
3. **本地正常 ≠ 生产正常**：本地 `.env` 配置了环境变量，但 Netlify 上可能没配置，必须在两种环境下都测试
4. **console.warn 不是错误处理**：检查到问题后只警告但继续执行，等于没有检查，必须真正阻止危险操作
5. **ErrorBoundary 无法捕获模块加载异常**：React ErrorBoundary 只能捕获组件渲染时的异常，无法捕获模块加载时的同步异常
6. **白屏/启动卡住首先检查模块加载异常**：而不是先怀疑 PWA、Service Worker、IndexedDB

---

## [v6.0.3] — 2026-08-30

### Bug 修复 — PWA 启动卡住 / 永远停留在启动界面

**问题现象**：
- iPhone 添加到主屏幕后，再次打开一直停留在粉色启动界面
- 可以看到 index.html 中的内联 App Shell，但永远不进入 App
- 桌面浏览器正常，iPhone Safari 直接访问可能正常，standalone 模式异常

**真正根因**：
`main.tsx` 中 `registerSW()` 在 `ReactDOM.createRoot().render()` **之前同步调用**。

```typescript
// 修复前（有问题）
registerSW({ ... })  // ← 如果这里抛异常，后面的 React 挂载永远不会执行
ReactDOM.createRoot(...).render(...)
```

- `registerSW` 内部访问 `navigator.serviceWorker` 等 API
- iPhone Safari standalone 模式下可能存在 API 差异或限制
- 一旦 `registerSW` 抛出同步异常，后面的 `ReactDOM.createRoot().render()` 永远不会执行
- React 不挂载，`<div id="root">` 中的内联 App Shell 永远不会被替换
- 表现为：永远停留在启动界面

**为什么桌面端正常**：
- 桌面 Chrome/Edge 的 Service Worker API 完全兼容，`registerSW` 不会抛异常
- 所以 React 能正常挂载，问题只在 iPhone standalone 模式下出现

**修复方案**：

| 文件 | 修改 |
|---|---|
| `main.tsx` | 1. React 挂载**优先**，`registerSW` 放在后面<br>2. `registerSW` 改为**动态 import + try-catch**，绝对不阻塞 React 挂载<br>3. 添加完整 BOOT 诊断日志（0-4 步）<br>4. React 挂载失败时显示兜底错误页面，不白屏 |
| `AppInitializer.tsx` | 1. 添加完整启动诊断日志，每一步记录时间<br>2. 每个 `loadAll` 单独 catch，一个失败不影响其他<br>3. 6 秒初始化超时 + 8 秒安全兜底定时器，**双重保护**<br>4. 8 秒云端同步超时<br>5. loading 页面显示当前启动阶段<br>6. 错误页面增加"继续使用"按钮，不强制刷新 |

**关键修复点**：
```typescript
// 修复后（安全）
try {
  ReactDOM.createRoot(...).render(...)  // ← React 先挂载
} catch (err) {
  // 显示兜底错误页面
}

// 后注册 Service Worker，动态 import + try-catch
import('virtual:pwa-register').then(({ registerSW }) => {
  registerSW({ ... })
}).catch((err) => {
  console.warn('SW 注册失败（不影响使用）:', err)
})
```

**验证结果**：
- 类型检查通过
- 构建成功（8.54 秒）
- PWA 预缓存 17 个条目（744.98 KiB）
- 云同步逻辑未改动，仍正常工作
- 任何情况下都不会永久停留在启动界面

**经验教训**：
1. **第三方初始化绝对不能放在 React 挂载之前**：任何可能抛异常的同步调用，都必须放在 React 挂载之后
2. **动态导入是隔离风险的好方法**：`import().then().catch()` 可以确保模块加载失败不影响主线程
3. **桌面正常 ≠ 移动端正常**：Service Worker、IndexedDB、localStorage 在 standalone 模式下可能有差异
4. **内联 App Shell 是双刃剑**：它能避免白屏，但如果 React 不挂载，用户会永远看到 App Shell，误以为在加载
5. **双重超时保护**：Promise.race 超时 + 安全兜底定时器，确保即使 Promise.race 有问题，也能强制进入 App
6. **启动诊断日志至关重要**：在关键节点加 console.log，远程排查问题时唯一的线索就是日志

---

## [v6.0.2] — 2026-08-30

### Bug 修复 — PWA 白屏与自动更新

**问题现象**：
1. iPhone 添加到主屏幕后，再次打开出现长时间白屏
2. PWA 部署新版本后，主屏幕 App 无法自动获取更新，需要删除重新添加

**白屏根因**：
1. `index.html` 只有 `<div id="root"></div>`，JS 加载前完全空白
2. Service Worker 缺少 `cleanupOutdatedCaches`，旧版本缓存可能导致新 JS 文件 404
3. 未手动注册 Service Worker，更新机制依赖自动注入，不可控
4. `AppInitializer` 无超时保护，极端情况（IndexedDB 慢/网络慢）可能永久 loading

**自动更新根因**：
1. 缺少 `cleanupOutdatedCaches`，旧缓存不会被自动清理
2. 缺少 `navigateFallback`，PWA 启动时路由可能失败
3. 未手动注册 `registerSW`，无法监听更新事件

**修复方案**：
| 文件 | 修改 |
|---|---|
| `index.html` | 添加内联 App Shell 加载界面（粉色心形动画），JS 加载前显示，避免白屏 |
| `vite.config.ts` | 添加 `cleanupOutdatedCaches: true` 和 `navigateFallback: '/'` |
| `main.tsx` | 手动注册 `registerSW`，处理 `onNeedRefresh`/`onOfflineReady`/`onRegisterError` |
| `vite-env.d.ts` | 添加 `vite-plugin-pwa/client` 类型声明 |
| `AppInitializer.tsx` | 增加 8 秒初始化超时 + 10 秒云端同步超时，超时降级 |

**超时降级策略**：
- 本地数据加载超过 8 秒 → 使用空数据进入 App，不阻塞
- 云端同步超过 10 秒 → 放弃同步，继续使用本地数据
- 云端同步失败 → 静默降级，不影响本地使用
- 任何情况下都不会永久白屏或永久 loading

**Service Worker 更新机制**：
- `skipWaiting()` + `clientsClaim()`：新 SW 下载后立即激活，不等待下次启动
- `cleanupOutdatedCaches()`：激活后自动清理旧版本缓存
- `registerType: 'autoUpdate'`：自动检测并下载新版本
- 下次启动时使用新版本，当前会话不中断

**验证结果**：
- 类型检查通过
- 构建成功
- 生成的 `sw.js` 包含：`skipWaiting`、`clientsClaim`、`cleanupOutdatedCaches`、`NavigationRoute`
- 云同步逻辑未改动，仍正常工作
- 预缓存 16 个资源（741.72 KiB）

**经验教训**：
1. PWA 必须有内联 App Shell，不能依赖 JS 渲染第一个像素
2. Service Worker 缓存是双刃剑：必须配置 `cleanupOutdatedCaches`，否则旧缓存会导致新代码 404
3. 手动注册 Service Worker 比自动注入更可控，可以监听更新事件
4. 任何异步初始化都必须有超时保护，不能假设外部依赖（IndexedDB/网络）永远快速
5. 云端同步必须是"后台、非阻塞、失败静默降级"，绝对不能影响首屏渲染
6. PWA 更新测试必须在真实设备上验证，模拟器/浏览器不能完全复现主屏幕 App 的行为

---

## [v6.0.1] — 2026-08-30

### Bug 修复 — 云端同步失败

**问题现象**：手机端登录后看不到电脑端创建的数据，云端同步不生效。

**根本原因**：
- Supabase RLS（行级安全）INSERT 策略要求 `user_id = auth.uid()`
- `CloudRepository.upsert` 推送数据时没有设置 `user_id` 字段
- 导致新记录插入被 RLS 策略拒绝，同步静默失败（没有明显报错）

**修复方案**：
1. `CloudRepository.upsert`/`upsertMany`：自动获取当前登录用户 ID，添加到记录中
2. `SyncService`：新增 `pushAll()` 全量推送方法，修复之前推送失败的数据
3. `Sync Store`：新增 `pushAll()` 和 `syncAll()` 方法
4. 设置页面 + SyncStatusBadge：手动同步现在同时执行**拉取 + 推送**

**经验教训（解决问题公式）**：
1. **外部服务集成时，先检查权限模型**：Supabase RLS / 其他后端权限策略要求哪些字段？
2. **静默失败要警惕**：推送失败没有明显报错，需要检查网络请求和响应
3. **双向同步要同时验证**：只测拉取不测推送，会漏掉一半问题
4. **全量同步作为兜底**：当增量同步可能丢失数据时，提供全量推送/拉取功能
5. **字段映射要完整**：本地 camelCase → 云端 snake_case 映射时，不要遗漏权限相关字段

---

## [v6.0] — 2026-08-30

### Phase 8.1 — 数据分析与趋势

- ✅ 数据分析模块架构：types / AnalyticsService / store / hooks
- ✅ 情绪趋势计算：近 7 天 / 30 天 / 90 天，平均 / 最高 / 最低 / 连续记录天数 / 最常见情绪
- ✅ Todo 完成率统计：每日完成情况 / 总体完成率 / 逾期统计 / 最佳完成日
- ✅ 周期统计：平均周期长度 / 经期长度 / 最短最长周期 / 规律程度判断（标准差≤3天为规律）
- ✅ 数据洞察生成：基于数据自动生成积极 / 警告 / 信息类洞察（连续记录达成、情绪良好、逾期待办、周期规律等）
- ✅ 图表组件：BarChart（柱状图）/ LineChart（折线图）/ ProgressRing（进度环）/ StatCard（统计卡片），纯 SVG 实现，不依赖图表库
- ✅ 数据分析页面：时间范围选择器（7/30/90天）、数据概览卡片、情绪趋势图、待办完成率（进度环+柱状图）、周期统计、数据洞察
- ✅ 导航更新：More 页面添加数据分析入口
- ✅ 所有计算均为纯函数，不依赖 React/DOM，未来可迁移到 iOS
- ✅ 类型检查通过，构建成功

### 新增文件

- `src/features/analytics/types.ts` - 数据分析类型定义
- `src/features/analytics/AnalyticsService.ts` - 数据分析服务（纯函数）
- `src/features/analytics/store.ts` - 数据分析状态管理
- `src/features/analytics/hooks/useAnalytics.ts` - 数据分析 Hook
- `src/features/analytics/components/BarChart.tsx` - 柱状图组件
- `src/features/analytics/components/LineChart.tsx` - 折线图组件
- `src/features/analytics/components/ProgressRing.tsx` - 进度环组件
- `src/features/analytics/components/StatCard.tsx` - 统计卡片组件
- `src/pages/AnalyticsPage.tsx` - 数据分析页面

### 备注

- Netlify 访问控制：当前为个人使用，Project visibility 设置为 Public，无需密码。未来如果需要分享给朋友测试，再考虑设置密码保护或访问控制。

---

## [v5.0] — 2026-08-30

### Phase 6.5 — 同步功能完善

- ✅ 推送队列持久化：使用 localStorage 保存待推送变更，刷新页面后不丢失
- ✅ Today 页面同步状态指示器：SyncStatusBadge 组件，显示同步中/已同步/离线/错误状态
- ✅ 同步冲突处理：最后修改胜出（基于 updatedAt 比较）
- ✅ 错误日志：console.error 记录同步错误

### Phase 7.1 — 通知提醒系统

- ✅ Notification 模块架构：types / NotificationService / store / hooks
- ✅ 浏览器通知权限管理：请求权限、检查权限状态
- ✅ 通知调度器：自动监听 Todo 和 Schedule 数据变化，调度提醒
- ✅ Todo 截止提醒：可配置提前提醒时间（5/10/15/30/60 分钟）
- ✅ 课程/日程开始提醒：可配置提前提醒时间（5/10/15/30 分钟）
- ✅ App 内提醒中心：通知列表、未读标记、全部已读、清除、筛选
- ✅ 浮动通知按钮：右上角铃铛图标 + 未读数量徽章
- ✅ 设置页面通知设置：全局开关、浏览器权限、提前时间、声音/振动
- ✅ 通知持久化：localStorage 保存最近 100 条通知
- ✅ 类型检查通过，构建成功

### 新增文件

- `src/features/notification/types.ts` - 通知类型定义
- `src/features/notification/NotificationService.ts` - 通知服务
- `src/features/notification/store.ts` - 通知状态管理
- `src/features/notification/hooks/useNotification.ts` - 通知 Hook
- `src/features/notification/hooks/useNotificationScheduler.ts` - 通知调度器
- `src/features/notification/components/NotificationCenter.tsx` - 通知中心组件
- `src/features/sync/components/SyncStatusBadge.tsx` - 同步状态徽章组件

---

## [v4.1] — 2026-08-30

### Phase 6.4 — 离线模式优化 + 联网自动同步

- ✅ 离线检测：使用 `navigator.onLine` + `online`/`offline` 事件实时监测网络状态
- ✅ 离线时累积推送队列：断网时数据变更保存在内存队列，不尝试执行，避免网络错误
- ✅ 联网后自动同步：网络恢复后自动处理推送队列 + 延迟 2 秒全量拉取云端数据
- ✅ 网络错误重试：推送失败时如果是网络错误，重新放回队列下次重试；非网络错误（权限/数据格式）不重试
- ✅ Sync Store 添加 `isOnline` 状态 + `initNetworkListener` 方法
- ✅ AppInitializer 应用启动时初始化网络监听器
- ✅ 设置页面显示离线状态，离线时禁用同步按钮并提示"离线模式，变更将在联网后自动同步"
- ✅ 类型检查通过，构建成功

### 同步策略总结

| 场景 | 行为 |
|---|---|
| 在线 + 已登录 | 本地变更立即异步推送，登录时全量拉取 |
| 离线 + 已登录 | 本地变更累积在队列，不推送；联网后自动推送 + 拉取 |
| 在线 + 未登录 | 本地变更不推送，队列清空；下次登录全量拉取修复 |
| 推送网络错误 | 重新放回队列，下次重试 |
| 推送非网络错误 | 不重试，下次登录全量拉取修复 |

---

## [v4.0] — 2026-08-30

### Phase 6.1 — Supabase 项目 + 数据库

- ✅ 创建 Supabase 项目 `personal-life-os`（项目 ID: `ryurxondlokpgkmcqfxs`，区域: ap-southeast-2）
- ✅ 4 张数据库表：`todos` / `schedule_events` / `mood_records` / `period_records`
- ✅ RLS 行级安全策略：每表 4 条（SELECT/INSERT/UPDATE/DELETE），用户只能访问自己的数据
- ✅ 索引：每表 7 个索引（user_id/due_date/completed/priority/created_at/updated_at/deleted_at）
- ✅ `updated_at` 自动更新触发器
- ✅ API URL + publishable key 配置到 `.env`（已 gitignore）
- ✅ SQL 迁移文件：`supabase/migrations/001_init_schema.sql`

### Phase 6.2 — Auth 账号系统

- ✅ 安装 `@supabase/supabase-js`
- ✅ Supabase 客户端：`src/shared/lib/supabase.ts`
- ✅ Auth 模块：`types.ts` / `store.ts`（Zustand）/ `hooks/useAuth.ts` / `components/LoginForm.tsx`
- ✅ 登录/注册页面：`src/pages/LoginPage.tsx`（全中文界面）
- ✅ Session 持久化管理（localStorage）
- ✅ 设置页面云同步状态显示（登录/退出登录）
- ✅ 注册测试账号：`liu1259097788@qq.com`（已通过 SQL 手动验证邮箱）

### Phase 6.3 — Sync Layer 同步层

- ✅ CloudRepository：Supabase 数据访问封装 + 字段名映射（camelCase ↔ snake_case）
- ✅ SyncService：本地优先 + 异步推送 + 登录全量拉取 + 最后修改胜出冲突策略
- ✅ Sync Store：同步状态管理（Zustand）
- ✅ 4 个 Repository 改造：Todo/Schedule/Mood/Cycle 数据变更后异步推送云端
- ✅ AppInitializer 改造：登录后后台异步拉取云端数据，不阻塞 UI
- ✅ 设置页面：同步状态显示（上次同步时间）+ 手动同步按钮
- ✅ 软删除支持：云端删除设置 `deleted_at`，本地物理删除
- ✅ 类型检查通过，构建成功

### 架构决策

| 决策 | 理由 |
|---|---|
| 本地优先，云端同步 | 离线可用，隐私数据默认本地；云端只做同步备份 |
| 异步推送，不阻塞 UI | 用户操作立即响应，推送在后台执行 |
| 登录全量拉取 | 简单可靠，避免复杂的增量同步逻辑 |
| 最后修改胜出 | 基于 `updatedAt` 比较，实现简单，适合个人使用场景 |
| 手机为主写入端，电脑为查看端 | 用户使用场景：手机记录数据，电脑查看数据 |

### 修复的问题

| 问题 | 原因 | 处理 |
|---|---|---|
| 登录成功后没有重定向到首页 | LoginForm 缺少导航逻辑 | 添加 `useNavigate`，登录成功后跳转 `/today` |
| Supabase 免费版邮件验证收不到 | 免费版邮件发送有延迟/被拦截 | 通过 SQL 手动设置 `email_confirmed_at` |

---

## [v3.3] — 2026-08-30

### 部署上线

- ✅ GitHub 私有仓库创建：`ting-png1/personal-life-os`
- ✅ Netlify 部署完成，在线地址：https://astounding-torrone-5409bc.netlify.app/
- ✅ SPA 路由配置：添加 `public/_redirects` 文件，所有路径重定向到 index.html
- ✅ Git 工作流建立：push 到 master 自动触发 Netlify 重新部署

### 文档体系整理

- ✅ 建立三文档体系：PROJECT_PLAN（当前状态）+ PROJECT_RULES（开发规则）+ CHANGELOG（历史变更）
- ✅ 将原 PROJECT_PLAN 中的开发规范迁移到 PROJECT_RULES.md
- ✅ 将原 PROJECT_PLAN 中的修订日志迁移到 CHANGELOG.md
- ✅ 精简 PROJECT_PLAN，聚焦当前状态总览

### 修复的问题

| 问题 | 原因 | 处理 |
|---|---|---|
| SPA 直接访问 /today 等子路径返回 404 | Netlify 默认不处理 SPA 路由 | 添加 `_redirects` 文件 |
| Netlify 站点名称 personal-life-os 被占用 | 该名称已被其他用户注册 | 使用自动生成名称，可后续绑定自定义域名 |
| GitHub 创建仓库时可见性下拉无法展开 | GitHub 新版 UI 交互问题 | 先创建 Public，再在 Settings 改为 Private |

---

## [v3.2] — 2026-08-30

### V1 — AI 智能建议模块完成

- ✅ AI 数据模型：AIRecommendation / AISuggestion / AISettings / AIDailyUsage
- ✅ AIService 服务层：构建 prompt（聚合今日状态）、调用 DeepSeek Chat API、解析 JSON 响应、错误处理、重试机制
- ✅ AI Store + Hook：useAIStore + useAI（暴露 generate/dismiss/confirm/canGenerate/remaining）
- ✅ AI UI 组件：AIRecommendationCard（5 种状态：未配置/加载中/错误/次数耗尽/有内容）
- ✅ Settings 页面 AI 配置：API Key 密码输入、每日调用上限（3/5/10 快捷选项）、使用次数显示
- ✅ Today 页面整合：AI 建议卡片位于周期卡片之后、日程之前
- ✅ 构建验证：tsc + build 通过（JS 394KB / gzip 122KB）

### 关键设计决策

- AI 只产生建议，不直接修改业务数据；用户确认后仅标记状态
- AI 设置（API Key、每日上限）存 localStorage，不存 IndexedDB
- 纯前端直连 DeepSeek API（个人使用，Key 暴露风险可接受），不搭后端代理
- 用户可手动设置每日调用次数上限（默认 3 次/天，可设 1-20）

### 修复的问题

| 问题 | 原因 | 处理 |
|---|---|---|
| ScheduleInstance 没有 startTime/endTime | 使用 startDateTime/endDateTime（完整 ISO） | 用 `.slice(11, 16)` 提取 HH:mm |
| TodayPage 缺少 useNavigate | AI 卡片"去配置"需要跳转 | 增加 useNavigate 导入和声明 |
| store 中参数未使用 | MVP 确认建议仅标记整体状态 | 参数名加下划线前缀 |

---

## [v3.1] — 2026-08-30

### V1 — Cycle 生理周期模块完成

- ✅ Cycle 数据模型：PeriodRecord（经期记录）+ 输入类型
- ✅ Dexie 数据库新增 `period_records` 表（DB version 2）
- ✅ CycleCalculator 纯函数：20+ 纯函数（预测下次经期、排卵日、可孕窗口、周期阶段、是否推迟、平均周期/经期长度）
- ✅ Cycle Store + Hook：useCycleStore + useCycle（暴露 currentCycleState/cycleStats）
- ✅ Cycle UI 组件：CycleStatusCard（状态卡片）、PeriodForm（记录经期 BottomSheet）、CycleHistoryList（历史列表）
- ✅ 整合到 Wellness + Today：Wellness 顶层"情绪/周期"切换；Today 增加周期状态卡片
- ✅ 构建验证：tsc + build 通过

### 关键设计决策

- 周期预测全部由纯函数从 PeriodRecord 历史派生，不存库
- 不做医疗诊断，数据不足时提示"记录更多周期后可预测"
- 不做医疗建议，只做状态展示和日期预测

### 修复的问题

| 问题 | 原因 | 处理 |
|---|---|---|
| SegmentedControl 不支持空值/取消 | 经量是可选字段 | 改用自定义切换按钮（再次点击可取消） |
| StatusBadge 不支持自定义颜色 | 周期阶段颜色动态 | StatusBadge 已支持 `color` prop |
| CurrentCycleState 缺少 recordCount | 需要判断是否有记录 | 增加 `recordCount: number` 字段 |
| DB version 1 已存在 | 新增表需要版本迁移 | 使用 version(2) 新增表 |

---

## [v3.0] — 2026-08-30

### MVP 全部完成（17/17 任务）

#### Phase 0：项目初始化（5 项）

- ✅ Vite + React + TypeScript 初始化（strict 模式，`@/` 别名）
- ✅ Tailwind CSS + Pink Mist Glass 设计 Token
- ✅ 核心依赖安装：zustand / dexie / date-fns / react-router / lucide-react
- ✅ PWA 配置：manifest + autoUpdate Service Worker + 5 个图标（含 maskable）
- ✅ 目录结构创建：19 个目录，五层架构对应

#### Phase 1：数据层 + Design System（6 项）

- ✅ Domain 类型定义：Todo / ScheduleEvent / MoodRecord + 输入类型 + RecurrenceRule
- ✅ Dexie 数据库：3 张表 + 索引 + 版本化
- ✅ Repository 层：3 个 Repository 接口 + Dexie 实现
- ✅ 通用工具函数：date.ts / id.ts / constants.ts
- ✅ Design System 组件第一批：GlassCard / GlassButton / GlassInput / SectionHeader / StatusBadge / EmptyState / Progress
- ✅ Design System 组件第二批：TabBar / BottomSheet / Modal / SegmentedControl

#### Phase 2：业务模块（4 项）

- ✅ Todo 模块：store / hooks / services / repository / components / TodoPage
- ✅ Schedule 模块：store / hooks / ScheduleExpander / repository / components / SchedulePage
- ✅ Mood 模块：store / hooks / services / repository / components / WellnessPage
- ✅ Today 聚合模块：TodayAggregator / useToday / components / TodayPage

#### Phase 3：集成与打磨（5 项）

- ✅ 路由与全局布局：React Router + TabBar + AppLayout
- ✅ App 启动数据加载：并行 loadAll + Loading 屏 + 错误处理
- ✅ More / Settings / About 页面 + JSON 数据导出备份
- ✅ 跨模块集成测试与 Bug 修复
- ✅ 最终打磨与 PWA 验收

### 架构决策（ADR 摘要）

| 编号 | 决策 | 理由 |
|---|---|---|
| ADR-001 | 使用 Vite 而非 Next.js | PWA + 本地优先 + SPA，Vite 更匹配 |
| ADR-002 | 本地优先，IndexedDB(Dexie) 为主存储 | 离线可用，隐私数据默认本地 |
| ADR-003 | 不使用 EventBus | 模块少、联动清晰，直接调用更可维护 |
| ADR-004 | TodayState 为派生 ViewModel，不存库 | 避免数据冗余和不一致 |
| ADR-005 | AI 必须走 Edge Function 代理（未来） | 保护 API Key |
| ADR-006 | AI 建议用户确认后才执行 | AI 不可信，用户保留控制权 |
| ADR-007 | Zustand 而非 Redux | 轻量（1KB），个人项目足够 |
| ADR-008 | Mood/Cycle/Health 合并为 Wellness 页面 | 减少底部 Tab |
| ADR-009 | MVP 不接 Supabase/AI | 控制范围，快速验证核心闭环 |
| ADR-010 | ScheduleEvent 用 recurrence 字段 | 统一事件模型，避免两张表 |
| ADR-011 | 全量加载到内存 | MVP 数据量小，简化代码 |
| ADR-012 | 添加/编辑用 BottomSheet | 减少导航层级，移动端体验好 |
| ADR-013 | 不使用重型组件库 | 与玻璃拟态风格冲突 |
| ADR-014 | recurrence 预留 weekRange/excludedDates/overrides | 大学课程有单双周/调课/临时取消 |

### 修复的问题（Phase 0）

| 问题 | 原因 | 处理 |
|---|---|---|
| vite.config.ts 中 `__dirname` 不可用 | ESM 模式下未定义 | 改用 `fileURLToPath(new URL('./src', import.meta.url))` |
| `path` 模块类型缺失 | tsconfig.node.json 未包含 node 类型 | 安装 @types/node，添加 types 配置 |
| src 目录不存在导致 Write 失败 | 目录需先创建 | 先创建目录再写文件 |
| npm install 超 15s 自动转后台 | sharp 包较大 | 等待后台任务完成 |

---

## [v2.0] — 架构设计阶段

### 第二轮架构修订（基于用户反馈）

- ✅ 技术栈确认：Vite / React / TypeScript / PWA / Zustand / Dexie.js
- ✅ MVP 范围确认：Today / Schedule / Todo / Mood 四模块
- ✅ TodayState 派生化确认：不持久化，TodayAggregator 纯函数计算
- ✅ 五层架构命名统一：UI → Hook/Store → Domain → Repository → Infrastructure
- ✅ ScheduleEvent 字段重命名：startTime/endTime → startDateTime/endDateTime
- ✅ Todo 新增 completedAt 字段：统计"今天完成"不被编辑操作污染
- ✅ ScheduleEvent 新增 recurrence 字段：支持大学课程周期性
- ✅ recurrence 预留扩展字段：weekRange / excludedDates / overrides（单双周/调课/临时取消）
- ✅ 用户可见文字统一中文（硬性要求）

### 第一轮架构设计

- ✅ 整体架构设计：五层分层架构
- ✅ 模块划分：Today / Schedule / Todo / Mood / Cycle / Health / AI / Notification
- ✅ TodayState 设计：聚合状态 / ViewModel
- ✅ 数据存储策略：本地 IndexedDB 为主，未来 Supabase 同步
- ✅ PWA 设计：manifest / Service Worker / offline cache / install
- ✅ Design System：Pink Mist Glass（粉白 / 浅玫瑰 / 半透明玻璃 / 磨砂）
- ✅ 未来 iOS 迁移策略：可复用层 vs 必须重写层

---

## [v1.0] — 项目启动

### 项目定位确立

- ✅ 项目名称：Personal Life OS / 个人生活状态管理与智能规划 App
- ✅ 核心理念："根据我今天真实的状态，帮助我理解和安排今天"
- ✅ 目标用户：个人使用，Windows 开发 + 浏览器运行 + PWA + 手机添加到主屏幕
- ✅ 未来方向：iOS 原生化 / HealthKit / Apple Watch 深度联动（当前不开发）
- ✅ 项目路径：`D:\personal_Lifeos_project`

---

*变更日志随项目开发持续更新。每个重要版本发布时追加新条目。*
