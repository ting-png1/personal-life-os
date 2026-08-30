# Personal Life OS — 变更日志

> **定位**：项目历史变更记录。只记录已经实际发生的重要变更。描述"项目是怎么一步一步变成现在这样的"。
> **与 PROJECT_PLAN 的关系**：PROJECT_PLAN 描述"现在是什么样"，本文档描述"过去发生了什么"。
> **格式**：按版本倒序排列，最新版本在最上方。

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
