# Personal Life OS — 变更日志

> **定位**：项目历史变更记录。只记录已经实际发生的重要变更。描述"项目是怎么一步一步变成现在这样的"。
> **与 PROJECT_PLAN 的关系**：PROJECT_PLAN 描述"现在是什么样"，本文档描述"过去发生了什么"。
> **格式**：按版本倒序排列，最新版本在最上方。

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
