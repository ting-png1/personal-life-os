# Personal Life OS — 变更日志

> **定位**：项目历史变更记录。只记录已经实际发生的重要变更。描述"项目是怎么一步一步变成现在这样的"。
> **与 PROJECT_PLAN 的关系**：PROJECT_PLAN 描述"现在是什么样"，本文档描述"过去发生了什么"。
> **格式**：按版本倒序排列，最新版本在最上方。

---

## [Layer 2 Candidate] — 2026-09-02

### 冻结决策与正式迁移

- Product Owner 已完成 Material Lab iPhone A/B：Glass A、Stagger、Static Background 胜出；Glass B / Glass C、View Transition、CSS Dynamic Background、Canvas 2D 全部淘汰。
- 将 Glass A 从独立 Material Lab 迁移到正式共享 token 与 `.glass` / `.glass-strong`：145° 透明白渐变、`blur(12px) saturate(145%)`、58% 白色边缘、克制表面高光及对应外阴影/顶部内高光。
- 正式组件保留既有圆角、布局和信息结构；`.glass-strong` 同样使用 Glass A，不吸收 Glass C 的高饱和或更强 blur。
- 为控制 iPhone Safari 合成成本，普通内容层、Scrim Card、`.glass-subtle` 及 Modal/BottomSheet 的全屏 backdrop 不创建额外 backdrop-filter；Modal/BottomSheet 面板各自只承担一层 Glass A blur。
- Stagger 视觉节奏与代码参数保持不变；BackgroundSystem 与 Static Pink Mist 架构保持不变。未引入 View Transition、动态背景、新渲染路线或第三方依赖。
- 五个正式页面、AppLayout、BackgroundSystem、业务逻辑、数据模型、Dexie、Sync、Analytics、Notification 均未修改。

### Evidence / 状态

- **L1**：`npm run typecheck` 通过；Vite production build 成功（仅保留既有的大 chunk 警告）。
- **L3**：390×844 浏览器回归覆盖五页导航、无横向溢出、Stagger 延迟、Background/BottomNav 持久挂载、Todo BottomSheet、共享删除 Modal 及单层 blur 边界；隔离测试数据已清理。
- **L4**：Material Lab 候选决策已通过 Product Owner iPhone 验收；本次正式迁移版本仍待定向真机复验。
- **L5**：未执行 Production 部署与验证。
- 当前状态为 **Layer 2 Candidate**，不等同于 Layer 2 Freeze，未进入 V1 Final。

## [Stability Sprint — CLOSED / L4 PASSED] — 2026-09-02

### 正式收尾

- Product Owner 已在 iPhone 完成定向 L4 复验：重复 Todo `recurrenceEndDate`、普通/禁用 checkbox 可见度、Todo 表单重开回顶且不自动弹键盘，3 项全部通过。
- Stability Sprint 至此正式关闭，暂停新增功能开发；不自动进入 Analytics、Notification、Sync、Layer 2 或其他阶段。
- 后续仅登记两项、不在本次修复：页面切换时背景粉色光晕约零点几秒渲染延迟（observation）；Todo 列表直接显示重复起止日期/截止日期小型标注（product backlog）。

### 第一批：数据正确性

- Todo legacy 数据在 Repository 读取边界补齐 `category`、`recurrence`、`completedDates` 默认值；采用读取时 normalization，不批量改写 IndexedDB，不引入 Dexie migration。
- 新增统一日期边界工具，区分 date-only、本地日期时间和 UTC instant；Cycle、Today、Wellness、Schedule 的已确认日期偏移路径改用本地日历语义。
- Schedule recurrence 表单拆分生效起止日期；Week/Day 管理视图可显示已取消实例并恢复默认；Repository 与 UI 共用 Domain 校验，拒绝无效范围和结束时间不晚于开始时间的 override。

### 第二批：真实功能回归

- BottomSheet 恢复 legacy `height="large"` 的 85vh 高度语义，并保留 `auto`、`medium` 和自定义 className 兼容路径。
- 设置页“导出所有数据”和“清空所有数据”纳入 `periodRecords`，修复 Cycle 数据遗漏；导出文件名使用本地日期。
- Today 增加跨本地午夜刷新和页面重新可见时的日期校正；显式历史日期不启动午夜计时器。

### 第三批：Todo 日期语义拆分

- 非重复 Todo 继续使用可选 `dueDate`；重复 Todo 新增独立 `recurrenceStartDate`，新建和显式编辑时两字段保持互斥。
- 不修改 Dexie schema/version，不批量写回旧记录。旧重复任务按正式起点 → legacy `dueDate` → 本地 `createdAt` 日期进行运行时兼容；`createdAt` 不写回，也不在表单中冒充已确认起点。
- 编辑旧重复任务时显示兼容来源提示并要求确认真实起点；保存后只规范化当前记录。
- Todo 总列表在非发生日禁用重复任务复选框，Store 通过 Domain 判断再次拦截，避免生成无效 `completedDates`；既有完成历史保持不变。
- 修复 TodayPage 编辑 Todo 实际调用 create、产生副本的问题，编辑现在调用 update。

### 第三批 L4 反馈修复

- 重复 Todo 增加可选 `recurrenceEndDate`：空值表示无限重复，有值时只在含首含尾的起止范围内生成发生日；结束日期早于起点时拒绝保存。
- 该字段不是 Dexie 索引；旧记录读取时规范化为 null，不批量写回，不修改 Dexie schema/version。
- Todo 未完成 checkbox 使用明确的 2px 粉色轮廓，禁用状态使用较浅但仍清晰可见的粉色；修复全局 button reset 将边宽覆盖为 0 的实际级联问题。
- Todo 新建/编辑 BottomSheet 每次打开时将表单滚动容器复位到顶部；移除标题字段的自动聚焦，不主动弹出 iOS 键盘。

### Scope Lock

- Todo 日期语义已按 Product Owner 决策拆分；不引入 Todo Series / Instance，不修改 Dexie schema/version。
- Sync Stabilization 独立立项。现有 Supabase 同步不得作为生产数据保障；本轮不重构 schema、DTO、tombstone、冲突或离线队列。
- Analytics / Notification 等待 Todo / Schedule instance 语义稳定后再处理。

### Evidence

- **L1**：`npm run typecheck` 通过；Vite production build 成功（仅保留既有的大 chunk 警告）。
- **L2**：Node 内置测试运行 10 个 suite / 26 个 test，全部通过。
- **L3**：除既有兼容与编辑链路外，新增验证重复终点含首含尾、空终点无限、非法范围拒绝保存、普通/禁用 checkbox 2px 可见轮廓、表单重开回顶且不自动聚焦；全部通过，隔离测试数据已清理。
- **L4**：第一至第三批及反馈修复均获 Product Owner iPhone 真机通过；Stability Sprint 最终状态为 **L4 PASSED**。
- **L5**：未执行 Production 部署与验证。

### 文档协议校正

- AGENT_PROTOCOL.md 升级至 v1.1，Evidence Levels 统一为 L0-L5：L0 代码推断 → L1 tsc/build → L2 自动测试 → L3 浏览器 → L4 真机 → L5 Production。
- Stability Sprint 实现 commit `9f6c83e` 已 push 到 `origin/feature/ui-migration-layer1`；收尾文档随当前提交推送。未 merge master、未创建 PR、未操作 Netlify。

---

## [v7.7.3] — 2026-09-01

### 文档体系扩展：AGENT_PROTOCOL.md + CHATGPT_HANDOFF.md

**背景**：LifeOS 当前采用三方协作模式（人类 Product Owner、ChatGPT 架构审查层、豆包 Implementation Agent），但协作规则只存在于 ChatGPT 窗口的上下文中，没有正式写入项目。本次将协作协议正式文档化。

---

#### 新增文档

**AGENT_PROTOCOL.md**（三方协作协议 v1.0）：
- 三个角色及职责边界：人类 Product Owner（决策+真机验收）、ChatGPT（架构审查+流程审查+明确指令）、豆包（实现+本地验证+文档+commit）
- 开发闭环：User → ChatGPT → Doubao → Evidence → ChatGPT Review → User Validation
- 核心原则：Product Audit First / Scope Lock / Change Surface / Evidence Levels（初版 L1-L6，已于 Stability Sprint 校正为 L0-L5）/ 发现问题≠必须立即修复 / 需要升级给用户的事项 / Deterministic First AI Second / 共享组件修改必须回归 / 数据模型长期风险
- 流程审查（ChatGPT 专属）：必须审查开发流程本身，不只是代码；流程问题信号；执行提示词原则（明确、有限、可验证）
- 长期原则：每完成一个功能后检查是否暴露新的产品/架构/数据模型/Agent 工作流问题；流程问题更新 AGENT_PROTOCOL.md，不是只修当前代码

**CHATGPT_HANDOFF.md**（ChatGPT 接手快照）：
- 当前项目阶段、分支、真实完成状态
- 当前重要架构决策、已知技术边界/风险
- 当前正在处理的问题、最近一次重要开发结论
- 当前推荐的下一步、必须用户本人验收的事项
- Agent 协作协议版本、快速参考（项目路径/在线地址/GitHub/Supabase/局域网IP/真机设备等）
- 保持短小、可快速阅读（5分钟恢复上下文）

---

#### 更新文档

- PROJECT_PLAN.md：文档体系表格新增 AGENT_PROTOCOL.md 和 CHATGPT_HANDOFF.md
- **v7.7.3 文档同步（第二轮）**：
  - PROJECT_PLAN.md：版本更新至 v7.7.3；当前开发阶段更新；v7.7.2 渲染 artifact 状态从"待真机确认"改为"理论根因已修复，当前暂未复现，后续观察"；风险登记新增"iOS Safari 合成层 artifact（观察项）"；已修复问题记录新增 v7.7.2 最终根因和修复
  - CHATGPT_HANDOFF.md：版本更新至 v7.7.3；渲染 artifact 从"当前正在处理"移到"已知技术边界/风险"并降级为观察项；当前正在处理的问题只保留 Todo Today 展示模型；最近一次重要开发结论更新 Evidence Level；当前推荐的下一步更新；最近 commit 更新
  - Todo dueDate 语义混用继续保留为架构风险，暂不自行修改数据模型

---

#### 验证结果

- ✅ 不涉及业务代码修改
- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功

---

#### Git Commit

- `待提交` — docs: 新增 AGENT_PROTOCOL.md 和 CHATGPT_HANDOFF.md，扩展文档体系

---

## [v7.7.2] — 2026-09-01

### P0 修复：渲染 artifact 真正根因修复（BackgroundSystem）

**背景**：v7.7.1 的 BottomSheet 修复只能部分缓解"新建日程时屏幕中央竖线/晕影"问题。经过深入审计，确认真正根因不在 BottomSheet，而在 BackgroundSystem。

---

#### 真正根因

1. **BackgroundSystem 永久合成层**：容器有 `willChange: 'transform'`，为静态背景创建永久合成层。
2. **多个 blur 光晕**：内部有 6 个 `filter: blur(40-90px)` 光晕，计算密集。
3. **触发条件**：当 iOS 原生 date/time picker 出现时，viewport 高度变化触发页面重绘。
4. **artifact 产生**：背景层的永久合成层在重绘时产生 artifact（屏幕中央竖线/晕影）。
5. **位置证据**：BottomSheet 只占底部 75vh，artifact 出现在屏幕中央正好对应背景光晕的位置。
6. **之前修复的局限性**：v7.5.3-v7.7.1 的所有修复都集中在 BottomSheet（will-change / isolation / 减少半透明层），只能部分缓解，没有解决真正根因。

---

#### 修复内容

**BackgroundSystem.tsx**：
- 移除静态背景的 `willChange: 'transform'`
- 默认 mist 材质是完全静态的，不需要永久合成层
- 仅在 liquid 动画模式（有 drift 动画）时才启用 will-change
- 保留 `transform: translateZ(0)` 用于确保背景在独立层渲染

**globals.css**：
- 更新过时注释（仍在说 will-change: backdrop-filter 是当前方案）
- 记录完整根因分析和方案演进历史（v7.5.3 → v7.7.2）

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功（9.12s）
- ✅ 不影响 BottomSheet 或其他组件
- ✅ 背景视觉完全保留，仅改变合成层行为
- ✅ liquid 动画模式仍正常工作（有动画时才启用 will-change）
- ⏳ 需 iPhone 16 Pro / iOS 26.3 真机确认 artifact 是否消除

---

#### Git Commit

- `79ba88e` — fix(background): 渲染artifact真正根因修复 - 移除BackgroundSystem静态背景的will-change:transform

---

## [v7.7.1] — 2026-09-01

### P0 修复：BottomSheet Glass 渲染回归

**背景**：用户报告「新建日程」再次出现此前已修复的"细线 + 黑色晕影"问题，疑似与 v7.5.5 的 iOS Safari / BottomSheet / backdrop-filter rendering 问题属于同类回归。

---

#### 根因分析

1. **CSS 变量未定义**：项目中 `--blur-lg`、`--blur-content`、`--blur-sm` 全部未在 tokens.css 或 globals.css 中定义。因此 `glass-strong`、`surface-soft`、`glass-subtle` 的 `backdrop-filter` 实际 computed style 为 `none`。真正的玻璃效果来自半透明背景色 + `::before`/`::after` 伪元素高光/反射 + 多层阴影。

2. **will-change 适得其反**：v7.5.5 添加的 `will-change: backdrop-filter` 因 backdrop-filter 本身无效，仍会提示浏览器为 sheet 层创建独立合成层。在 iOS 原生 UIDatePicker 出现时，这个合成层需要重新采样，反而可能加剧渲染 artifact。

3. **半透明层叠加增加**：ScheduleForm V1.6 新增重复设置区域（`bg-primary-50/50` + 3个 GlassInput（surface-soft）+ 2个 SegmentedControl（glass-subtle）），sheet 层内半透明层从约 5 层增加到约 8 层。iOS Safari 在原生选择器出现时需要重新计算所有半透明层的合成，artifact 更明显。

---

#### 修复内容

**BottomSheet.tsx**（共享组件）：
- 移除 `willChange: 'backdrop-filter'`（因 backdrop-filter 无效，此属性无实际意义且创建不必要合成层）
- 添加 `isolation: 'isolate'`（创建独立合成上下文，确保 sheet 层内半透明元素在独立上下文中合成，减少对页面其他部分的影响）
- 更新顶部注释，记录完整技术边界和方案演进历史（v7.5.3→v7.5.4→v7.5.5→v7.7.1）

**ScheduleForm.tsx**：
- 重复设置区域背景从 `bg-primary-50/50` 改为 `bg-primary-50/80`（减少半透明层数，降低 iOS 合成复杂度）

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功（9.42s）
- ✅ 所有 BottomSheet 调用方（Todo/Schedule/Cycle/Mood 表单）共享同一组件，修改自动生效
- ✅ glass-strong 视觉完全保留，仅改变合成层行为
- ⏳ 需 iPhone 16 Pro / iOS 26.3 真机确认 artifact 是否消除

---

#### Git Commit

- `c1ea122` — fix(bottomsheet): Glass渲染回归修复 - 移除无效will-change，改用isolation隔离合成上下文

---

### P1 审计：Todo 时间语义与 Today 展示模型（待实现）

**当前问题**：
- `dueDate` 对非重复 Todo 是"截止日期"，对重复 Todo 是"锚定/开始日期"，语义混用
- Today 页面只显示 `dueDate === 今天` 的 Todo，逾期 Todo（dueDate < 今天且未完成）和即将到期 Todo（dueDate 在未来 1-3 天）完全不显示
- 首页更像"今日到期任务列表"，而非用户期望的"生活状态汇总/提醒清单"

**推荐模型**（不新增字段，不修改 Dexie schema）：

| 分类 | 规则 | UI 标签 |
|---|---|---|
| 今日必做 | 非重复未完成且 dueDate <= 今天（含逾期）+ 重复 Todo 今天有实例且未完成 | 今日必做 |
| 即将到期 | 非重复未完成且 dueDate 在（今天，今天+3天] | 即将到期 |
| 不显示 | 无截止日期的 Todo / dueDate > 今天+3天 | — |

**需新增 Domain 纯函数**：
- `getOverdueTodos(todos, date)` — 非重复未完成且 dueDate < date
- `getUpcomingTodos(todos, date, daysAhead)` — 非重复未完成且 dueDate 在 (date, date+daysAhead]

**TodayState 变更**：
- `todos.dueToday` 改为包含逾期 + 今日 + 重复今日
- `todos.upcoming` 新增字段
- Today UI 分"今日必做"和"即将到期"两个 section

**本轮不实现**，待用户确认后进入开发。

---

## [v7.7.0] — 2026-09-01

### V1 长线开发 — Todo 重复/周期性待办

**背景**：在 v7.6.0 完成 Schedule 重复规则和 Todo 分类后，继续实现 Todo 重复/周期性待办功能。

---

#### 数据模型

- `types.ts`：Todo 新增 `recurrence: 'none' | 'daily' | 'weekly'` 和 `completedDates: string[]` 字段
  - 重复 Todo 的完成状态按日期记录在 completedDates 中
  - 非重复 Todo 继续使用 completed/completedAt
  - TODO_RECURRENCE_LABELS 预设标签（不重复/每天/每周）

---

#### Domain 层（todoServices.ts 纯函数）

- 新增 `isTodoOnDate(todo, date)` — 判断 Todo 在指定日期是否有实例
  - none: dueDate === date
  - daily: 从 dueDate 开始每天都有
  - weekly: 每周的同一天（基于 dueDate 的星期几）
- 新增 `isTodoCompletedOnDate(todo, date)` — 判断 Todo 在指定日期是否完成
  - 非重复 Todo: completed && completedAt 日期匹配
  - 重复 Todo: completedDates 包含 date
- 新增 `expandTodosForDate(todos, date)` — 展开指定日期的 Todo 实例
- `filterDueToday` / `filterCompletedToday` 使用展开逻辑

---

#### Store（store.ts）

- `toggleComplete` 支持重复 Todo
  - 重复 Todo：完成/取消完成操作修改 completedDates 列表
  - 非重复 Todo：继续使用 completed/completedAt

---

#### UI 层

- `TodoForm.tsx`：新增重复设置（不重复/每天/每周），编辑模式正确回显，显示重复说明
- `TodoItem.tsx`：显示重复标记（Repeat 图标+文字），完成状态由 `isCompleted` prop 判断
- `TodoList.tsx`：新增 `date` prop，使用 isTodoCompletedOnDate 判断每个 Todo 的完成状态
- `TodoCheckList.tsx`（Today 页面）：新增 `date` prop，支持重复 Todo 的完成状态显示

---

#### 兼容性

- Dexie 表为 schema-less，新增字段无需 migration
- 已有数据 recurrence 为 'none'，completedDates 为 []，自动兼容
- TodayAggregator 自动使用新的 filterDueToday/filterCompletedToday
- Today 页面正确显示重复 Todo

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ 所有修改均在本地，未 push、未 deploy
- ⏳ iPhone 16 Pro / iOS 26.3 真机验收待用户确认

---

#### Git Commit

- `e46e417` — feat(todo): 重复/周期性待办 - 每天/每周重复 + 按日期记录完成状态

---

## [v7.6.0] — 2026-09-01

### V1 长线开发 — Schedule 重复规则增强 + overrides UI + Todo 分类

**背景**：进入 V1 长线开发模式，自主排优先级、开发、自测、回归。本轮完成 4 个功能模块，全部通过 tsc + build 验证。

---

#### 1. Schedule 重复规则增强（单双周/周范围/排除日期/调课覆盖）

**数据模型**：
- `types.ts`：RecurrenceRule 新增 `weekParity?: 'all' | 'odd' | 'even'` 字段（单双周），完善所有字段注释
- weekRange: [起始周, 结束周] — 课程只在这个周数范围内有效
- excludedDates: 排除的日期列表（放假/调课休课）
- overrides: 特定日期的覆盖（调课到其他时间/地点，或临时取消）

**Domain 层**（ScheduleExpander.ts 纯函数）：
- 新增 `getWeekNumber(date, startDate)` — 计算相对周数（以 startDate 所在周一为第1周）
- `isEventOnDate` 完整支持 weekParity / weekRange / excludedDates / overrides.cancelled
- `expandForDate` 应用 overrides 中的时间/地点覆盖
- 不依赖 React / DOM / Dexie，可单测可移植

**UI 层**（ScheduleForm.tsx）：
- 重复设置区域增强：单双周选择（每周/单周/双周）、周范围输入（第X周至第Y周）、排除日期管理（添加/删除）
- 编辑模式正确回显所有重复规则字段

**调用方**：TodayAggregator / useSchedule / DayView / WeekView 自动应用新规则（使用 expandEventsForDate）

---

#### 2. Schedule overrides UI — 临时取消/恢复默认

**ScheduleItem.tsx**：
- 新增 `onMoreClick` 菜单按钮（hover 显示，移动端 group-hover）
- 新增 `isCancelled` 状态：删除线 + "已取消"标签 + 半透明

**DayView.tsx / WeekView.tsx**：
- 传递 `onMoreClick` 和 `isCancelled` 判断（检查 event.recurrence.overrides[date].cancelled）

**SchedulePage.tsx**：
- 新增 `overrideTarget` 状态和课程调整 Modal
- 临时取消本节课：设置 overrides[date].cancelled = true
- 恢复本节课：删除 overrides[date]
- 仅影响指定日期的实例，不改变重复规则本身

---

#### 3. Schedule 调课时间/地点功能（overrides 完整支持）

**SchedulePage.tsx**：
- 课程调整菜单新增「调课时间/地点」入口
- 调课时间选择器 Modal：开始时间/结束时间/调课地点
- 保存后设置 overrides[date] = { startDateTime, endDateTime, location, cancelled: false }
- 已调课时显示「恢复默认」按钮，移除时间/地点覆盖
- 调课后实例自动应用新时间和地点（ScheduleExpander 已支持）

**overrides 功能完整**：临时取消 + 调课时间/地点 + 恢复默认

---

#### 4. Todo 分类/标签功能

**数据模型**（types.ts）：
- Todo 新增 `category: string | null` 字段
- `TODO_CATEGORIES` 预设分类（学习/生活/工作/其他）
- CreateTodoInput / UpdateTodoInput 支持 category

**Repository**（repository.ts）：create 方法保存 category 字段

**Domain 层**（todoServices.ts 纯函数）：
- 新增 `filterTodosByCategory(todos, category)` — 按分类筛选
- 新增 `getCategories(todos)` — 获取所有分类列表

**Hook**（useTodos.ts）：
- 新增 `categoryFilter` 参数，组合状态筛选+分类筛选+优先级排序
- 返回 `categories` 列表

**UI 层**：
- TodoForm.tsx：新增分类选择（未分类/学习/生活/工作/其他），编辑模式正确回显
- TodoItem.tsx：显示分类标签（主色浅色背景）
- TodoFilterBar.tsx：新增分类筛选标签（仅当存在分类时显示），与状态筛选组合
- TodoPage.tsx：新增 categoryFilter 状态

**数据库兼容性**：Dexie 表为 schema-less，新增字段无需 migration；已有数据 category 为 null（未分类），自动兼容。不修改数据库版本，不影响已有用户数据。

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过（4 次，每次修改后）
- ✅ `npm run build` 成功（4 次，每次修改后）
- ✅ 所有修改均在本地，未 push、未 deploy
- ⏳ iPhone 16 Pro / iOS 26.3 真机验收待用户确认

---

#### Git Commits

- `9c01ed7` — feat(schedule): 重复规则增强 - 单双周/周范围/排除日期/调课覆盖
- `514732d` — feat(schedule): 日程实例 overrides UI - 临时取消/恢复默认
- `d549ee5` — feat(schedule): 调课时间/地点功能 - overrides 完整支持
- `55d1a82` — feat(todo): 分类/标签功能 - 预设分类 + 分类筛选 + 分类标签显示

---

## [v7.5.5] — 2026-08-31

### BottomSheet glass 渲染方案重新设计 — 移除聚焦时降级，接受 iOS 技术边界

**背景**：v7.5.3/v7.5.4 为修复 Schedule 时间选择器竖线/晕影问题，采用了"聚焦时关闭 backdrop-filter"的降级方案。但用户明确指出该方案不可接受：
- 本质上是通过关闭 glass 效果来规避问题，而不是解决根因
- 普通输入聚焦时 glass 也消失，变成纯色背景
- 从"竖线/晕影"变成了"只剩半透明背景"

---

#### 深度技术审计结论

1. **普通输入聚焦时 glass 消失的根因**：是我们自己的代码导致的（`:focus-within` 降级规则主动关闭了 backdrop-filter），不是 iOS 系统行为。移除降级后，普通输入的 glass 保持正常。

2. **date/time 输入竖线/晕影的根因**：iOS Safari 的**合成层切换 artifact**。UIDatePicker 出现/消失时，backdrop-filter 的 GPU 合成层需要重新采样背景，期间出现临时渲染异常（持续数秒后自行消失）。这是系统级合成层切换问题，不是 Web 代码可以完全解决的。

3. **关键发现**：backdrop 层的 Tailwind `backdrop-blur-sm` 本身就是无效的（CSS 变量未完整定义，computed style 为 none），真正参与合成的只有 sheet 层的 `glass-strong`（`backdrop-filter: blur(28px)` + `::before` 高光 + `::after` 反射 + 多层阴影）。

---

#### 候选方案评估

| 方案 | 普通输入 glass | date/time 竖线/晕影 | 视觉破坏 | 结论 |
|---|---|---|---|---|
| A. 移除降级 + `will-change: backdrop-filter` | ✅ 保持 | 可能减少 | 无 | **采用** |
| B. 预渲染模糊背景层替代 backdrop-filter | ✅ 保持 | ✅ 完全避免 | 中（背景不随滚动变化） | 过度设计，暂不采用 |
| C. 接受技术边界，不做任何降级 | ✅ 保持 | ❌ 不解决 | 无 | 作为 A 的兜底 |
| D. date/time 聚焦时只移除伪元素/阴影 | ✅ 保持 | 可能减少 | 小 | 仍然是条件降级，用户不接受 |

---

#### 最终方案

**完全移除聚焦时的 backdrop-filter 降级，给 sheet 层添加 `will-change: backdrop-filter` 保持合成层稳定。**

1. **`src/shared/ui/BottomSheet.tsx`**：
   - 移除 `has-datetime-input` 相关的 useEffect 和类名逻辑
   - 移除 `containerRef`（不再需要）
   - 给 sheet 层添加内联样式 `willChange: 'backdrop-filter'`
   - 更新注释，明确记录 iOS 技术边界和已尝试方案

2. **`src/styles/globals.css`**：
   - 移除 `.bottomsheet-container.has-datetime-input:focus-within .glass-strong` 降级规则
   - 替换为技术边界说明文档

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ 浏览器 DOM/CSS 跨场景验证（4 个表单 × 多种输入类型）：
  - **Schedule**：标题 text / datetime-local x2 / 地点 text / 备注 textarea — 所有场景 `backdrop-filter: blur(28px)` 保持不变 ✅
  - **Todo**：标题 text / 截止日期 date / 备注 textarea — 所有场景保持 glass ✅
  - **Period**：开始日期 date / 结束日期 date / 备注 textarea — 所有场景保持 glass ✅
  - **Mood**：备注 textarea — 保持 glass ✅
- ✅ 所有场景下 `will-change: backdrop-filter` 已应用
- ⚠️ **需 iPhone 真机确认**：
  1. 普通输入聚焦唤起键盘时，glass 效果保持正常（不再消失）
  2. date/time 原生选择器出现/消失时，竖线/晕影是否减少（`will-change` 方案）
  3. 如果竖线/晕影仍然存在，接受为 iOS Safari 技术边界，不再做视觉降级

---

#### 经验教训

1. **不要用"关闭功能"来"修复"兼容性问题**：关闭 backdrop-filter 虽然能避免渲染 artifact，但也破坏了产品的核心视觉体验。应该先尝试从合成层优化角度解决，实在不行再明确记录技术边界。
2. **区分"我们的代码导致的问题"和"系统级限制"**：普通输入 glass 消失是我们自己的降级规则导致的，移除后立即恢复。date/time 竖线/晕影是 iOS 系统级合成层切换问题，Web 层面无法完全解决。
3. **`will-change` 是标准的合成层优化属性**：`will-change: backdrop-filter` 提示浏览器提前创建和保持合成层，可能减少切换时的 artifact。这比 `transform: translateZ(0)` 更精确（后者是通用的合成层强制，可能带来副作用）。
4. **技术边界需要明确记录**：如果确认是系统级限制无法解决，应该在代码注释和项目文档中明确记录，而不是用各种 hack 来"假装修复"。

---

## [v7.5.4] — 2026-08-31

### BottomSheet glass 降级回归修复 — 普通输入聚焦时 glass 背景消失

**背景**：v7.5.3 修复 Schedule 时间选择渲染异常时，添加了 `.bottomsheet-container:focus-within .glass-strong` 降级规则。但该规则太宽泛：**任何** BottomSheet 内有**任何**输入聚焦时都会触发降级，包括普通 text/textarea。iPhone 键盘唤起时 text input 获得焦点，导致 BottomSheet 的玻璃背景突然消失，变成大面积纯色背景。

---

#### 根因分析

1. **CSS 规则过于宽泛**：`:focus-within` 不区分输入类型，text/textarea/checkbox/datetime-local 聚焦都会触发降级。
2. **影响范围**：所有使用 BottomSheet 的表单（Schedule/Todo/Period/Mood）在键盘唤起时都会失去 glass 效果。
3. **Mood 表单受影响最明显**：MoodQuickRecord 只有 textarea，没有日期输入，完全不需要降级，但之前的规则导致它也降级了。

---

#### 修复方案

**精确降级：只有包含日期/时间输入的 BottomSheet 才在聚焦时降级。**

1. **BottomSheet.tsx**：挂载时检查子元素是否包含 `datetime-local`/`date`/`time` input，如果有则给 container 添加 `has-datetime-input` 类。
2. **globals.css**：规则改为 `.bottomsheet-container.has-datetime-input:focus-within .glass-strong`。
3. **效果**：
   - Schedule/Todo/Period（有日期输入）→ 添加类 → 聚焦时降级（本来就需要，避免原生选择器渲染冲突）
   - Mood（只有 textarea）→ 不添加类 → 聚焦时**不降级**，保持 glass 效果 ✅

---

#### 为什么不用 JavaScript focusin 事件监听？

在 Chrome 中测试发现，JS `.focus()` 在某些场景下**不触发 focusin 事件**（焦点锁定、元素已有焦点、modal 焦点管理等），导致降级不可靠。手动 `dispatchEvent(new FocusEvent('focusin'))` 能触发，但真实用户点击和 JS `.focus()` 行为不一致。CSS `:focus-within` 是浏览器原生支持，更可靠。

---

#### 为什么不用 `:has(input[type="datetime-local"]:focus)`？

Chrome 中 `:has()` 内部的 `:focus` 伪类在 JS `.focus()` 场景下不可靠（`element.matches(':focus')` 返回 false，即使元素是 `document.activeElement`）。

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ 浏览器 DOM/CSS 验证（4 个表单场景）：
  - Schedule：有 datetime-local → `has-datetime-input: true` → 聚焦时 `backdrop-filter: none` ✅
  - Todo：有 date → `has-datetime-input: true` → 聚焦时降级 ✅
  - Period：有 date x2 → `has-datetime-input: true` → 聚焦时降级 ✅
  - Mood：只有 textarea → `has-datetime-input: false` → 聚焦时 `backdrop-filter: blur(28px)`（**不降级，保持 glass**）✅
- ⚠️ **需 iPhone 真机确认**：普通输入聚焦时 glass 背景不再消失；日期时间输入时竖线/晕影仍不复发

---

#### 经验教训

1. **共享组件修改必须验证所有调用方**：BottomSheet 被 4 个表单使用，修改降级规则时必须逐个验证，不能只测 Schedule。
2. **`:focus-within` 不区分输入类型**：需要精确控制降级范围时，必须结合其他标记类（如 `has-datetime-input`），不能只靠 `:focus-within`。
3. **JS `.focus()` 不触发 focusin 是已知坑**：在 Chrome 中，焦点锁定、元素已有焦点、modal 焦点管理等场景下，`.focus()` 可能不触发 focusin 事件。CSS 方案比 JS 事件监听更可靠。
4. **降级范围要最小化**：为了修复一个渲染问题，不应该牺牲所有场景的视觉效果。精确标记需要降级的容器，其他场景保持原样。

---

## [v7.5.3] — 2026-08-31

### Schedule 时间选择渲染异常 — 精确定位与修复

**背景**：iPhone 16 Pro / iOS 26.3 真机，新建日程时选择开始时间后再选结束时间，屏幕中央出现竖向渲染 bug 的线，周围有浅黑色晕影，持续数秒后消失。之前尝试的 `transform: translateZ(0)` / `will-change: transform` 优化无效。

---

#### 精确定位过程

1. **第一层假设（错误）**：认为是 BottomSheet 的 backdrop 层（全屏 `backdrop-blur-sm`）与原生选择器冲突。
2. **关键发现**：在电脑浏览器中检查计算样式，发现 backdrop 层的 `backdrop-filter` 计算值为 `none`！
   - 原因：Tailwind 的 `backdrop-blur-sm` 类设置 `backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) ...`，依赖多个 CSS 变量，其中某个变量未完整定义，导致整个声明无效。
   - 结论：backdrop 层的 backdrop-filter 本来就是无效的，不是问题根源。
3. **第二层定位**：sheet 层的 `glass-strong`（`backdrop-filter: blur(28px) saturate(1.9) brightness(1.06)`）正常工作，且在屏幕底部。iOS 原生时间选择器从底部滑入时与 sheet 层重叠，backdrop-filter 对原生 UI 采样模糊时产生渲染 artifact（竖线/晕影），出现在屏幕中央。
4. **CSS 选择器问题**：最初尝试用 `:has(input[type="datetime-local"]:focus)` 选择器，但 Chrome 中 `:has()` 内部的 `:focus` 伪类不工作（`input.matches(':focus')` 返回 false，即使 input 是 `document.activeElement`）。
5. **最终方案**：改用 `:focus-within` 伪类（不依赖 `:focus`），当 BottomSheet 内有任何元素聚焦时，临时禁用 sheet 层的 `backdrop-filter`，改用纯半透明背景，并隐藏 `::before`/`::after` 伪元素光线层。

---

#### 修复内容

- `src/styles/globals.css` — 添加 `.bottomsheet-container:focus-within .glass-strong` 规则：
  - `backdrop-filter: none !important`
  - `background: rgba(255, 255, 255, 0.85) !important`
  - `::before` / `::after` 伪元素 `display: none !important`
- `src/shared/ui/BottomSheet.tsx` — 给根容器添加 `bottomsheet-container` 类，给 backdrop 添加 `bottomsheet-backdrop` 类；移除之前无效的 `transform: translateZ(0)` / `will-change: transform`；移除 React 状态监听方案（不可靠）

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ 电脑浏览器验证：datetime-local input 聚焦时，BottomSheet 内部 sheet 的 `backdrop-filter` 计算值为 `none`，背景色为 `rgba(255, 255, 255, 0.85)`
- ✅ 失去焦点后恢复正常 glass-strong 效果
- ⚠️ **需 iPhone 真机确认**：竖线/晕影是否消失

---

#### 经验教训

1. **不要假设 CSS 类生效**：Tailwind 的 `backdrop-blur-*` 类依赖多个 CSS 变量，某个变量未定义会导致整个 `backdrop-filter` 声明无效（计算值为 `none`）。必须用 `window.getComputedStyle()` 验证实际计算值。
2. **`:has()` 内部的 `:focus` 不可靠**：Chrome 中用 JS `.focus()` 聚焦的元素，`element.matches(':focus')` 可能返回 false。改用 `:focus-within` 更可靠。
3. **`document.querySelector()` 可能返回错误的元素**：页面上有多个 `.glass-strong` 元素（页面背景、卡片、BottomSheet），必须精确找到目标容器内部的元素。
4. **最小范围降级**：只在输入聚焦时临时禁用 sheet 层的 backdrop-filter，不破坏整个玻璃视觉系统。

---

## [v7.5.2] — 2026-08-31

### iPhone 真机 CRUD 回归问题修复

**背景**：iPhone 16 Pro / iOS 26.3 真机回归测试发现 5 个问题，逐一审计根因并修复。

---

#### 问题 1：Today 首页重复模块（已修复）

- **现象**：首页同时出现「今日日程」和「今日安排」，「今日待办」重复出现两次
- **根因**：UI Migration 后，`ScheduleList` 和 `TodoCheckList` 组件内部自带 `SectionHeader`（标题分别为「今日安排」/「今日待办」），而 `TodayPage` 又在外层包了一层 `SectionHeader`（「今日日程」/「今日待办」），导致每个模块显示两个标题
- **分类**：UI Migration 引入的重复接入
- **修复**：
  - `src/features/today/components/ScheduleList.tsx` — 移除内部 SectionHeader，只保留 GlassCard 内容
  - `src/features/today/components/TodoCheckList.tsx` — 移除内部 SectionHeader，只保留 GlassCard 内容
  - `src/pages/TodayPage.tsx` — 保留外层 SectionHeader（含「全部」链接），Todo 的「添加」按钮移到外层 SectionHeader action 中
- **验证**：Today 页面「今日日程」1 次、「今日安排」0 次、「今日待办」1 次

---

#### 问题 2：Cycle 缺少删除入口（已修复）

- **现象**：经期记录创建后找不到明显删除操作
- **根因**：CycleHistoryList 的删除按钮使用 `group-hover:opacity-100`，移动端触摸设备不可见；PeriodForm 编辑表单没有删除按钮
- **分类**：本体 UI Bug + 移动端入口缺失
- **修复**：
  - `src/features/cycle/components/PeriodForm.tsx` — 增加 `onDelete` prop，编辑模式下左下角显示「删除」按钮（与 ScheduleForm 一致的模式）
  - `src/pages/WellnessPage.tsx` — 传递 `onDelete` 回调（设置 cycleDeleteTarget + 关闭表单 + 触发删除确认弹窗）
- **验证**：点击周期记录 → 编辑表单 → 左下角「删除」按钮 → 确认弹窗 → 删除成功

---

#### 问题 3：Schedule 时间选择异常竖线/黑色晕影（已尝试修复，需真机确认）

- **现象**：iPhone 真机，新建日程时选择开始时间后再选结束时间，屏幕中央短暂出现竖向渲染 bug 的线，周围有浅黑色晕影，持续数秒后消失
- **根因分析**：BottomSheet 有**两层 backdrop-filter**（backdrop 的 `backdrop-blur-sm` + sheet 的 `glass-strong` 强模糊 + ::before/::after 伪元素 + 多层阴影）。当 Safari 原生时间选择器弹出/收起时，多层 backdrop-filter 与原生 UI 合成层交互，产生渲染 artifacts。这是 iOS Safari 上 backdrop-filter 的已知 bug 模式
- **分类**：Safari/iOS 特有渲染问题（电脑浏览器无法复现）
- **修复**：`src/shared/ui/BottomSheet.tsx` — 给 backdrop 和 sheet 添加 `transform: translateZ(0)` + `will-change: transform`，强制创建独立合成层，减少渲染冲突。不改变视觉效果
- **状态**：⚠️ 需要 iPhone 真机确认是否解决。如果仍存在，记录为已知 Safari 渲染限制，后续考虑降低 backdrop-filter 强度或改用纯半透明背景

---

#### 问题 4：Daily Mood 二次确认交互不一致（已修复）

- **现象**：Today 首页的「今日整体状态」已有第一次选择 → 第二次确认的交互，但「状态」Tab 中选择心情仍然是点击一次就直接保存
- **根因**：WellnessPage 中无记录时的 `MoodPicker` 直接绑定 `handleMoodQuickPick`（一次点击就调用 `createMood()`），与 TodayPage 的 MoodCard 二次确认逻辑不一致
- **分类**：交互不一致（同一数据在不同页面交互规则不同）
- **修复**：
  - `src/pages/WellnessPage.tsx` — 增加 `selectedMoodLevel` 本地状态，实现与 MoodCard 一致的二次确认逻辑：第一次点击只选中（显示「已选择：XX」+「重新选择」+「确认记录」），确认后才保存
  - 同时增加「清除今日记录」入口：已有记录时，在「再记一条」旁边显示「清除今日记录」按钮，点击后确认清除当天所有 Mood 记录
  - 增加 `clearTodayConfirm` 状态和清除确认弹窗
- **验证**：
  - 第一次点击心情 → 只选中，显示「确认记录今天的心情」+「已选择：不错」+「重新选择」+「确认记录」✅
  - 没有直接保存 ✅
  - 点击「确认记录」→ 保存成功 ✅
  - 「清除今日记录」→ 确认弹窗 → 全部清除 ✅
  - 与首页 MoodCard 交互一致 ✅

---

#### 问题 5：全局一致性审计（已修复）

审计发现同类问题：TodoForm 和 MoodQuickRecord 编辑表单没有删除按钮，与 ScheduleForm/PeriodForm 不一致。移动端用户进入编辑后无法删除。

- **修复**：
  - `src/features/todo/components/TodoForm.tsx` — 增加 `onDelete` prop，编辑模式下左下角显示「删除」按钮
  - `src/features/mood/components/MoodQuickRecord.tsx` — 增加 `onDelete` prop，编辑模式下左下角显示「删除」按钮
  - `src/pages/TodoPage.tsx` — 传递 `onDelete` 回调
  - `src/pages/TodayPage.tsx` — 传递 `onDelete` 回调
  - `src/pages/WellnessPage.tsx` — 传递 `onDelete` 回调
- **结果**：所有四个模块（Schedule、Cycle、Todo、Mood）的编辑表单现在都有删除按钮，移动端用户可以通过点击条目进入编辑后删除

---

#### 验证结果

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ Today 页面无重复 section
- ✅ WellnessPage Mood 二次确认交互正常（与首页一致）
- ✅ WellnessPage 清除今日记录功能正常
- ✅ Todo 编辑表单删除按钮正常显示
- ✅ Schedule 编辑表单删除按钮正常（之前已验证）
- ✅ 所有页面（today/schedule/todo/wellness/more）无横向 overflow
- ✅ 测试数据已清理
- ⚠️ Schedule 时间选择渲染异常：需 iPhone 真机确认
- 未 push、未 deploy

---

## [v7.5.1] — 2026-08-31

### V1 核心模块 CRUD 审计 + P0 Bug 修复

**审计背景**：
- V1 长线开发阶段，检查核心模块是否存在"UI 已完成但业务逻辑不完整、交互异常、数据未真正联动、CRUD 不完整"的问题
- 按 P0/P1/P2 分类，根因、影响范围、本体问题/UI问题/迁移问题

---

#### 审计发现的 P0 Bug（已修复）

**1. TodoItem 删除按钮不可见（P0）**

- **根因**：`TodoItem` 根 div 缺少 `group` class，导致删除按钮的 `group-hover:opacity-100` 不生效，按钮永远 `opacity-0`
- **影响**：用户无法看到和点击 Todo 删除按钮 → 无法删除待办
- **分类**：本体 UI Bug（非迁移问题）
- **修复**：`src/features/todo/components/TodoItem.tsx` — 根 div 添加 `group` class
- **验证**：hover 时删除按钮正常显示

**2. Schedule 删除功能完全无 UI 入口（P0）**

- **根因**：`SchedulePage` 有 `deleteTarget`、`handleDelete`、删除确认弹窗，但 `setDeleteTarget` 从未被设置为非 null 值（只有 `setDeleteTarget(null)`）。`ScheduleItem` 只有点击编辑，无删除按钮；`ScheduleForm` 也无删除按钮
- **影响**：用户无法删除日程 → 数据只能增不能删
- **分类**：本体业务逻辑 Bug（非迁移问题）
- **修复**：
  - `src/features/schedule/components/ScheduleForm.tsx` — 增加 `onDelete` prop，编辑模式下左下角显示"删除"按钮
  - `src/pages/SchedulePage.tsx` — 传递 `onDelete` 回调（设置 deleteTarget + 关闭表单 + 触发删除确认弹窗）
- **验证**：
  - 点击日程 → 编辑表单 → 左下角"删除"按钮 ✅
  - 点击删除 → 确认弹窗 ✅
  - 确认删除 → 日程被删除，页面显示"当天没有安排" ✅

---

#### 审计通过的模块

| 模块 | CRUD | 说明 |
|---|---|---|
| **Mood** | ✅ 完整 | V1.5 刚添加编辑功能；创建/读取/更新/删除全部可用 |
| **Cycle** | ✅ 完整 | 编辑/删除按钮正常；列表项有 `group` class；PeriodForm 支持编辑模式 |
| **Todo** | ✅ 完整（修复后） | 编辑入口：点击整个条目；删除按钮：修复 group 后可见 |
| **Schedule** | ✅ 完整（修复后） | 编辑入口：点击整个条目；删除按钮：修复后在编辑表单中 |
| **AI** | ✅ 无自动调用 | `useAI` 和 `AIRecommendationCard` 均无 useEffect；TodayPage 无 useEffect；AI 生成全部需用户主动点击"生成今日建议"，符合 Deterministic First 原则 |

---

#### 发现的全局性问题（暂缓，需设计决策）

**移动端触摸设备操作按钮不可见（P1，全局性）**

- **根因**：所有列表项（Todo、Mood、Schedule、Cycle）的编辑/删除按钮都使用 `group-hover:opacity-100`，在触摸设备（手机）上没有 hover 状态，按钮永远不可见
- **影响**：手机端用户无法看到编辑/删除按钮（虽然 Schedule/Todo 可以点击条目进入编辑后删除，但 Mood/Cycle 的删除入口在列表项 hover 按钮上）
- **分类**：全局性移动端 UX 问题（非单个模块 Bug）
- **暂缓原因**：解决方案需要设计决策（左滑删除？始终显示？点击进入编辑后删除？），不应擅自决定交互方案
- **建议**：后续统一设计移动端列表项操作交互，所有模块统一方案

---

#### 验证

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ Todo 删除按钮：hover 时正常显示
- ✅ Schedule 删除完整流程：创建 → 编辑 → 删除 → 确认 → 已删除
- ✅ AI 无自动调用（代码审计确认）
- ✅ 未修改数据模型、Repository、Store、数据库结构
- ✅ 未 push、未 deploy

---

## [v7.5.0] — 2026-08-31

### V1.5 — Mood 记录编辑功能

**背景**：
- Mood 系统之前只有创建和删除，缺失编辑功能
- 用户可能需要修改错误的记录（比如选错了心情等级）
- useMood hook 已有 update 方法，但没有 UI 入口

**修改文件**：
- `src/features/mood/components/MoodQuickRecord.tsx` — 增加 initialRecord prop，支持编辑模式（用 initialRecord 初始化 level/tags/note，标题改为"编辑心情"）
- `src/features/mood/components/MoodRecordItem.tsx` — 增加编辑按钮（Pencil 图标），与删除按钮并列
- `src/features/mood/components/MoodHistoryList.tsx` — 增加 onEdit prop，传递给 MoodRecordItem
- `src/pages/WellnessPage.tsx` — 增加 moodEditTarget 状态，handleMoodEdit 函数，区分创建/编辑提交

**实现细节**：
- 编辑模式：点击记录的编辑按钮 → 设置 moodEditTarget → 打开 MoodQuickRecord → 用 initialRecord 预填表单 → 修改后保存 → 调用 updateMood
- 创建模式：点击"+"或"再记一条" → moodEditTarget 为 null → 打开空表单 → 保存 → 调用 createMood
- 关闭表单时重置 moodEditTarget
- 编辑按钮和删除按钮在 hover 时显示（group-hover:opacity-100），保持界面整洁

**验证**：
- 点击编辑按钮 → BottomSheet 标题"编辑心情"，MoodPicker 预填原记录心情 ✅
- 修改心情（很好→平稳）→ 保存 → 记录列表更新为"平稳" ✅
- Daily Mood 摘要自动更新：平均 3.5（不错），波动 1 级 ✅
- 计算验证：(3+4)/2=3.5，众数并列取较高→不错，极差 4-3=1 ✅
- 375px 窄 viewport 测量：所有 section 无 overflow ✅
- tsc + build 通过
- 未修改数据模型、Repository、Store、数据库结构
- 未调用 AI，全部确定性程序逻辑
- 未 push、未 deploy

---

## [v7.4.0] — 2026-08-31

### V1.4 — Today 页面整合 Daily Mood 摘要

**背景**：
- Today 是整个 App 的核心页面，Schedule、Todo、Mood 都应该为 Today 服务
- V1.3 已完成 Daily Mood 聚合，但只在 Wellness 页面展示
- Today 页面需要能看到全天情绪整体状态，而不只是最新一条

**修改文件**：
- `src/features/today/types.ts` — TodayState.mood 增加 `daily: DailyMoodResult`
- `src/features/today/aggregator/TodayAggregator.ts` — 计算 dailyMood（buildDailyMood）
- `src/features/today/components/MoodCard.tsx` — props 增加 daily，已记录状态下展示 Daily Mood 摘要
- `src/pages/TodayPage.tsx` — 传递 daily={todayState.mood.daily}

**UI 效果**：
- Today 页面 MoodCard 已记录状态：
  - Lifeform（最新心情）
  - 心情标签
  - "今天已记录 X 次"
  - Daily Mood 摘要（如"今天 2 条记录，平均 4.5（很好），情绪波动 1 级"）
  - "再记一条"按钮
- 无记录时保持原有的 MoodPicker 二次确认交互

**验证**：
- 2 条记录（不错 4 + 很好 5）→ Today 页面显示"今天已记录 2 次" + "今天 2 条记录，平均 4.5（很好），情绪波动 1 级"
- 375px 窄 viewport 测量：所有 section 宽度 343px，无 overflow
- moodCard 高度 110px（增加一行摘要，合理）
- tsc + build 通过
- 未修改数据模型、Repository、Store、数据库结构
- 未调用 AI，全部确定性程序逻辑
- 未 push、未 deploy

---

## [v7.3.0] — 2026-08-31

### V1.2 — Mood Lifeform 提前接入 + V1.3 — Daily Mood 聚合（Domain 派生）

---

#### V1.2：Mood Lifeform 提前接入 Today + Wellness 页面

**背景**：
- 用户明确要求 Mood Lifeform 可以提前接入，不必等 Daily Mood 完成
- 先用最新 MoodRecord → Lifeform，验证视觉效果、页面空间、动画性能、状态切换
- 后续 Daily Mood 稳定后，再切换为 Daily Mood → Lifeform

**修改文件**：
- `src/features/today/components/MoodCard.tsx` — 已记录状态的小表情（56px）替换为 MoodLifeformB（72px，animate=true）
- `src/pages/WellnessPage.tsx` — 已记录状态的大表情（text-5xl）替换为 MoodLifeformB（96px，animate=true）

**说明**：
- Lifeform 用最新 MoodRecord.level 驱动
- animate=true 启用呼吸/脉动动画
- 空状态（无记录）保持原有的 MoodPicker 二次确认交互
- 未修改数据模型、Repository、Store、数据库结构

---

#### V1.3：Daily Mood 聚合（Domain 派生结果，不新增数据库表）

**审计结论（7 个问题）**：
1. **不需要持久化**：程序聚合结果可实时计算
2. **可 Domain 派生**：MoodRecord[] → DailyMoodResult，moodAggregator.ts 已有基础函数
3. **用户手动填写后置**：MVP 只做程序聚合，避免区分问题（后置到 V2）
4. **天然一致**：派生结果每次从最新 MoodRecord 计算，无缓存/失效/同步问题
5. **无多层重复存储**：MoodRecord 是唯一可信数据源，DailyMoodResult 是计算结果
6. **对 Supabase 无影响**：只同步 MoodRecord 表，Daily Mood 客户端实时计算
7. **无 migration 风险**：不新增表，Dexie version 不变，不影响已有用户数据

**新增**：
- `src/features/mood/services/moodAggregator.ts` — 新增 DailyMoodResult 类型 + buildDailyMood() 纯函数

**DailyMoodResult 字段**：
| 字段 | 说明 |
|---|---|
| date | 日期 |
| averageLevel | 简单算术平均（无数据时 null） |
| dominantLevel | 众数（并列时取较高等级，偏向积极解释） |
| roundedLevel | 平均值四舍五入后的等级 |
| moodRange | 极差（最高-最低） |
| eventCount | 当天记录数量 |
| timeCoverage | 覆盖的时段（仅统计，不用于判断充足性） |
| sufficiency | 数据充足性：unknown / single_record / sufficient |
| summary | 可解释的中文摘要 |

**数据充足性判断（稳健方案，不写死无依据规则）**：
- 0 条 → unknown（"今天还没有记录心情"）
- 1 条 → single_record（"今天只有 1 条记录（XX），数据较少，仅供参考"）
- ≥2 条 → sufficient（"今天 N 条记录，平均 X.X（XX），情绪波动 Y 级"）

**明确不实现的无依据规则**：
- ❌ "晚间权重更高"的时间加权平均
- ❌ "至少 2 条且覆盖 2 个时段才算数据充足"
- ❌ 任意权重假设

**修改**：
- `src/pages/WellnessPage.tsx` — 已记录状态下展示 Daily Mood 摘要（buildDailyMood 实时计算）

**验证**：
- 1 条记录 → 显示 single_record 提示："今天只有 1 条记录（不错），数据较少，仅供参考"
- 2 条记录（不错 4 + 很好 5）→ 显示 sufficient："今天 2 条记录，平均 4.5（很好），情绪波动 1 级"
- 计算验证：平均 (4+5)/2=4.5 ✅，众数并列取较高→很好 ✅，极差 5-4=1 ✅
- 375px 窄 viewport 测量：所有 section 宽度 343px，无 overflow
- tsc + build 通过
- 未修改数据模型、Repository、Store、数据库结构
- 未调用 AI，全部确定性程序逻辑
- 未 push、未 deploy

---

## [v7.1.0] — 2026-08-31

### V1.1 — Mood Event 时间序列 UI + Domain 聚合基础

**背景**：
- UI Migration Layer 1 完成，iPhone 16 Pro / iOS 26.3 真机验收通过
- 进入 LifeOS V1 长线开发，从 Mood 系统开始
- 遵循 Deterministic First, AI Second；不写死无依据的产品规则
- 现有 MoodRecord 已支持一天多条（date + createdAt），不需要新增数据模型

---

#### 新增：moodAggregator.ts（Domain 层纯函数）

**文件**：`src/features/mood/services/moodAggregator.ts`

**设计原则**：
- 纯函数，不依赖 React / DOM / Dexie，可单测可移植
- 只实现有明确依据的函数，不写死无依据的产品规则
- 简单平均是最稳健的基线，不引入任意权重假设

**实现的函数**：
| 函数 | 说明 | 依据 |
|---|---|---|
| `getTimeOfDay(createdAt)` | 时段分类（morning/afternoon/evening/night） | 通用时间划分，符合大多数人作息 |
| `getMoodsByDateSorted(records, date, order)` | 按时间排序（升序/降序） | 纯技术功能 |
| `getMoodCountByDate(records, date)` | 当天记录数量 | 纯技术功能 |
| `getMoodsByTimeOfDay(records, date)` | 按时段分组 | 基于 getTimeOfDay |
| `getSimpleAverageMood(records, date)` | 简单算术平均 | 最稳健、可解释的基线 |
| `getMoodRange(records, date)` | 极差（最高-最低） | 纯统计功能 |
| `getDominantMood(records, date)` | 众数（并列时取较高等级） | 纯统计功能，并列时偏向积极解释 |
| `roundMoodLevel(avg)` | 平均值四舍五入到整数等级 | 纯技术功能 |

**明确不实现的函数（无依据的产品假设）**：
- ❌ `getTimeWeightedAverage` — "晚间权重更高"无产品依据
- ❌ `hasSufficientData` — "至少2条且覆盖2时段算充足"无产品依据
- 这些规则属于产品语义决策，需要用户确认后再实现

---

#### 修改：TodayState.mood 增加 count

**文件**：
- `src/features/today/types.ts` — TodayState.mood 增加 `count: number`
- `src/features/today/aggregator/TodayAggregator.ts` — 计算 mood.count，导入从 moodServices 改为 moodAggregator

**说明**：count 表示当天情绪记录数量，用于 Today 页面展示"今天已记录 X 次"。

---

#### 修改：MoodCard 展示记录次数

**文件**：
- `src/features/today/components/MoodCard.tsx` — props 增加 count，已记录状态下显示"今天已记录 X 次"
- `src/pages/TodayPage.tsx` — 传递 count={todayState.mood.count}

**UI 效果**：
- 已记录时：表情 + 心情标签 + "今天已记录 X 次" + 标签 + "再记一条"
- 未记录时：保持原有的二次确认交互

---

#### 修改：Mood 页面时间线排序健壮性

**文件**：`src/features/mood/components/MoodHistoryList.tsx`

**修改**：同一天内的记录显式按 createdAt 降序排序，不依赖传入数组顺序。

**说明**：
- 历史记录保持降序（最新在前），符合用户习惯
- 不需要为了"时间线"强行改升序
- MoodRecordItem 已显示时间，"时间线展示"基本已实现

---

#### 验证

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功（dist 时间 20:02:07）
- ✅ Today 页面 Mood count 显示验证：创建记录后显示"今天已记录 1 次"
- ✅ Mood 页面时间线验证：记录按时间降序排列，显示时间
- ✅ 375px 窄 viewport DOM 测量：所有 section 宽度 343px（375-padding），无 overflow
- ✅ Mood 二次确认交互未受影响
- ✅ 未修改数据模型、Repository、Store、数据库结构
- ✅ 未调用 AI，全部确定性程序逻辑
- ✅ 未 push、未 deploy

---

#### 复用 vs 新增

| 类型 | 内容 |
|---|---|
| **复用现有能力** | MoodRecord 数据模型（已支持一天多条）、Repository/Store/Hook（已支持 CRUD）、useMood.todayRecords（已返回当天所有记录）、MoodHistoryList（已按日期分组）、MoodRecordItem（已显示时间） |
| **真正新增** | moodAggregator.ts（Domain 纯函数）、TodayState.mood.count（派生字段）、MoodCard count 展示 |

---

## [v6.5.5] — 2026-08-31

### 日期输入框最终布局修正 + PWA standalone 待验收标记

**背景**：
- 用户要求日期输入框不仅"不溢出"，还要与表单标题/内容区域左右边界视觉对齐
- 要求用 320/375/390px viewport 做实际 DOM 测量，报告父容器宽度、输入框宽度、左右边界、是否 overflow
- PWA/Safari UI 问题暂不修改配置，留待正式 HTTPS 部署后真机验证

---

#### 日期输入框最终布局修复

**问题**：
- date/datetime-local 输入框因浏览器默认 `appearance: auto` 渲染原生日期选择器 UI，在 Safari 中可能有用户代理默认最小宽度
- 视觉上可能看起来比普通输入框"长"，与标题区域边界不完全对齐

**根因**：
- `GlassInput` 的 input 缺少 `appearance: none`，浏览器（尤其 Safari）对 date/datetime-local 类型渲染原生 UI，可能带默认内边距/最小宽度
- 之前的修复（min-w-0 + max-w-full + box-border）解决了溢出问题，但未移除浏览器默认外观

**修复（共享层，不逐页面打补丁）**：
- `GlassInput` 的 input 添加 `appearance-none`（Tailwind 类，生成 `appearance: none` + `-webkit-appearance: none`）
- 移除所有浏览器默认输入框外观，确保 text/date/datetime-local/time/email/number 等所有输入类型在所有浏览器中外观一致
- 点击 input 仍然能正常打开日期选择器（input type 不变，只是移除了默认外观）
- 文件：`src/shared/ui/GlassInput.tsx`

**程序验证（浏览器实际 DOM 测量，非理论 CSS）**：

| Viewport | 父容器宽度 | 标签宽度 | 输入框宽度 | 左边界差 | 右边界差 | Overflow | 对齐 |
|---|---|---|---|---|---|---|---|
| 320px | 320px | 320px | 320px | 0.2px* | 0.2px* | 无 | ✅ |
| 375px | 375px | 375px | 375px | 0px | 0px | 无 | ✅ |
| 390px | 390px | 390px | 390px | 0.2px* | 0.2px* | 无 | ✅ |

*0.2px 为亚像素渲染误差，可忽略

- `appearance` 计算值：`none` ✅
- `webkitAppearance` 计算值：`none` ✅
- 所有 date/datetime-local 输入框与标签左右边界完全对齐
- 不影响其他 GlassInput 使用场景（文本输入等）
- 日程、待办、经期三个表单的日期输入框统一受益（共享层修复）

---

#### PWA standalone 待验收标记

**标记**：`PWA-STANDALONE-REAL-DEVICE-VERIFY`

**说明**：
- 当前开发服务器局域网 HTTP 环境不作为最终 PWA standalone 验收依据
- 后续使用正式 HTTPS 部署地址（Netlify），从 iPhone 16 Pro / iOS 26.3 的 Safari 添加到主屏幕
- 从主屏幕图标启动后，验证内部操作过程中是否出现 Safari 浏览器顶部/底部 UI
- 暂不修改 PWA 配置，保留现状

---

#### 验证

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ 320/375/390px 窄视口实际 DOM 测量通过
- ✅ appearance-none 已生效（计算值确认）
- ✅ PROJECT_PLAN.md 添加 PWA-STANDALONE-REAL-DEVICE-VERIFY 标记
- ✅ 未 push、未 deploy、未 merge master
- ⏳ iPhone 真机最终视觉验收（待用户确认）

---

## [v6.5.4] — 2026-08-31

### 根因审计阶段（用户要求真正的根因分析，不反复充当人工 QA）

**背景**：
- 用户 iPhone 验收发现日期输入框问题仍未解决到要求程度
- 用户要求从共享布局策略解决，不继续给单个页面增加 width 补丁
- 同时审计 PWA/Safari 浏览器 UI 问题
- 要求：代码审计 → 窄 viewport 程序验证 → build → 本地验证 → iPhone 真机最终验收

---

#### 问题 1：日期/时间输入框共同根因修复

**严重程度**：P1（多表单共同问题）

**问题表现**：
- 经期、待办、日程中开始/结束日期时间输入仍然过长
- 窄屏下视觉比例不美观
- 之前出现过重叠/超屏
- 多个表单的共同现象

**根因审计（真正的根因）**：
- `GlassInput` 外层 div 只有 `w-full`，**缺少 `min-w-0`**
- 在 grid 布局中，grid 子项默认 `min-width: auto`，不会收缩到比内容更小
- 即使内部 input 有 `min-w-0`，外层 div 作为 grid 子项仍会被 date input 的隐式最小宽度撑宽
- 这是多个表单（日程/经期/待办）的共同根因，不是单个页面问题
- 之前的修复只给 input 添加了 `min-w-0 max-w-full box-border`，但忽略了外层 div 作为 grid 子项的 `min-width: auto` 行为

**修复方案（共享层，不逐页面打补丁）**：
- `GlassInput` 外层 div 添加 `min-w-0`
- `GlassTextarea` 外层 div 同步添加 `min-w-0`
- 共享层修复，所有使用 GlassInput 的表单自动受益

**程序验证（浏览器实际 DOM 测量，非理论 CSS）**：
- 375px 窄视口单列布局：input 宽度 375px，glassRootWidth 375px，无 overflow ✅
- 两列布局（模拟 sm 断点）：284px + 284px，gap 12px，不重叠，无 overflow ✅
- `document.documentElement.scrollWidth` <= `clientWidth` ✅
- `input.getBoundingClientRect().right` <= 父容器 right ✅
- 不影响其他 GlassInput 使用场景（文本输入等）✅

**文件**：`src/shared/ui/GlassInput.tsx`（1 file changed, 2 insertions, 2 deletions）

---

#### 问题 2：PWA / Safari 浏览器 UI 问题根因判断

**问题表现**：
- 以前网页 App 添加到 iPhone 主屏幕后，从主屏幕图标进入 App，内部操作不会出现 Safari 浏览器 UI
- 现在 LifeOS 添加到主屏幕后，内部操作过程中会出现 Safari 的浏览器界面

**审计过程**：

1. **排除迁移回归（B）**：
   - `git diff c6c7395..HEAD -- vite.config.ts index.html`
   - 结果：**完全无变化**
   - UI Migration 前后 PWA 配置一致 → 排除迁移回归

2. **排除配置缺失（D）**：
   - `vite.config.ts`：display: 'standalone'、start_url: '/'、scope: '/'、theme_color、background_color、registerType: 'autoUpdate' ✅
   - `index.html`：apple-mobile-web-app-capable: yes、apple-mobile-web-app-status-bar-style、apple-mobile-web-app-title、viewport-fit=cover ✅
   - 配置正确 → 排除配置缺失/错误

3. **排除应用内部链接导致跳出**：
   - 无 `target="_blank"`、无 `href="http"`、无 `window.open`、无 `location.href`
   - 使用 React Router（NavLink/Link/useNavigate）客户端路由
   - 应用内部不会导致跳出 standalone 模式

4. **最可能根因：C（当前测试方式导致的 Safari 普通网页行为）**：
   - 关键证据：`vite.config.ts` 中 `devOptions.enabled: false` → **开发环境不注册 Service Worker**
   - 用户通过 `npm run dev -- --host` 启动开发服务器，访问局域网 HTTP 地址
   - PWA standalone 模式需要：HTTPS（或 localhost）+ 已注册 Service Worker + 有效 manifest
   - 局域网 HTTP 地址不满足 HTTPS 条件，开发环境不注册 Service Worker
   - 因此，从主屏幕图标启动时不是真正的 standalone 模式，而是 Safari 普通网页模式
   - 在普通网页模式下，内部操作可能触发 Safari 浏览器 UI 显示

**结论**：
- 这是**测试方式问题**，不是 LifeOS 本体问题，也不是迁移回归
- PWA 功能需要在生产构建（`npm run build` + `npm run preview`）或 HTTPS 正式部署下测试
- 开发环境（`npm run dev`）不支持 PWA/Service Worker
- **需要真机确认**：在 Netlify HTTPS 正式部署下，从主屏幕图标启动是否正常（之前用户反馈是正常的）

---

#### 验证流程改进（记录为项目规则）

以后类似 UI/布局问题遵循：
1. 代码审计 → 找到共同根因
2. 窄 viewport 程序验证（浏览器实际 DOM 测量：scrollWidth、clientWidth、getBoundingClientRect）
3. tsc + build
4. 本地运行验证
5. 再让用户做 iPhone 真机最终视觉验收

**禁止**：tsc 通过 + build 通过 → 直接让用户验证是否正常。build 通过不能证明移动端布局正确。

---

#### 验证

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ 浏览器实际 DOM 测量验证（375px 窄视口 + 两列布局）
- ✅ Git commit：`a21f0bf`
- ✅ 未 push、未 deploy、未 merge master
- ⏳ PWA 问题需真机确认（Netlify HTTPS 正式部署下是否正常）

---

## [v6.5.3] — 2026-08-31

### 验收后修正阶段（iPhone 真机再次验收发现的问题）

**背景**：
- Phase 6 Bug Fix 后，用户完成 iPhone 真机再次验收
- 发现 2 个 P0/P1 问题需要修复
- 仍属于迁移后的验收修正阶段，先收干净明确的 bug 和交互问题，再进入正式 V1 功能开发

---

#### P0/P1 修复

**1. 所有开始/结束日期时间输入框统一布局修复**

- **严重程度**：P1（功能可用性 + 视觉美观）
- **问题表现**：
  - 经期、待办、日程等多个创建/编辑界面的日期/时间输入框过长
  - 窄屏 Safari 下会互相挤压、重叠或直接超出屏幕
  - 日程时间输入虽已修过一次，但整体尺寸仍不够美观
- **共同根因（审计后确认）**：
  - date/datetime-local input 在 Safari 中有默认最小宽度（要显示日期选择器图标和文本）
  - 部分表单使用了固定的 `grid-cols-2` 布局，没有响应式适配（PeriodForm 未修复，ScheduleForm 已修复）
  - GlassInput 虽然已有 `min-w-0`，但缺少 `max-w-full` 和 `box-border` 确保完全收缩
- **修复方案（优先共享层，页面层仅做必要适配）**：
  - **共享层**：`GlassInput` input 添加 `max-w-full` + `box-border`，确保所有类型 input（包括 date/datetime-local）在父容器内正确收缩，不超出屏幕
  - **页面层**：`PeriodForm` 开始/结束日期从固定 `grid-cols-2` 改为响应式 `grid-cols-1 sm:grid-cols-2`（与 ScheduleForm 保持一致）
  - `TodoForm` 截止日期为单列，无需修改
  - 不影响其他 GlassInput 使用场景（文本输入等）
- **文件**：
  - `src/shared/ui/GlassInput.tsx`（共享层）
  - `src/features/cycle/components/PeriodForm.tsx`（页面层适配）

**2. 首页 Mood 交互重新调整 — 一点即记录改为二次确认**

- **严重程度**：P0（核心交互，用户明确不接受当前行为）
- **问题表现**：首页直接点击一个心情就立即记录（一点即记账），用户不接受
- **目标交互**：
  - 第一次点击 → 进入/显示该心情对应的生命体视觉状态（选中态），不保存
  - 选中态足够明显，用户能明确知道自己正在选择哪个心情
  - 第二次操作（点击确认按钮）→ 弹出确认/直接确认 → 才真正保存 Mood Event
- **修复方案**：
  - `MoodCard` 内部新增本地状态 `selectedLevel: MoodLevel | null`
  - `MoodPicker` 的 `value` 绑定本地 `selectedLevel`（而非 null），第一次点击只设置 selectedLevel，不调用 onQuickPick
  - 选中后显示确认区域："已选择：XX" + "重新选择" / "确认记录" 两个按钮
  - 点击"确认记录" → 调用 `onQuickPick(selectedLevel)` 真正保存 → 重置 selectedLevel
  - 点击"重新选择" → 重置 selectedLevel，可重新选择
  - 未选中时显示"添加标签和备注"链接（保持原有功能入口）
  - **不修改 Domain / Repository 数据结构**，仅修改 MoodCard UI 交互逻辑
- **文件**：`src/features/today/components/MoodCard.tsx`

---

#### P2 确认

**3. Mood 选中态视觉反馈**

- Phase 6 已增强 MoodPicker 选中态（主色背景 + 边框 + 文字 + 阴影 + scale-110，未选中 opacity-50）
- 本次 MoodCard 改造后，选中态通过 MoodPicker 的 value 绑定正常显示
- 确认足够明显，无需进一步修改

---

#### 明确后置的功能（本次不实现，已在 PROJECT_PLAN.md 记录）

| 功能 | 后置阶段 | 原因 |
|---|---|---|
| Dashboard Core Mood Lifeform（中央大型动态生命体） | V1 | 依赖 Daily Mood 聚合与 Mood Event 时间序列，不只是动画组件 |
| Mood Event 时间序列（一天多次记录） | V1 | 需要新数据模型和 UI 设计 |
| Daily Mood 聚合（全天整体感受） | V1 | 依赖 Mood Event，需要确定性聚合算法 |
| Weekly / Monthly Mood 统计 | V1 | 基于 Daily Mood，而非简单平均瞬时 Event |
| 自定义背景完整能力 | Layer 2 | 需要 Canvas 图像分析、Adaptive Text Protection |
| Adaptive Text Protection | Layer 2 | 需要动态对比度检测、局部背景采样 |
| 性能优化 | 待定位 | 无法稳定复现明确瓶颈，不盲目优化 |

---

#### 验证

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ⏳ iPhone Safari 真机重点回归（待用户确认）

---

## [v6.5.2] — 2026-08-31

### Phase 6 最终验收 + Bug Fix

**背景**：
- 用户完成 iPhone 真机验收，发现 5 个问题（P0/P1 功能可用性 + P2 交互/UI）
- 进入 Phase 6 最终验收与 Bug Fix 阶段
- 不开始 Layer 2，不扩展 V1 新功能，不为视觉完整度补产品能力

---

#### P0/P1 功能可用性修复

**1. 心情记录保存无实际反馈 + Todo 创建报错 crypto.randomUUID**

- **严重程度**：P0（核心功能不可用）
- **根本原因**：`src/shared/lib/id.ts` 中的 `generateId()` 使用 `crypto.randomUUID()`，该 API 在 Safari 某些版本、非安全上下文（http://）、PWA standalone 模式中不可用
- **影响范围**：所有 create 操作（moodRepository.create、todoRepository.create、scheduleRepository.create 等）全部失败，导致心情、待办、日程都无法保存
- **这同时解释了问题 1（心情保存无反馈）和问题 2（Todo 创建报错）**
- **修复**：重写 `generateId()`
  - 优先使用 `crypto.getRandomValues()`（广泛支持，包括 Safari）
  - 后备使用 `Math.random()`（极端环境兜底）
  - 生成标准 UUID v4 格式
- **文件**：`src/shared/lib/id.ts`

**2. 新建日程页面 Safari 无法正常滚动到确认按钮**

- **严重程度**：P1（功能可用性受影响）
- **根本原因**：`src/shared/ui/BottomSheet.tsx` 的 Sheet 容器未使用 flex 布局，内容区域 `overflow-y-auto` 在 Safari 中无法正确收缩滚动。当内容超过 max-height 时，Safari 会让整个 Sheet 溢出，而不是内容区域滚动，导致底部确认按钮被视口遮挡且无法滚动到
- **修复**：
  - Sheet 容器添加 `flex flex-col`
  - drag handle 和 title 添加 `shrink-0`
  - 内容区域添加 `flex-1 min-h-0`（`min-h-0` 是关键，允许 flex 子元素收缩到内容高度以下，从而触发 overflow-y-auto）
- **文件**：`src/shared/ui/BottomSheet.tsx`
- **分类**：经典 Safari flexbox + overflow 兼容性问题

---

#### P2 交互/UI 修复

**4. 状态页面选择心情时选中反馈不明显**

- **严重程度**：P2（交互体验）
- **问题**：选中态只有 scale-110 + 半透明白色背景 + 文字颜色变化，在浅色背景下对比度不足，用户很难判断当前选择
- **修复**：增强选中态可见性，保持 Layer 1 已冻结的视觉语言
  - 选中态背景：`color-mix(in srgb, var(--color-primary-400) 18%, white)`（主色浅色，而非纯白）
  - 选中态边框：`1.5px solid color-mix(in srgb, var(--color-primary-400) 45%, transparent)`（主色边框）
  - 选中态文字：`var(--color-primary-500)`（主色文字，而非通用 text-primary）
  - 选中态阴影：`0 4px 16px color-mix(in srgb, var(--color-primary-400) 20%, transparent)`（柔和主色阴影）
  - 保持 scale-110
  - 未选中态：opacity 从 60% 降到 50%，增加选中/未选中对比度
- **文件**：`src/features/mood/components/MoodPicker.tsx`

**5. 日程开始/结束时间输入框宽度问题**

- **严重程度**：P2（布局美观）
- **问题**：datetime-local 输入框在 grid 布局中可能因浏览器默认最小宽度导致溢出或过长
- **修复**：
  - `GlassInput` 的 input 元素添加 `min-w-0`，确保在 grid/flex 布局中正确收缩
  - 配合之前的 `grid-cols-1 sm:grid-cols-2` 响应式修复（窄屏单列，宽屏两列）
- **文件**：`src/shared/ui/GlassInput.tsx`

---

#### 验证

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ⏳ iPhone 真机再次验证（待用户确认）

---

#### 明确后置的功能（本次不实现）

| 功能 | 后置阶段 | 原因 |
|---|---|---|
| 中央动态 Mood Lifeform | V1 | 依赖 Daily Mood 聚合与 Mood Event 时间序列，不只是动画组件 |
| Mood Event / Daily Mood / Weekly / Monthly | V1 | 需要新数据模型和确定性聚合算法，Deterministic First |
| 自定义背景完整能力 | Layer 2 | 需要 Canvas 图像分析、Adaptive Text Protection |
| Adaptive Text Protection | Layer 2 | 需要动态对比度检测 |
| 性能优化 | 待观察 | 无法稳定复现明确瓶颈，不盲目优化 |

---

## [v6.5.1] — 2026-08-31

### Migration Acceptance + Bug Fix 阶段

**背景**：
- Phase 2-5 代码迁移完成，用户在 iPhone 上进行初步真机验收，整体 UI 表现正常
- 进入 Migration Acceptance + Bug Fix 阶段，对照 PROJECT_RULES.md / PROJECT_PLAN.md / CHANGELOG.md / UI_MIGRATION_HANDOFF.md 进行完整审计

---

#### 审计结果

| 检查项 | 结果 |
|---|---|
| Phase 2 共享组件兼容性 | ✅ 所有组件向后兼容，使用方无需修改 |
| Phase 3 BackgroundSystem / BottomNav / safe-area | ✅ safe-area 适配正确，页面滚动正常，路由切换正常 |
| Phase 4 MoodLifeform / MoodPicker 数据链路 | ✅ 与真实 useMood() 数据链路正确 |
| Phase 5 5 个页面真实数据与交互 | ✅ 业务逻辑不变，统一 UI 风格 |
| 误迁移 Preview Mock / Layer 2 实验 | ✅ 未发现 |
| 越界修改 Hook / Store / Domain / Repository | ✅ 未发现，全部在 UI Layer |
| 移动端 overflow / safe-area / fixed 元素遮挡 | ✅ BottomNav safe-area 正确，悬浮按钮位置正确 |

---

#### Pre-existing UI Bug Fix

**问题**：ScheduleForm 日程添加页面中，开始时间和结束时间下方的两个 `datetime-local` 输入框，在较窄的 iPhone viewport 下发生横向重叠。

**根因**：`grid-cols-2` 固定两列布局，`datetime-local` 输入框在移动端有最小宽度，窄屏下溢出。

**修复**（最小范围 responsive layout）：
- `src/features/schedule/components/ScheduleForm.tsx`
- `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- 窄屏（<640px）单列堆叠，宽屏两列并排
- 不改变业务逻辑、数据结构、交互语义

**分类**：Pre-existing UI Bug（迁移前就存在，非 Migration Bug）

---

#### Migration Bug Fix

**问题**：自定义图片背景下，Text Protection（文字保护）完全不生效。

**根因**：UI Preview 的 AppLayout 根 div 设置了 `data-bg={backgroundConfig.source}`，使 `[data-bg="image"] h1` 和 `[data-bg="image"] .text-shield` CSS 选择器能够匹配。LifeOS 迁移时遗漏了 `data-bg` 属性，导致选择器永远不匹配。

**修复**：
- `src/layouts/AppLayout.tsx`
- 根 div 添加 `data-bg={DEFAULT_BACKGROUND_CONFIG.source}`
- 当前默认 source 为 'aurora'，极光背景下 Text Protection 不生效（符合设计）
- 未来启用自定义图片背景时，source 变为 'image'，Text Protection 自动生效

**影响**：自定义图片背景下的 h1 text-shadow 和 .text-shield 工具类现在可以正常生效。

**分类**：Migration Bug（迁移时遗漏，UI Preview 正常）

---

#### 自定义背景文字问题最终判定

- **之前**：Migration Bug（data-bg 属性缺失导致 Text Protection 完全不生效）
- **已修复**：添加 data-bg 属性后，与 UI Preview Frozen Layer 1 行为一致
- **如果修复后在极端背景下仍然不够清晰**：属于 Layer 1 当前技术边界，记录为 Layer 2 待办（Adaptive Text Protection / Canvas 图像分析 / 局部背景采样 / 动态对比度检测等）
- **当前阶段不实现**：Canvas 图像分析、局部背景采样、动态对比度检测、Adaptive Text Protection、Material Engine、WebGL

---

#### 验证

- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功
- ✅ iPhone 真机初步验收通过（用户反馈整体 UI 表现正常）
- ✅ 未 push，未触发 Netlify 部署，未 merge master

---

## [v6.5.0] — 2026-08-31

### UI Migration Layer 1 — Phase 2-5：共享组件 + 核心视觉系统 + 心情系统 + 页面重布局

**背景**：
- 延续 Phase 1（设计基础），连续完成 Phase 2-5
- 所有变更在 `feature/ui-migration-layer1` 分支，未 push，未触发 Netlify 部署
- 严格遵守 UI Layer 范围，不修改业务逻辑、数据层、AI、同步、认证
- 每个 Phase 完成后均执行 tsc + build 验证

---

#### Phase 2：共享组件替换（9 替换 + 3 新增）

**替换的组件（`src/shared/ui/`）**：
- GlassButton：4 变体（primary/secondary/ghost/danger）× 3 尺寸，向后兼容 loading/leftIcon/rightIcon
- GlassInput：surface-soft 背景，新增 GlassTextarea 导出
- SegmentedControl：泛型组件 `<T extends string>`
- StatusBadge：6 变体，向后兼容旧版 text+color API，支持日程类型 variant
- EmptyState、SectionHeader、Modal（portal+ESC+backdrop+滚动锁定）、BottomSheet（向后兼容 height）

**新增的组件**：
- CleanCard：轻结构内容卡片（surface-soft），与 GlassCard 区分使用
- ProgressRing：环形进度条（原生 SVG），与 Progress（条形）共存
- MoodTrendChart：心情趋势折线图（原生 SVG），适配 LifeOS MoodLevel 类型

**验证**：tsc 通过，build 成功（8.94s）

---

#### Phase 3：核心视觉系统（BackgroundSystem + BottomNav + App Shell）

**新增组件**：
- `src/components/BackgroundSystem.tsx`：3 极光版本（lavender-dawn/rose-mist/warm-bloom）+ 5 材质模式（original-soft/mist/frosted-glass/liquid/dew）+ 用户图片接口 + Text Protection + Dew 水滴纹理
- `src/components/GlassFilters.tsx`：SVG 滤镜定义（dew-displace/glass-edge-soft/lifeform-core-glow/dew-drop-1/2）
- `src/shared/ui/BottomNav.tsx`：漂浮胶囊式 Liquid Glass 底部导航，5 个 Tab（今日/日程/待办/状态/更多）

**更新**：
- `src/layouts/AppLayout.tsx`：接入 BackgroundSystem + BottomNav + GlassFilters，移除 body 背景渐变，主内容区添加底部 padding（pb-32）避免被 BottomNav 遮挡，通知按钮改用 glass-strong
- `src/styles/globals.css`：移除 body 背景渐变（BackgroundSystem 接管）

**保留**：TabBar.tsx 保留作为备份，不删除

**验证**：tsc 通过，build 成功（9.07s）

---

#### Phase 4：心情系统迁移（lifeform 资产架构 + MoodLifeform A/B + MoodPicker）

**新增组件（`src/features/mood/components/`）**：
- `lifeform/types.ts`：LifeformAsset/LifeformLevelData/LifeformShape/LifeformGradient/LifeformAnimation/MoodLevel 类型定义 + MOOD_LABELS/MOOD_COLORS
- `lifeform/assets.ts`：ASSET_FLOWER（五瓣花）+ ASSET_CORE（System Core，12 控制点 Catmull-Rom 有机轮廓预计算）
- `lifeform/LifeformRenderer.tsx`：通用渲染器（唯一渐变 ID + CSS 变量 + 呼吸/脉动/环/光晕/盛放进入动画）
- `lifeform/index.ts`：模块入口
- `MoodLifeformA.tsx`：五瓣花生命体薄包装（MoodPicker 小尺寸用）
- `MoodLifeformB.tsx`：System Core 抽象有机生命体薄包装（Dashboard 大尺寸用）
- `MoodPicker.tsx`：5 级心情选择器，variant A/B 切换，数字 size，激活态 scale-110 + 玻璃背景

**更新使用方（API 适配）**：
- MoodQuickRecord：variant=A, size=46
- WellnessPage：value=null, variant=A, size=46
- MoodCard：value=null, variant=A, size=40

**验证**：tsc 通过，build 成功（8.97s）

---

#### Phase 5：页面重布局（Today/Schedule/Todo/Wellness/More 5 个页面）

**重布局的页面（保持业务逻辑不变，统一 UI 风格）**：
- TodayPage：顶部区域（日期+问候+同步状态）、心情卡片、今日进度（ProgressRing + TodayProgress 横向布局）、今日日程（SectionHeader + 全部链接）、今日待办（SectionHeader + 全部链接）、周期状态、AI 建议（Sparkles 图标 + 标题）
- SchedulePage：顶部标题 + 周/日视图切换、日期导航（surface-soft 卡片）、回到今天按钮、日程内容（GlassCard）、悬浮添加按钮（glass-strong + 主色背景）
- TodoPage：顶部标题 + 统计、筛选栏、待办列表（GlassCard）、悬浮添加按钮（glass-strong + 主色背景）
- WellnessPage：顶部标题 + 情绪/周期模块切换、日期显示、情绪模块（今日/历史视图切换、心情卡片、记录列表）、周期模块（状态卡片、历史列表）、悬浮添加按钮（根据模块切换图标 Plus/Droplets）
- MorePage：顶部标题、菜单列表（数据分析/设置/关于，图标背景使用主色 12% 透明度）、底部标语

**统一风格**：所有页面使用 animate-fade-slide-up + stagger-1~6 交错动画，主色 Dusty Rose，玻璃材质五层结构

**验证**：tsc 通过，build 成功（9.03s）

---

#### 架构影响

- **无破坏性变更**：所有组件替换均做向后兼容处理，使用方代码无需修改或仅需最小 API 适配
- **业务逻辑未修改**：Hook/Store/Domain/Repository/Infrastructure/AI/Sync/Auth 全部保持不动
- **数据模型未修改**：Dexie 数据库结构、Supabase 表结构、TypeScript 类型定义全部保持不动
- **PWA 配置未修改**：manifest、service worker、vite-plugin-pwa 配置全部保持不动

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
