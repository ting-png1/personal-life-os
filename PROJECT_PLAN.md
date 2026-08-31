# Personal Life OS — 项目状态总览

> **版本**：v7.5.2（iPhone 真机 CRUD 回归问题修复完成）
> **项目路径**：`D:\personal_Lifeos_project`
> **本文档地位**：项目当前状态的总览。描述"项目现在是什么样"。
> **最后更新**：2026-08-31（iPhone 真机 CRUD 回归发现 5 个问题，全部修复：Today 重复模块、Cycle 删除入口、Schedule 渲染异常（需真机确认）、Mood 二次确认不一致、全局编辑表单删除按钮统一）
> **在线地址**：https://astounding-torrone-5409bc.netlify.app/
> **GitHub 仓库**：https://github.com/ting-png1/personal-life-os（私有）
> **当前开发阶段**：V1 长线开发 — UI Migration Layer 1 完成，iPhone 真机 CRUD 回归问题修复完成，等待真机验收
> **当前分支**：`feature/ui-migration-layer1`（未 push）

---

## 文档体系

| 文档 | 定位 | 何时读取 |
|---|---|---|
| **PROJECT_PLAN.md**（本文档） | 项目当前状态总览 | 每次开始任务前，了解项目现状 |
| **PROJECT_RULES.md** | 项目开发规则 | 每次开始任务前，了解修改规则 |
| **CHANGELOG.md** | 历史变更记录 | 需要了解历史变更时 |

**总原则**：实际代码状态、运行结果和测试结果优先于项目文档。如果本文档与实际代码冲突，以实际代码为准，并在完成任务后修正本文档。

---

## 目录

1. [产品定义](#一产品定义)
2. [技术栈](#二技术栈)
3. [架构（五层）](#三架构五层命名统一)
4. [数据模型](#四数据模型)
5. [TodayState 设计](#五todaystate-设计)
6. [模块数据流](#六四个模块之间的数据流)
7. [Zustand Store 设计](#七zustand-store-设计)
8. [Dexie 数据库结构](#八dexie-数据库结构)
9. [页面与导航结构](#九页面与导航结构)
10. [Design System（Pink Mist Glass）](#十design-systempink-mist-glass)
11. [UI 组件结构](#十一ui-组件结构)
12. [开发阶段与任务状态](#十二开发阶段与任务状态)
13. [未来 iOS 迁移策略](#十三未来-ios-迁移策略)
14. [架构决策记录（ADR）](#十四架构决策记录adr)
15. [风险登记与已知问题](#十五风险登记与已知问题)

---

## 一、产品定义

### 1.1 一句话定位

以「今日状态」为中心的个人生活管理工具——用户每天打开后，一眼看到今天的情绪、课程/日程、待办和完成进度，并能在 3 秒内完成记录或勾选。

### 1.2 核心理念

这个 App 不是单纯的 Todo + Calendar + Mood Tracker，而是：**"根据我今天真实的状态，帮助我理解和安排今天。"**

Today 是整个 MVP 的核心。Schedule、Todo、Mood 都为 Today 服务。

### 1.3 核心闭环

```
打开 App → Today 页面 → 看到今天全貌
  ├─ 情绪不好？→ 点一下记录情绪
  ├─ 有课？→ Schedule 页面管理
  ├─ 有事？→ Todo 页面添加
  └─ 完成了？→ 回 Today 看进度更新
```

### 1.4 当前范围

**已实现**：Today（聚合中心）、Schedule（课程+日程）、Todo（待办）、Mood（情绪记录）、Cycle（生理周期）、AI（智能建议）、PWA 可安装离线使用、数据导出备份。

**暂缓**：Supabase 云同步、账号系统、通知推送、Health 健康数据、HealthKit、Apple Watch、Widget、数据分析、EventBus。

### 1.5 Today 页面结构

```
Today
├── 日期 / 星期 / 问候语
├── 今日状态（Mood：已记录显示表情+标签；未记录显示"今天感觉怎么样？"）
├── 周期状态（Cycle：经期中/距下次经期 X 天/预测信息）
├── AI 智能建议（生成今日建议/未配置引导）
├── 今日课程 / 日程（时间列表，当前进行中高亮）
├── 今日 Todo（checkbox 列表，可直接勾选）
└── 今日完成情况（进度条 + "2 / 3 完成"）
```

---

## 二、技术栈

| 类别 | 选型 | 版本 | 用途 |
|---|---|---|---|
| 构建 | Vite | ^5 | SPA 构建 + HMR |
| UI | React | ^18 | 组件框架 |
| 语言 | TypeScript | ^5 | strict 模式，类型安全 |
| 路由 | React Router | ^6 | 页面导航 |
| 样式 | Tailwind CSS + CSS Variables | ^3 | 原子类 + 设计 token |
| 本地 DB | Dexie.js | ^4 | IndexedDB 封装 |
| 状态 | Zustand | ^4 | 按模块分 store |
| PWA | vite-plugin-pwa | ^0.20 | manifest + Service Worker |
| 日期 | date-fns | ^3 | 日期解析/比较/格式化 |
| 图标 | lucide-react | ^0.400 | 轻量图标库 |
| ID | crypto.randomUUID() | - | 客户端生成 UUID |
| 图标生成 | sharp | - | devDependency，生成 PWA PNG 图标 |
| AI | DeepSeek Chat API | - | 纯前端直连，个人使用 |
| 部署 | Netlify | - | 静态托管 + 自动部署 |
| 代码托管 | GitHub | - | 私有仓库 |

**明确不安装**：Supabase（当前阶段）、Redux、EventBus 库、图表库、表单库、MUI/Ant Design。

---

## 三、架构（五层，命名统一）

> **命名修正记录**：原称"四层架构"，实际为五层。统一命名为以下五层，开发中所有文档、代码注释、沟通均使用此命名。

```
┌──────────────────────────────────────────────────┐
│  第 1 层：UI Layer                                 │
│  Pages → Feature Components → shared/ui (Glass*)  │
│  只负责展示与交互，不直接碰 Dexie，不写业务逻辑     │
├──────────────────────────────────────────────────┤
│  第 2 层：Hook / Store Layer                       │
│  useToday() / useTodos() / useSchedule() /         │
│  useMood() / useCycle() / useAI() + Zustand Stores│
│  组合数据、管理 loading/error、暴露操作方法          │
├──────────────────────────────────────────────────┤
│  第 3 层：Domain / Pure Logic Layer                │
│  TodayAggregator.buildTodayState()                  │
│  ScheduleExpander.expandForDate()                   │
│  CycleCalculator / AIService / TodoFilter 等纯函数  │
│  不依赖 React / DOM / Dexie，可单测可移植           │
├──────────────────────────────────────────────────┤
│  第 4 层：Repository Layer                          │
│  TodoRepository / ScheduleRepository /              │
│  MoodRepository / CycleRepository（接口 + Dexie 实现）│
│  上层只依赖接口，未来换 SwiftData 只换实现           │
├──────────────────────────────────────────────────┤
│  第 5 层：Infrastructure Layer                      │
│  Dexie / IndexedDB（4 张表）+ localStorage（AI 设置）│
└──────────────────────────────────────────────────┘
```

### 3.1 依赖规则

- **依赖方向永远向下**：UI → Hook/Store → Domain → Repository → Infrastructure
- **禁止反向依赖**：Dexie 不知道 Repository，Repository 不知道 Store，Store 不知道 UI
- **禁止跨层跳跃**：UI 不能直接 import Dexie；Store 不能直接操作 DOM
- **Domain 层纯函数是未来 iOS 迁移的核心资产**

### 3.2 TodayState 的定位

TodayState 是**纯派生 ViewModel**，由 `TodayAggregator.buildTodayState()` 计算，不入库、不持久化、不是数据库表、不是 Domain Entity。

---

## 四、数据模型

### 4.1 Todo

```typescript
interface Todo {
  id: string;                    // UUID，客户端生成
  title: string;                 // 必填，1-100 字符
  description: string | null;    // 可选，长文本
  dueDate: string | null;        // "YYYY-MM-DD"，只到日；null=无截止（不显示在 Today）
  priority: 1 | 2 | 3;           // 1=高, 2=中, 3=低；默认 2
  completed: boolean;             // 默认 false
  completedAt: string | null;     // 完成时间 ISO；未完成=null
  createdAt: string;              // ISO 字符串
  updatedAt: string;              // ISO 字符串
}
```

> **设计说明**：`completedAt` 用于统计"今天完成了几个"，仅靠 `updatedAt` 会被编辑操作污染。

### 4.2 ScheduleEvent

```typescript
interface ScheduleEvent {
  id: string;
  title: string;
  type: 'class' | 'personal' | 'rest' | 'other';
  location: string | null;
  note: string | null;
  startDateTime: string;          // ISO "2026-08-30T09:00:00"，完整日期时间
  endDateTime: string;            // ISO "2026-08-30T10:40:00"
  recurrence: RecurrenceRule | null;  // 仅 class 类型通常有值；一次性事件=null
  createdAt: string;
  updatedAt: string;
}

interface RecurrenceRule {
  freq: 'weekly';                        // MVP 只支持每周重复
  daysOfWeek: number[];                  // 0=周日, 1=周一, ..., 6=周六
  startDate: string;                     // "2026-09-01" 重复开始
  endDate: string;                       // "2027-01-10" 重复结束
  weekRange?: [number, number];          // 预留：单双周 [起始周, 结束周]
  excludedDates?: string[];              // 预留：调课/临时取消的排除日期
  overrides?: Record<string, ScheduleOverride>;  // 预留：特定日期的覆盖
}

interface ScheduleOverride {
  startDateTime?: string;   // 调课改时间
  endDateTime?: string;
  location?: string;        // 调课改地点
  cancelled?: boolean;      // 临时取消
}
```

> **设计说明**：`weekRange`/`excludedDates`/`overrides` 为预留扩展字段（大学课程单双周/调课/临时取消），**MVP 不实现这些字段的 UI 和逻辑**，TodayAggregator 暂只处理 `freq + daysOfWeek + startDate + endDate`。

### 4.3 MoodRecord

```typescript
interface MoodRecord {
  id: string;
  date: string;               // "YYYY-MM-DD"，按天分组/查询
  level: 1 | 2 | 3 | 4 | 5;  // 1=很糟, 2=不好, 3=平稳, 4=不错, 5=很好
  tags: string[];             // 如 ["焦虑", "疲惫", "开心"]，预设+自定义
  note: string | null;
  createdAt: string;           // 完整 ISO 时间戳，同一天多条时排序用
  updatedAt: string;
}
```

> **设计说明**：`date`（只到日）和 `createdAt`（完整时间）同时存在。`date` 用于 TodayAggregator 快速筛选当天记录；`createdAt` 用于同一天多条记录时取最新一条。一天可有多条 MoodRecord，Today 显示最新一条。

### 4.4 PeriodRecord（V1 新增）

```typescript
interface PeriodRecord {
  id: string;                    // UUID
  startDate: string;             // "YYYY-MM-DD" 经期开始日
  endDate: string | null;        // "YYYY-MM-DD" 经期结束日；null=进行中
  flowLevel: 1 | 2 | 3 | null;   // 经量：1=少, 2=中, 3=多；null=未记录
  symptoms: string[];            // 症状标签
  note: string | null;           // 备注
  createdAt: string;
  updatedAt: string;
}
```

> **设计说明**：周期预测（下次经期、排卵日、可孕窗口、周期阶段）全部由 `CycleCalculator` 纯函数从 PeriodRecord 历史派生，不存库。不做医疗诊断，数据不足时提示"记录更多周期后可预测"。

### 4.5 AIRecommendation（V1 新增，运行时不持久化）

```typescript
interface AIRecommendation {
  id: string;                    // UUID
  date: string;                   // "YYYY-MM-DD" 哪一天的建议
  summary: string;                // 今日状态总结（一段文字，≤80字）
  suggestions: AISuggestion[];    // 建议列表（2-4条）
  status: 'pending' | 'confirmed' | 'dismissed';
  createdAt: string;
}

interface AISuggestion {
  id: string;
  type: 'todo' | 'schedule' | 'rest' | 'mood' | 'general';
  title: string;                 // 简短标题（≤50字）
  description: string;           // 具体内容（≤200字）
  priority: 'high' | 'medium' | 'low';
}

interface AISettings {           // 存 localStorage，不存 IndexedDB
  apiKey: string;                // DeepSeek API Key
  dailyLimit: number;            // 每日调用上限（默认3，用户可设1-20）
  model: string;                 // 模型名（默认 deepseek-chat）
  enabled: boolean;              // 是否启用
}
```

> **设计说明**：AI 建议是运行时派生数据，当前不持久化到 IndexedDB（刷新后需重新生成）。AI 设置存 localStorage。AI 只产生建议，不直接修改业务数据；用户确认后仅标记状态，不自动执行。纯前端直连 DeepSeek API（个人使用），不搭后端代理。

### 4.6 输入类型（Create 时使用，不含系统字段）

```typescript
interface CreateTodoInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: 1 | 2 | 3;
}

interface CreateScheduleInput {
  title: string;
  type: ScheduleEvent['type'];
  startDateTime: string;
  endDateTime: string;
  location?: string | null;
  note?: string | null;
  recurrence?: RecurrenceRule | null;
}

interface CreateMoodInput {
  level: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  note?: string | null;
}

interface CreatePeriodInput {
  startDate: string;
  endDate?: string | null;
  flowLevel?: 1 | 2 | 3 | null;
  symptoms?: string[];
  note?: string | null;
}
```

---

## 五、TodayState 设计

### 5.1 接口定义

```typescript
interface TodayState {
  date: string;                          // "2026-08-30"
  weekday: string;                       // "星期日"
  greeting: string;                      // "早上好" / "下午好" / "晚上好"

  mood: {
    latest: MoodRecord | null;           // 当天最新一条；null=今天还没记录
    hasRecorded: boolean;
  };

  schedule: {
    items: ScheduleInstance[];            // 当天展开后的日程实例，按时间排序
    nextItem: ScheduleInstance | null;    // 当前时间之后的下一个（或当前进行中的）
    currentItem: ScheduleInstance | null; // 当前正在进行的
    total: number;
  };

  todos: {
    dueToday: Todo[];                     // dueDate=今天 且 未完成
    completedToday: Todo[];               // completedAt 的日期部分=今天
    allToday: Todo[];                     // dueToday + completedToday（展示用）
    totalDue: number;
    completedCount: number;
    completionRate: number;               // 0-1；totalDue=0 时为 0
  };
}

interface ScheduleInstance {
  eventId: string;          // 关联原始 ScheduleEvent.id
  title: string;
  type: ScheduleEvent['type'];
  location: string | null;
  startDateTime: string;     // 当天的实例时间
  endDateTime: string;
}
```

### 5.2 TodayAggregator（纯函数，Domain 层）

```
文件：src/features/today/aggregator/TodayAggregator.ts

导出函数：
  buildTodayState(date: string, todos: Todo[], events: ScheduleEvent[], moods: MoodRecord[]): TodayState

内部步骤：
  1. 计算 weekday / greeting（纯日期/时间逻辑）
  2. mood: 从 moods 筛选 date=今天 → 按 createdAt 降序 → 取第一条
  3. schedule: 对每个 event:
       - recurrence != null → ScheduleExpander.expandForDate(event, date)
       - recurrence == null → 判断 startDateTime 的日期部分=今天
     → 收集实例 → 按 startDateTime 排序 → 计算 currentItem / nextItem
  4. todos:
       - dueToday = todos.filter(dueDate === date && !completed)
       - completedToday = todos.filter(completedAt 的日期部分 === date)
       - 计算 completionRate
  5. 组装 TodayState 返回
```

### 5.3 useToday() hook（Hook/Store 层）

```
文件：src/features/today/hooks/useToday.ts

逻辑：
  const date = useTodayDate()  // 今天日期字符串，午夜自动刷新
  const todos = useTodoStore(s => s.todos)
  const events = useScheduleStore(s => s.events)
  const moods = useMoodStore(s => s.records)

  const todayState = useMemo(
    () => buildTodayState(date, todos, events, moods),
    [date, todos, events, moods]
  )

  return { todayState, date }
```

### 5.4 关键设计决策

- **不单独建 useTodayStore**：TodayState 完全是其他 store 的派生值。单独建 store 需要手动同步，容易出现"Todo 改了但 TodayState 没更新"的 bug。`useMemo` + 多个 store 订阅是最简单可靠的方式。
- **不持久化 TodayState**：每次打开重新计算，保证数据一致性。
- **不在 aggregator 里做格式化**：aggregator 只返回原始数据（ISO 字符串），格式化（如 "09:00"）是 UI 层的职责。

---

## 六、四个模块之间的数据流

### 6.1 统一数据流模式

```
用户操作（UI 组件）
    ↓ 调用 feature hook 的 action
useTodos().createTodo(input)
    ↓
1. Repository.create(input) → 写入 Dexie
2. Repository 返回完整对象（含 id/createdAt）
3. Store.add(item) → 更新 Zustand 内存数组
4. Today 页面自动更新（useToday() 订阅了 store，useMemo 重新执行）
```

### 6.2 Schedule → Today

```
创建/修改/删除 ScheduleEvent
    ↓
ScheduleRepository (Dexie)
    ↓
useScheduleStore 更新 events 数组
    ↓
useToday() 检测到 events 变化 → useMemo 重新执行
    ↓
TodayAggregator 重新筛选/展开当天日程
    ↓
Today 页面 schedule 部分自动刷新
```

### 6.3 Todo → Today

```
创建 Todo（dueDate=今天）
    ↓
TodoRepository → Dexie
    ↓
useTodoStore 更新
    ↓
useToday() 重新聚合 → todayState.todos.dueToday 增加
    ↓
Today 页面 Todo 列表 + 完成进度自动更新

完成 Todo
    ↓
TodoRepository.update(id, { completed: true, completedAt: now })
    ↓
useTodoStore 更新
    ↓
useToday() 重新聚合 → completedToday 增加, completionRate 更新
    ↓
Today 进度条自动前进
```

### 6.4 Mood → Today

```
记录 Mood
    ↓
MoodRepository → Dexie
    ↓
useMoodStore 更新
    ↓
useToday() 重新聚合 → mood.latest=新记录, hasRecorded=true
    ↓
Today 页面情绪卡片从"今天感觉怎么样？"变为显示最新情绪
```

### 6.5 Cycle → Today

```
记录/结束经期
    ↓
CycleRepository → Dexie
    ↓
useCycleStore 更新
    ↓
useCycle() 重新计算 currentCycleState（纯函数）
    ↓
Today 页面 CycleStatusCard 自动更新
```

### 6.6 AI → Today

```
用户点击"生成今日建议"
    ↓
useAI().generate(input) → 调用 DeepSeek API
    ↓
useAIStore 更新 currentRecommendation
    ↓
Today 页面 AIRecommendationCard 显示建议
```

### 6.7 模块间禁止的依赖

| 禁止 | 原因 |
|---|---|
| Today 组件直接 import Dexie | 违反分层，UI 不碰数据库 |
| TodoStore 直接操作 MoodStore | 模块间不直接通信，通过 Today 聚合间接联动 |
| ScheduleExpander 访问 Zustand | 纯函数不能依赖状态管理库 |
| Repository 返回 Dexie Table 对象 | 上层不应知道 Dexie 存在 |
| TodayAggregator 做日期格式化 | 格式化是 UI 职责 |
| 模块间直接 import 对方的内部组件 | 只通过 Repository 接口或 TodayState 聚合 |

### 6.8 无 EventBus

MVP/V1 不使用 EventBus。模块间联动通过：明确的方法调用 + Repository + Zustand feature store + TodayAggregator。只有未来模块数量明显增加、出现插件化需求或复杂异步事件链时，再重新评估 EventBus（候选 `mitt`，200 字节）。

---

## 七、Zustand Store 设计

### 7.1 通用模式

每个 feature 的 store 遵循同一模式：

```typescript
interface XxxState {
  items: Xxx[];
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  create: (input: CreateXxxInput) => Promise<Xxx>;
  update: (id: string, patch: Partial<Xxx>) => Promise<Xxx>;
  remove: (id: string) => Promise<void>;
}
```

### 7.2 各模块 Store

| Store | 文件 | State | 关键 Actions |
|---|---|---|---|
| useTodoStore | `features/todo/store.ts` | todos, loading, error | loadAll, create, update, toggleComplete, remove |
| useScheduleStore | `features/schedule/store.ts` | events, loading, error | loadAll, create, update, remove |
| useMoodStore | `features/mood/store.ts` | records, loading, error | loadAll, create, update, remove |
| useCycleStore | `features/cycle/store.ts` | records, loading, error | loadAll, create, update, remove |
| useAIStore | `features/ai/store.ts` | recommendations, currentRecommendation, loading, error, settings, dailyUsage | generate, dismissCurrent, confirmSuggestion, updateSettings, clearAPIKey, refreshUsage |

### 7.3 Store 内部规则

- **所有 action 先写库成功再更新 store**（写库失败则不更新 UI，避免不一致）
- **create**: repository.create → store.items 追加 → 按 createdAt 排序
- **update**: repository.update → store.items 替换对应项
- **remove**: repository.remove → store.items 过滤
- **toggleComplete**（Todo 专属）: if completed → update(id, { completed: false, completedAt: null }) else → update(id, { completed: true, completedAt: now() })

### 7.4 Store 初始化时机

```
main.tsx 启动流程（AppInitializer 组件）：
  1. 初始化 Dexie 数据库（打开连接）
  2. 并行调用 todoStore.loadAll() / scheduleStore.loadAll() / moodStore.loadAll() / cycleStore.loadAll()
  3. 全部加载完成后渲染 <App />
  4. 加载期间显示全屏 Loading（粉色 logo + 动画）
```

**全量加载策略**：个人用户数据量小（几年的 Todo 可能几千条），全量加载到内存后查询/聚合都是 O(n) 数组操作，性能足够。未来数据量大了再改按需加载/分页。

---

## 八、Dexie 数据库结构

### 8.1 数据库定义

```
数据库名："plife-os"
当前版本：2
文件：src/data/database.ts
```

### 8.2 表结构与索引

| 表名 | 主键 | 索引 | 说明 |
|---|---|---|---|
| `todos` | `id` | `dueDate, completed, priority, createdAt` | dueDate 索引加速 Today 筛选 |
| `schedule_events` | `id` | `type, startDateTime, createdAt` | 全量加载后内存筛选，索引为未来准备 |
| `mood_records` | `id` | `date, createdAt` | date 索引加速"查当天情绪" |
| `period_records` | `id` | `startDate, endDate, createdAt` | V1 新增，startDate 索引加速周期计算 |

### 8.3 字段存储说明

- `id`：UUID string，客户端生成（`crypto.randomUUID()`）
- 日期时间字段：ISO string（`"2026-08-30T09:00:00"`），Dexie 原生支持 string 索引
- `recurrence`：JSON 对象，Dexie 自动序列化/反序列化
- `tags` / `symptoms`：string 数组，Dexie 自动处理
- `completed`：boolean（Dexie 存 boolean，索引时可查）
- 当前不做软删除，删除即物理删除（未来加同步时再加 `deletedAt`）

### 8.4 版本迁移

使用 Dexie 的版本化写法。version 1 创建前 3 张表，version 2 新增 `period_records` 表。未来表结构变化时：

```typescript
db.version(3).stores({ todos: 'id, dueDate, completed, priority, createdAt, deletedAt' })
  .upgrade(tx => tx.table('todos').toCollection().modify(t => { t.deletedAt = null }))
```

---

## 九、页面与导航结构

### 9.1 底部 Tab Bar（5 个入口）

| Tab（模块名） | 用户可见标签 | 路由 | 页面 | 说明 |
|---|---|---|---|---|
| Today | 今日 | `/` | TodayPage | 默认首页，App 启动后第一个看到 |
| Schedule | 日程 | `/schedule` | SchedulePage | 周视图为主，可切换日视图 |
| Todo | 待办 | `/todo` | TodoPage | 列表 + 筛选 + 快速添加 |
| Wellness | 状态 | `/wellness` | WellnessPage | 情绪 + 周期（顶部 SegmentedControl 切换） |
| More | 更多 | `/more` | MorePage | 两个入口：设置 / 关于 |

### 9.2 二级页面（非 Tab，从列表点击进入）

| 路由 | 页面 | 入口 |
|---|---|---|
| `/settings` | SettingsPage | More → Settings（数据导出 / AI 配置） |
| `/about` | AboutPage | More → About |

### 9.3 页面布局规范

- 顶部：页面标题 + 可选操作按钮（如"添加"）
- 内容：可滚动区域
- 底部：TabBar（固定，不随内容滚动）
- 添加/编辑操作：优先用 **BottomSheet**（底部弹出），而非跳转新页面
- 空状态：使用 `EmptyState` 组件
- 移动端优先（375px 基准），桌面端不强制拉伸全屏

### 9.4 Wellness 页面结构

```
Wellness
├── 顶部 SegmentedControl：情绪 / 周期
├── 情绪视图（MoodQuickRecord + MoodHistoryList）
└── 周期视图（CycleStatusCard + PeriodForm 入口 + CycleHistoryList）
```

---

## 十、Design System（Pink Mist Glass）

### 10.1 设计原则

- 浅粉色 / 粉白 / 浅玫瑰色基调
- 半透明玻璃 + 磨砂（backdrop-filter: blur）
- 柔和、高级、安静
- 女性化但不幼稚（不用卡通插画、不用高饱和粉色）
- 所有页面共享 Design System，**禁止页面自定义颜色和组件**

### 10.2 Token 层级

```
src/styles/tokens.css（CSS 变量，唯一真相源）
    ↓
tailwind.config.js（把 CSS 变量映射为 Tailwind theme）
    ↓
组件中使用 Tailwind 类名（如 bg-primary-500, text-text-primary）
```

**禁止**：组件中写硬编码颜色值（如 `#FFB3C6`）。必须通过 Tailwind 类或 `var(--color-xxx)` 引用。

### 10.3 颜色体系

**品牌粉（7 级）**：
- 50: `#FFF5F7` / 100: `#FFE8EE` / 200: `#FFD1DC` / 300: `#FFB3C6`
- 400: `#FF8FAB` / **500: `#FB6F92`（主色）** / 600: `#E85D7E` / 700: `#C94A68`

**背景**：
- `--color-bg: #FFF8FA`（极浅粉白）
- `--color-surface: rgba(255,255,255,0.65)`（玻璃卡片）
- `--color-surface-solid: #FFFFFF`

**文字**（深棕灰，不用纯黑）：
- primary: `#2D2327` / secondary: `#7A6B70` / tertiary: `#B0A2A8`

**语义色**：success `#5EC4A0` / warning `#F5B971` / error `#E87A7A` / info `#8AB4F8`

**日程类型色**：class `#FB6F92` / personal `#8AB4F8` / rest `#5EC4A0` / other `#B0A2A8`

**情绪等级色**：1 `#E87A7A` / 2 `#F5B971` / 3 `#F0D06A` / 4 `#A8D8A0` / 5 `#5EC4A0`

### 10.4 字体

- 字体族：`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`
- 字号：xs(12/16) sm(14/20) base(16/24) lg(18/28) xl(22/30) 2xl(28/36) 3xl(36/44)
- 字重：normal(400) medium(500) semibold(600) bold(700)

### 10.5 间距 / 圆角 / 阴影 / 模糊

- **间距**（4px 基准）：1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64
- **圆角**：sm=8 md=12 lg=16（GlassCard 默认）xl=24 full=9999
- **阴影**（极柔和）：sm / md / lg / glow（粉色光晕，focus/active 用）
- **模糊**：sm=blur(8px) md=blur(16px)（GlassCard 默认）lg=blur(24px)

### 10.6 Glass 效果定义

```css
.glass {
  background: var(--color-surface);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

**不使用**：厚重的白色不透明卡片、高饱和渐变背景、深色模式（当前只做浅色）。

---

## 十一、UI 组件结构

### 11.1 共享组件清单（`src/shared/ui/`）

| 组件 | 文件 | 用途 | 关键 Props |
|---|---|---|---|
| **GlassCard** | `GlassCard.tsx` | 所有卡片的容器 | `padding?, onClick?, hover?` |
| **GlassButton** | `GlassButton.tsx` | 按钮 | `variant: primary/secondary/ghost/danger`, `size: sm/md/lg`, `loading?, disabled?` |
| **GlassInput** | `GlassInput.tsx` | 文本输入 | `label?, placeholder?, error?, type?` |
| **SectionHeader** | `SectionHeader.tsx` | 区块标题 | `title`, `action?` |
| **StatusBadge** | `StatusBadge.tsx` | 状态/类型标签 | `variant`, `text`, `color?` |
| **EmptyState** | `EmptyState.tsx` | 空状态 | `icon, title, description?, action?` |
| **Progress** | `Progress.tsx` | 进度条 | `value: 0-1`, `showLabel?, label?` |
| **Modal** | `Modal.tsx` | 居中弹窗 | `open, onClose, title, children` |
| **BottomSheet** | `BottomSheet.tsx` | 底部弹出（添加/编辑首选） | `open, onClose, title, children, height?` |
| **TabBar** | `TabBar.tsx` | 底部导航栏 | `items[], activeRoute` |
| **SegmentedControl** | `SegmentedControl.tsx` | 选项切换 | `options[], value, onChange` |

### 11.2 组件使用规则

1. 所有页面和 feature 组件**只能使用 `shared/ui/` 中的组件**，不允许自己写 `<button>`、`<input>`、`<div className="card">`
2. 需要的样式 `shared/ui` 没有时，**先扩展 Design System token 或组件**，再使用
3. feature 内部组件（如 `TodoItem`）可以组合 `GlassCard` + `StatusBadge`，但不能重新定义颜色
4. `BottomSheet` 是添加/编辑的首选交互方式（比跳转页面层级浅），`Modal` 用于确认删除
5. 图标统一用 `lucide-react`，不混用多个图标库

---

## 十二、开发阶段与任务状态

### 当前阶段：V1 迭代中（MVP 已完成）

### Phase 0：项目初始化（5 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 0.1 初始化 Vite + React + TS | ✅ |
| 0.2 配置 Tailwind + 设计 Token | ✅ |
| 0.3 安装核心依赖 | ✅ |
| 0.4 配置 PWA | ✅ |
| 0.5 创建目录结构 | ✅ |

### Phase 1：数据层 + Design System（6 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 1.1 定义 Domain 类型 | ✅ |
| 1.2 创建 Dexie 数据库 | ✅ |
| 1.3 实现 Repository 层 | ✅ |
| 1.4 实现通用工具函数 | ✅ |
| 1.5 Design System 组件第一批 | ✅ |
| 1.6 Design System 组件第二批 | ✅ |

### Phase 2：业务模块（4 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 2.1 Todo 模块 | ✅ |
| 2.2 Schedule 模块 | ✅ |
| 2.3 Mood 模块 | ✅ |
| 2.4 Today 聚合模块 | ✅ |

### Phase 3：集成与打磨（5 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 3.1 路由与全局布局 | ✅ |
| 3.2 App 启动数据加载 | ✅ |
| 3.3 More/Settings/About + 数据导出 | ✅ |
| 3.4 跨模块集成测试与 Bug 修复 | ✅ |
| 3.5 最终打磨与 PWA 验收 | ✅ |

### Phase 4：V1 — Cycle 生理周期模块（6 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 4.1 Cycle 数据模型 + Dexie 表 + Repository | ✅ |
| 4.2 CycleCalculator 纯函数 | ✅ |
| 4.3 Cycle Store + useCycle Hook | ✅ |
| 4.4 Cycle UI 组件 | ✅ |
| 4.5 整合到 Wellness + Today | ✅ |
| 4.6 构建验证 + 集成测试 + 计划书更新 | ✅ |

### Phase 5：V1 — AI 智能建议模块（7 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 5.1 AI 数据模型 + 设置存储 | ✅ |
| 5.2 AIService 服务层 | ✅ |
| 5.3 AI Store + Hook | ✅ |
| 5.4 AI UI 组件 | ✅ |
| 5.5 Settings 页面增加 AI 配置 | ✅ |
| 5.6 Today 页面整合 AI 建议 | ✅ |
| 5.7 构建验证 + 集成测试 + 计划书更新 | ✅ |

### 部署阶段 — ✅ 已完成

| 任务 | 状态 |
|---|---|
| GitHub 私有仓库创建 | ✅ |
| 代码推送 | ✅ |
| Netlify 部署 | ✅ |
| SPA 路由配置（_redirects） | ✅ |
| 在线访问验证 | ✅ |

### Phase 6.1：Supabase 项目 + 数据库（6 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 6.1.1 创建 Supabase 项目 personal-life-os | ✅ |
| 6.1.2 4 张表（todos/schedule_events/mood_records/period_records） | ✅ |
| 6.1.3 RLS 行级安全策略（每表 4 条） | ✅ |
| 6.1.4 索引 + updated_at 自动更新触发器 | ✅ |
| 6.1.5 API URL + publishable key 配置（.env） | ✅ |
| 6.1.6 SQL 迁移文件（supabase/migrations/001_init_schema.sql） | ✅ |

### Phase 6.2：Auth 账号系统（6 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 6.2.1 安装 @supabase/supabase-js | ✅ |
| 6.2.2 Supabase 客户端（src/shared/lib/supabase.ts） | ✅ |
| 6.2.3 Auth 模块（types/store/hooks/components） | ✅ |
| 6.2.4 登录/注册页面（全中文界面） | ✅ |
| 6.2.5 Session 持久化管理 | ✅ |
| 6.2.6 设置页面云同步状态显示 | ✅ |

### Phase 6.3：Sync Layer 同步层（7 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 6.3.1 CloudRepository（Supabase 访问 + 字段名映射） | ✅ |
| 6.3.2 SyncService（拉取/推送/冲突处理） | ✅ |
| 6.3.3 Sync Store（同步状态管理） | ✅ |
| 6.3.4 4 个 Repository 改造（变更后异步推送） | ✅ |
| 6.3.5 AppInitializer 改造（登录后自动拉取） | ✅ |
| 6.3.6 设置页面手动同步按钮 + 同步状态 | ✅ |
| 6.3.7 类型检查 + 构建验证 | ✅ |

### Phase 6.4：离线模式优化 + 联网自动同步（6 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 6.4.1 离线检测（navigator.onLine + online/offline 事件） | ✅ |
| 6.4.2 离线时累积推送队列，不尝试执行 | ✅ |
| 6.4.3 联网后自动处理推送队列 + 延迟全量拉取 | ✅ |
| 6.4.4 网络错误时重新放回队列，下次重试 | ✅ |
| 6.4.5 Sync Store 添加 isOnline 状态 + 网络监听 | ✅ |
| 6.4.6 设置页面显示离线状态 + 离线禁用同步按钮 | ✅ |

### Phase 6.5：同步功能完善（3 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 6.5.1 推送队列持久化（localStorage，刷新后不丢失） | ✅ |
| 6.5.2 Today 页面同步状态指示器（SyncStatusBadge 组件） | ✅ |
| 6.5.3 同步冲突处理（最后修改胜出）+ 错误日志 | ✅ |

### Phase 7.1：通知提醒系统（4 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 7.1.1 Notification 模块架构（types/Service/store/hook） | ✅ |
| 7.1.2 浏览器通知权限管理 + 通知调度 | ✅ |
| 7.1.3 Todo 截止提醒 + 课程开始提醒（可配置提前时间） | ✅ |
| 7.1.4 App 内提醒中心 UI + 设置页面通知设置 | ✅ |

### Phase 8.1：数据分析与趋势（6 项）— ✅ 已完成

| 任务 | 状态 |
|---|---|
| 8.1.1 数据分析模块架构（types/AnalyticsService/store/hook） | ✅ |
| 8.1.2 情绪趋势计算（近7天/30天/90天） | ✅ |
| 8.1.3 Todo 完成率统计（每日/总体/逾期） | ✅ |
| 8.1.4 周期统计（周期长度/经期长度/规律程度） | ✅ |
| 8.1.5 图表组件（BarChart/LineChart/ProgressRing/StatCard） | ✅ |
| 8.1.6 数据分析页面 + 导航更新 | ✅ |

### 当前阶段：UI Migration Layer 1（Phase 1-5 完成，等待 Phase 6 人工验收）

**UI Migration 背景（2026-08-31）**：
- UI Preview 项目（`D:\lifeUI_preview`）已完成 Layer 1 设计并正式冻结
- 迁移交接文档：`D:\lifeUI_preview\docs\UI_MIGRATION_HANDOFF.md`
- 迁移在独立分支 `feature/ui-migration-layer1` 进行，未 push
- 严格按照 6 Phase 顺序逐步迁移，每步验证后再继续
- 不修改业务逻辑、数据层、AI、同步、PWA 配置

**UI Migration 6 Phase 计划**：

| Phase | 内容 | 状态 |
|---|---|---|
| Phase 1 | 设计基础：tokens.css + globals.css 合并 | ✅ 已完成 |
| Phase 2 | 共享组件：shared/ui 组件替换 + 新增 | ✅ 已完成 |
| Phase 3 | 核心视觉系统：BackgroundSystem + BottomNav + App Shell | ✅ 已完成 |
| Phase 4 | 心情系统：MoodLifeform A/B + MoodPicker 接入真实数据 | ✅ 已完成 |
| Phase 5 | 页面重布局：Today/Schedule/Todo/Wellness/More 5 个页面 | ✅ 已完成 |
| Phase 6 | PWA + 收尾：manifest + 图标 + 全页面回归 + 真机验证 | ⏳ 待人工验收后启动 |

**Migration Acceptance + Bug Fix 阶段（2026-08-31）**：

审计结果：
- ✅ Phase 2 共享组件：9 替换 + 3 新增，所有组件向后兼容，使用方无需修改
- ✅ Phase 3 核心视觉系统：BackgroundSystem + BottomNav + AppLayout，safe-area 适配正确，页面滚动正常
- ✅ Phase 4 心情系统：lifeform 资产架构 + MoodLifeform A/B + MoodPicker，与真实 useMood() 数据链路正确
- ✅ Phase 5 页面重布局：5 个页面保持业务逻辑不变，统一 UI 风格
- ✅ 未误迁移 Preview Mock、Preview 专用状态或 Layer 2 实验代码
- ✅ 未越界修改 Hook / Store / Domain / Repository / Infrastructure / AI / Sync / Auth
- ✅ 文件范围：全部在 UI Layer（components/pages/layouts/shared/ui/styles）

已修复的 Bug：
1. **Pre-existing UI Bug**：ScheduleForm 时间选择器在窄屏 iPhone viewport 下横向重叠
   - 修复：grid-cols-2 → grid-cols-1 sm:grid-cols-2 响应式布局
   - 不改变业务逻辑/数据结构/交互语义

2. **Migration Bug**：Text Protection 的 `[data-bg="image"]` 选择器永远不生效
   - 原因：AppLayout 根 div 遗漏 data-bg 属性（UI Preview 有，迁移时遗漏）
   - 修复：AppLayout 根 div 添加 data-bg={DEFAULT_BACKGROUND_CONFIG.source}
   - 影响：自定义图片背景下的文字保护（h1 text-shadow + .text-shield）现在可以正常生效

自定义背景文字问题最终判定：
- 之前是 Migration Bug（data-bg 属性缺失导致 Text Protection 完全不生效）
- 已修复，修复后与 UI Preview Frozen Layer 1 一致
- 如果修复后在极端背景下仍然不够清晰，属于 Layer 1 当前技术边界，记录为 Layer 2 待办（Adaptive Text Protection / Canvas 图像分析等）

验证：
- ✅ tsc --noEmit 通过
- ✅ npm run build 成功
- ✅ iPhone 真机初步验收通过（用户反馈）

**Phase 6 最终验收 + Bug Fix（2026-08-31）**：

iPhone 真机验收发现的问题及修复：

P0/P1 功能可用性：
1. **心情记录保存无实际反馈 + Todo 创建报错 crypto.randomUUID**
   - 根本原因：`generateId()` 使用 `crypto.randomUUID()`，在 Safari 某些版本/非安全上下文/PWA standalone 中不可用
   - 影响：moodRepository.create 和 todoRepository.create 全部失败，导致心情和待办都无法保存
   - 修复：重写 `generateId()`，优先使用 `crypto.getRandomValues()`（广泛支持），后备 `Math.random()`
   - 同时解决问题 1 和问题 2

2. **新建日程页面 Safari 无法滚动到确认按钮**
   - 原因：BottomSheet 的 Sheet 容器未使用 flex 布局，内容区域 `overflow-y-auto` 在 Safari 中无法正确收缩滚动
   - 修复：Sheet 容器添加 `flex flex-col`，drag handle/title 添加 `shrink-0`，内容区域添加 `flex-1 min-h-0`
   - 经典 Safari flexbox + overflow 问题

P2 交互/UI：
4. **状态页面选择心情选中反馈不明显**
   - 增强选中态：主色浅色背景（color-mix 18%）+ 主色边框（45%）+ 主色文字 + 柔和阴影 + scale-110
   - 未选中态：opacity 从 60% 降到 50%，增加对比度
   - 保持 Layer 1 已冻结的视觉语言

5. **日程时间输入框宽度问题**
   - GlassInput input 添加 `min-w-0`，确保在 grid/flex 布局中正确收缩
   - 配合之前的 `grid-cols-1 sm:grid-cols-2` 响应式修复

验证：
- ✅ tsc --noEmit 通过
- ✅ npm run build 成功
- ⏳ iPhone 真机再次验证（待用户确认）

**Phase 1 完成详情（2026-08-31）**：

修改文件（仅 2 个，严格遵守范围）：
- `src/styles/tokens.css` — 合并重写
- `src/styles/globals.css` — 合并重写

tokens.css 合并内容：
- 主色替换：`#FB6F92`（亮粉）→ `#C98B9E`（Dusty Rose，低饱和）
- 背景替换：`#FFF8FA` → `#EEE9EF`（清冷紫灰）+ `#FDFAF9`（暖白）
- 情绪等级色：彩虹色（红→绿）→ 统一玫瑰色系（深→浅）
- 语义色：高饱和版 → 低饱和柔和版
- 业务语义色保留：日程类型色（class/personal/rest/other）变量名和语义完全保留，值同步为新低饱和版（与对应语义色保持一致）
- 新增：玻璃材质五层 token、背景材质系统（5 种）、Lifeform 统一 token、Motion Tokens、辅助色、阴影扩展（xs/glass/float）、模糊扩展（content + saturate/brightness）、圆角扩展（2xl）

globals.css 合并内容：
- `.glass` 替换为五层增强版（底色 + 模糊 + 表面光线 ::before + 底部反光 ::after + 边缘厚度）
- 新增：`.glass-strong` / `.glass-subtle` / `.surface-soft` / `.divider-soft` / `.scrim-card`
- 新增：背景材质类（5 种）、`.liquid-drift-1/2`、`.glass-sheen`
- 新增：Text Protection（`[data-bg="image"] h1` + `.text-shield`）
- 动画系统扩展：新增 breathe/glow-pulse/lifeform-bloom/shimmer/core-pulse/glass-sheen-move/liquid-drift/ring-fade
- 新增：交错延迟（.stagger-1~6）、Safe Area（.pb-safe/.pt-safe）
- 新增：`@media (prefers-reduced-motion: reduce)` 无障碍支持
- body 背景渐变保留作为 Phase 1 fallback（BackgroundSystem 在 Phase 3 迁移）

验证结果：
- ✅ `npx tsc --noEmit` 通过
- ✅ `npm run build` 成功（8.70s，CSS 31.29 kB）
- ✅ dev 服务器运行正常（http://10.15.23.93:5173）
- ✅ 构建产物 CSS 验证：主色 Dusty Rose、玻璃材质五层、业务语义色保留、.glass:before/:after 存在
- ✅ 未使用的类被 Tailwind purge 移除（正常行为，后续 Phase 使用时自动包含）

未修改：所有组件、页面、Hook、Store、Domain、Repository、Infrastructure、AI、Sync、PWA、app 目录、vite.config.ts、tailwind.config.js、index.html

**Phase 2 完成详情（2026-08-31）**：

替换 `src/shared/ui/` 下 9 个基础组件，新增 3 个组件，所有组件均做向后兼容处理：
- GlassButton：4 变体（primary/secondary/ghost/danger）× 3 尺寸，向后兼容 loading/leftIcon/rightIcon
- GlassInput：surface-soft 背景，新增 GlassTextarea 导出
- SegmentedControl：泛型组件 `<T extends string>`
- StatusBadge：6 变体，向后兼容旧版 text+color API，支持日程类型 variant
- EmptyState、SectionHeader、Modal（portal+ESC+backdrop+滚动锁定）、BottomSheet（向后兼容 height）
- 新增 CleanCard（轻结构内容卡片）、ProgressRing（环形进度条）、MoodTrendChart（心情趋势折线图，适配 LifeOS MoodLevel 类型）

验证：tsc 通过，build 成功（8.94s）

**Phase 3 完成详情（2026-08-31）**：

新增组件：
- BackgroundSystem：3 极光版本（lavender-dawn/rose-mist/warm-bloom）+ 5 材质模式（original-soft/mist/frosted-glass/liquid/dew）+ 用户图片接口 + Text Protection + Dew 水滴纹理
- GlassFilters：SVG 滤镜定义（dew-displace/glass-edge-soft/lifeform-core-glow/dew-drop-1/2）
- BottomNav：漂浮胶囊式 Liquid Glass 底部导航，替换 TabBar

更新：
- AppLayout：接入 BackgroundSystem + BottomNav + GlassFilters，移除 body 背景渐变，主内容区添加底部 padding，通知按钮改用 glass-strong
- globals.css：移除 body 背景渐变（BackgroundSystem 接管）

保留：TabBar.tsx 保留作为备份，不删除

验证：tsc 通过，build 成功（9.07s）

**Phase 4 完成详情（2026-08-31）**：

新增组件（`src/features/mood/components/`）：
- lifeform/ 可替换资产架构：types.ts（LifeformAsset/LifeformLevelData/LifeformShape/LifeformGradient/LifeformAnimation/MoodLevel）、assets.ts（ASSET_FLOWER 五瓣花 + ASSET_CORE System Core，12 控制点 Catmull-Rom 有机轮廓预计算）、LifeformRenderer.tsx（通用渲染器：唯一渐变 ID + CSS 变量 + 呼吸/脉动/环/光晕/盛放进入动画）、index.ts（模块入口）
- MoodLifeformA.tsx：五瓣花生命体薄包装（MoodPicker 小尺寸用）
- MoodLifeformB.tsx：System Core 抽象有机生命体薄包装（Dashboard 大尺寸用）
- MoodPicker.tsx：5 级心情选择器，variant A/B 切换，数字 size，激活态 scale-110 + 玻璃背景

更新使用方：
- MoodQuickRecord：MoodPicker API 适配（variant=A, size=46）
- WellnessPage：MoodPicker API 适配（value=null, variant=A, size=46）
- MoodCard：MoodPicker API 适配（value=null, variant=A, size=40）

验证：tsc 通过，build 成功（8.97s）

**Phase 5 完成详情（2026-08-31）**：

重布局 5 个页面，保持业务逻辑不变，统一 UI 风格：
- TodayPage：顶部区域（日期+问候+同步状态）、心情卡片、今日进度（ProgressRing + TodayProgress 横向布局）、今日日程（SectionHeader + 全部链接）、今日待办（SectionHeader + 全部链接）、周期状态、AI 建议（Sparkles 图标 + 标题）
- SchedulePage：顶部标题 + 周/日视图切换、日期导航（surface-soft 卡片）、回到今天按钮、日程内容（GlassCard）、悬浮添加按钮（glass-strong + 主色背景）
- TodoPage：顶部标题 + 统计、筛选栏、待办列表（GlassCard）、悬浮添加按钮（glass-strong + 主色背景）
- WellnessPage：顶部标题 + 情绪/周期模块切换、日期显示、情绪模块（今日/历史视图切换、心情卡片、记录列表）、周期模块（状态卡片、历史列表）、悬浮添加按钮（根据模块切换图标 Plus/Droplets）
- MorePage：顶部标题、菜单列表（数据分析/设置/关于，图标背景使用主色 12% 透明度）、底部标语

所有页面统一使用 animate-fade-slide-up + stagger-1~6 交错动画

验证：tsc 通过，build 成功（9.03s）

**Git commits（feature/ui-migration-layer1 分支，未 push）**：
- Phase 1：tokens.css + globals.css 合并 + 文档更新
- Phase 2：shared/ui 9 组件替换 + 3 组件新增
- Phase 3：BackgroundSystem + GlassFilters + BottomNav + AppLayout 更新
- Phase 4：lifeform 资产架构 + MoodLifeformA/B + MoodPicker + 使用方适配
- Phase 5：5 个页面重布局（23bd10c）

**暂停的操作（持续有效）**：
- 配置 Netlify 环境变量
- 推送触发 Netlify Production Deploy
- 修改 Supabase 数据库
- 增加新的云同步逻辑
- 反复进行线上部署测试

**Netlify 使用原则**：
- 除非用户明确说"现在可以部署线上版本了"，否则不 push 到会触发 Production Deploy 的分支
- 开发阶段优先：本地开发 + 本地 build + 局域网 iPhone 测试

---

### 历史阶段：第一版 UI 与本地验收阶段（2026-08-30，已被 UI Migration 取代）

**开发阶段调整（2026-08-30）**：
- 暂停 Netlify / Supabase 云端功能配置与部署
- 现有功能冻结（Supabase / AI / PWA / 通知 / Cycle / Health 接口保持可用，不继续扩展）
- 进入第一版 UI 与本地验收阶段
- 等待用户提供 UI/UX 优化方案

**当前优先级**：
1. UI 视觉质量
2. 中文界面完整性
3. 移动端体验
4. 页面动画与过渡
5. Loading / Empty / Error 状态
6. 交互细节
7. 本地稳定性

**暂停的操作**：
- 配置 Netlify 环境变量
- 推送触发 Netlify Production Deploy
- 修改 Supabase 数据库
- 增加新的云同步逻辑
- 反复进行线上部署测试

**Netlify 使用原则**：
- 除非用户明确说"现在可以部署线上版本了"，否则不 push 到会触发 Production Deploy 的分支
- 开发阶段优先：本地开发 + 本地 build + 局域网 iPhone 测试

**后续流程**：
```
现有功能冻结 → 本地完整测试 → UI/UX 美化 → 移动端适配 → 动画与交互优化
→ 本地 + iPhone 真机验收 → 确认第一版正式版完成 → 最后统一处理 Netlify + Supabase Production
→ 云端最终验收
```

### 待启动的 V1 迭代

| 方向 | 说明 | 状态 |
|---|---|---|
| 多端同步验证 + 离线优化 | 电脑↔手机双向同步测试，离线模式优化 | ✅ 已完成（Phase 6.4-6.5） |
| 通知提醒 | App 内提醒 + PWA 通知（iOS 限制需说明） | ✅ 已完成（Phase 7.1） |
| 数据分析与趋势 | 情绪趋势/Todo完成率/周期统计 | ✅ 已完成（Phase 8.1） |
| Health 健康数据 | 睡眠/步数/心率等，当前只预留接口 | ⏳ 待启动 |
| Netlify 访问控制 | 个人使用无需密码，未来分享测试时再考虑 | ⏳ 待启动（备注） |

---

## 十六、V1 后续功能规划（本次不实现，仅记录）

### 16.1 中央动态 Mood Lifeform（缺失功能，后置到 V1）

**现状**：UI Preview 中设计了中央大型动态心情生命体（MoodLifeformB，110px，System Core 抽象有机生命体），用于 Today 页面和 Dashboard 的核心视觉展示。

**LifeOS 本体当前状态**：
- MoodLifeformB 组件已迁移（`src/features/mood/components/MoodLifeformB.tsx`）
- lifeform 资产架构已迁移（ASSET_CORE 等）
- 但是，Today 页面和 Wellness 页面中**尚未接入**中央大型动态 Lifeform
- 当前 Today 页面使用的是 MoodCard（小尺寸表情 + 文字），不是中央大型 Lifeform

**为什么现在不补**：
- 中央动态 Lifeform 不只是一个动画组件，它依赖：
  - 真实的 Daily Mood 状态聚合（不是简单的最新一条 MoodRecord）
  - 一天多次 Mood Event 的时间序列数据
  - 生命体状态与用户当前时间/能量/作息的联动
  - 完整的进入/切换/呼吸动画设计
- 临时补一个假数据动画会破坏产品完整性
- 应该在 V1 阶段配合 Mood Event / Daily Mood 数据模型一起实现

**记录为 V1 功能**：中央动态 Mood Lifeform（Dashboard Core），依赖 Daily Mood 聚合与 Mood Event 时间序列。

---

### 16.2 Mood Event / Daily Mood / Weekly / Monthly 系统规划

**V1.1 已完成（2026-08-31）**：
- ✅ 新增 `moodAggregator.ts`（Domain 层纯函数：时段分类、排序、计数、简单平均、极差、众数）
- ✅ TodayState.mood 增加 `count`，TodayAggregator 计算
- ✅ MoodCard 展示"今天已记录 X 次"
- ✅ Mood 页面同一天内记录显式按时间降序排序（健壮性）
- ✅ 复用现有 MoodRecord 数据模型（已支持一天多条），未新增数据库表
- ✅ 明确不实现无依据的产品规则（时间加权平均、数据充足性判断等）

**V1.2 已完成（2026-08-31）— Mood Lifeform 提前接入**：
- ✅ Today 页面 MoodCard：小表情替换为 MoodLifeformB（72px，animate=true）
- ✅ Wellness 页面：大表情替换为 MoodLifeformB（96px，animate=true）
- ✅ 用最新 MoodRecord.level 驱动，后续 Daily Mood 稳定后切换为 Daily Mood → Lifeform
- ✅ 空状态保持原有的 MoodPicker 二次确认交互

**V1.3 已完成（2026-08-31）— Daily Mood 聚合（Domain 派生，不新增表）**：
- ✅ 审计 7 个问题全部通过：不需要持久化、可 Domain 派生、用户手动填写后置、天然一致、无多层重复存储、对 Supabase 无影响、无 migration 风险
- ✅ 新增 buildDailyMood() 纯函数 + DailyMoodResult 类型
- ✅ 数据充足性稳健方案：0条→unknown，1条→single_record，≥2条→sufficient
- ✅ Wellness 页面展示 Daily Mood 可解释中文摘要
- ✅ 明确不实现无依据规则：时间加权平均、"覆盖2时段算充足"等

**V1.4 已完成（2026-08-31）— Today 页面整合 Daily Mood 摘要**：
- ✅ TodayState.mood 增加 daily: DailyMoodResult
- ✅ TodayAggregator 计算 dailyMood（buildDailyMood）
- ✅ MoodCard 展示 Daily Mood 可解释中文摘要
- ✅ Today 页面作为核心，能看到全天情绪整体状态（不只是最新一条）

**V1.5 已完成（2026-08-31）— Mood 记录编辑功能**：
- ✅ MoodQuickRecord 支持编辑模式（initialRecord prop，预填 level/tags/note，标题"编辑心情"）
- ✅ MoodRecordItem 增加编辑按钮（Pencil 图标，与删除按钮并列，hover 显示）
- ✅ MoodHistoryList 增加 onEdit prop
- ✅ WellnessPage 增加 moodEditTarget 状态，区分创建/编辑提交
- ✅ 编辑后 Daily Mood 摘要自动更新（派生结果，天然一致）

**V1.6 待开发（Weekly Mood 统计）**：
- ⚠️ 需数据积累，建议先使用一段时间积累真实数据后再决定统计 UI
- 基于 Daily Mood（已完成）计算周统计，作为 Domain 派生结果，不新增表

**V1.7 待开发（Monthly Mood 统计）**：
- ⚠️ 进一步后置，需要更长时间的数据积累

#### Mood Event（一天多次主动记录）

用户可以在一天内主动记录多个时间点的 Mood：
- 08:30 开心
- 12:40 不开心
- 21:10 平静

Mood Event 应保留时间信息（createdAt 已包含时间，但需要明确的时间字段用于时段分析）。

当前 MoodRecord 模型已支持一天多条记录（date + createdAt），但 UI 层面主要展示"最新一条"，未充分利用时间序列。

#### Daily Mood（全天整体感受）

Daily Mood 与 Mood Event 分离：
- 用户可以主动填写当天整体感受，但不强制
- 如果用户没有主动填写：程序根据当天 Mood Events 进行确定性的聚合计算
- 如果数据不足：不强行生成结果，允许 unknown / insufficient
- 不直接调用 AI

聚合算法（确定性程序逻辑，后续实现）：
- 简单平均（所有 event 的 level 平均）
- 时间加权（晚间权重更高，因为更接近全天整体感受）
- 众数/主导情绪（dominant mood）
- 极差/波动范围（mood range）
- 数据量阈值（少于 2 条标记为 insufficient）

#### Weekly / Monthly Mood

周/月统计基于 Daily Mood，而不是简单直接平均所有瞬时 Mood Event：
- dominant mood（主导情绪）
- mood range（情绪波动范围）
- daily variance（日间方差）
- event count（记录次数）
- morning / afternoon / evening mood（早中晚分布）
- 趋势与波动情况

先使用确定性程序逻辑，不使用 AI。

#### AI 使用原则

LifeOS 后续保持：**Deterministic First, AI Second**

凡是可以通过明确规则、统计、聚合、阈值、时间序列等方式可靠计算的内容，优先由程序完成。

AI 只在需要结合复杂文本、跨领域上下文或无法用确定性规则合理解决的问题上介入。

不要为了"智能"而增加 AI 调用和 token 消耗。

---

### 16.3 自定义背景 + 高级文字保护（Layer 2，本次不实现）

本体目前暂不具备完整自定义背景能力。

自定义背景 + 高级文字保护属于 Layer 2：
- Canvas 图像分析
- 动态对比度检测
- Adaptive Text Protection
- 高级材质引擎
- WebGL / 高级渲染

当前 Layer 1 已实现：
- BackgroundSystem 支持 source='image' + imageUrl（接口预留）
- Text Protection Combined 方案（增强垂直渐变 + h1 text-shadow + .text-shield）
- Scrim Card（列表/高密度区域保护）

这些在启用自定义背景后会自动生效。如果在极端背景下仍然不够清晰，属于 Layer 1 技术边界，记录为 Layer 2 待办。

---

### 16.4 性能问题诊断（待观察，不盲目优化）

**现象**：iPhone 上存在轻微卡顿。

**诊断结果**：
- 目前无法稳定复现明确的性能瓶颈
- 可能的相关因素（未确认）：
  - backdrop-filter 在 Safari 中的性能消耗（BottomNav、Modal、BottomSheet、GlassCard 大量使用）
  - CSS 动画数量（animate-fade-slide-up + stagger、breathe、glass-sheen-move 等）
  - React re-render（Zustand store 变化触发的组件重渲染）
  - DOM 数量（页面组件数量）
- 是否 Safari 特有：未确认
- 明确性能瓶颈：未定位

**决策**：
- 记录为待观察，不修改
- 如果后续能稳定复现并明确定位瓶颈，只修明确的性能问题
- 不进行盲目"性能优化"或大规模重构

---

### 16.5 当前阶段明确后置的功能清单

| 功能 | 后置阶段 | 原因 |
|---|---|---|
| 中央动态 Mood Lifeform | V1 | 依赖 Daily Mood 聚合与 Mood Event 时间序列 |
| Mood Event 时间序列 UI | V1 | 需要新的数据模型和 UI 设计 |
| Daily Mood 聚合 | V1 | 依赖 Mood Event，需要确定性聚合算法 |
| Weekly / Monthly Mood 统计 | V1 | 依赖 Daily Mood |
| 自定义背景完整能力 | Layer 2 | 需要 Canvas 图像分析、Adaptive Text Protection |
| Adaptive Text Protection | Layer 2 | 需要动态对比度检测 |
| HealthKit / Apple Watch | Future iOS | 当前不开发原生 iOS |
| Widget | Future iOS | 当前不开发原生 iOS |
| 通知推送系统 | V1/V2 | 当前仅本地提醒，无推送 |
| 云端账号多用户 | V2 | 当前单用户本地优先 |

---

## 十三、未来 iOS 迁移策略

> 当前不开发 iOS。以下为架构设计时的迁移考量，目的是"不为未来过度设计，但尽可能避免现在做出无法迁移的架构"。

### 13.1 可复用层（现在就要保护好）

| 层 | 复用方式 | 现在的保护措施 |
|---|---|---|
| Supabase 数据库（未来） | 直接复用 | 当前不接 Supabase，但数据模型设计考虑未来同步（UUID 主键、updatedAt） |
| Edge Functions（未来） | 直接复用 | AI 逻辑未来放服务端，客户端不持有 API Key |
| 数据模型 / Schema | 复用，SwiftData 模型对应同一套字段 | TypeScript 类型定义清晰，字段命名规范 |
| 业务规则（纯函数） | 可移植到 Swift 或通过 API 暴露 | TodayAggregator/ScheduleExpander/CycleCalculator 等写成纯函数，不依赖 React/DOM/Dexie |
| Repository 接口设计 | 参考其抽象，iOS 用 SwiftData 实现同样接口 | 接口与实现分离 |
| Design System token | 设计语言可参考 | CSS 变量定义，iOS 可对应到 SwiftUI Color/Font |

### 13.2 必须重写层

| 层 | 重写原因 |
|---|---|
| UI 层 | React → SwiftUI |
| 本地存储实现 | Dexie/IndexedDB → SwiftData/Core Data |
| 状态管理 | Zustand → @Observable/SwiftData |
| PWA Service Worker | iOS 原生不需要 |
| 本地通知 | Notification API → UNUserNotificationCenter |
| HealthKit | 全新接入 |
| Apple Watch / WatchConnectivity | 全新开发 |
| Widget / Live Activity | 全新开发，WidgetKit |
| App 生命周期 | 浏览器生命周期 → iOS 应用生命周期 |

### 13.3 现在就要遵守的"迁移友好"规则

1. **业务逻辑写在纯函数里**：`domain/` 和 `features/*/services/` 中的代码不 import React、不访问 `window`/`document`
2. **AI 逻辑未来放服务端**：当前纯前端直连，架构上预留 Edge Function 代理模式
3. **数据模型与 UI 分离**：TypeScript 类型定义就是未来 Swift 模型的蓝图
4. **不使用浏览器专有 API 做核心功能**：核心功能不依赖 `localStorage`/`document.cookie`（AI 设置当前用 localStorage，未来迁移时需调整）
5. **Repository 接口与实现分离**：未来换存储只换实现
6. **不要把业务逻辑写在 React 组件里**：组件只做展示和交互

### 13.4 迁移时的共存策略

未来 iOS App 上线后：
- PWA 版本继续维护（Android/桌面用户）
- 两个客户端共享同一个 Supabase 后端和数据
- 业务规则以服务端（Edge Functions）为真相源，客户端只做本地缓存和 UI

---

## 十四、架构决策记录（ADR）

| 编号 | 决策 | 理由 | 替代方案 |
|---|---|---|---|
| ADR-001 | 使用 Vite 而非 Next.js | PWA + 本地优先 + SPA，Vite 更匹配；Next.js SSR/RSC 无意义且 PWA 支持碎片化 | Next.js static export |
| ADR-002 | 本地优先，IndexedDB(Dexie) 为主存储 | 离线可用，隐私数据默认本地；Supabase 未来只做同步 | Supabase 为主 |
| ADR-003 | 不使用 EventBus | 模块少、联动清晰可枚举，直接调用 + 状态订阅更可维护 | mitt 轻量事件库 |
| ADR-004 | TodayState 为派生 ViewModel，不存库 | 避免数据冗余和不一致，保证数据真相源唯一 | 存为每日快照表 |
| ADR-005 | AI 必须走 Edge Function 代理（未来） | 保护 API Key，可加限制和缓存，可切换供应商 | 客户端直接调用 |
| ADR-006 | AI 建议用户确认后才执行 | AI 不可信，用户保留控制权 | AI 自动执行 |
| ADR-007 | Zustand 而非 Redux | 轻量（1KB），个人项目足够，无样板 | Redux Toolkit / Jotai |
| ADR-008 | Mood/Cycle/Health 合并为 Wellness 页面 | 减少底部 Tab，统一"状态记录"类 | 各占一个 Tab |
| ADR-009 | MVP 不接 Supabase/AI | 控制范围，快速验证核心闭环 | 一开始就全量接入 |
| ADR-010 | ScheduleEvent 用 recurrence 字段而非独立 Course 表 | 统一事件模型，避免两张表关联查询 | 独立 Course 表 + Event 表 |
| ADR-011 | 全量加载到内存而非按需查询 | MVP 数据量小，内存操作性能足够，简化代码 | 按需查询/分页 |
| ADR-012 | 添加/编辑用 BottomSheet 而非跳转页面 | 减少导航层级，移动端体验更好 | 独立编辑页面 |
| ADR-013 | 不使用 MUI/Ant Design 等重型组件库 | 与玻璃拟态风格冲突，包体积大 | shadcn/ui 按需复制 |
| ADR-014 | recurrence 预留 weekRange/excludedDates/overrides | 用户反馈大学课程有单双周/调课/临时取消，预留扩展位 | 只支持每周重复 |
| ADR-015 | AI 当前纯前端直连 DeepSeek API | 个人使用，Key 暴露风险可接受；不搭后端代理简化开发 | Edge Function 代理 |
| ADR-016 | 部署 Netlify + GitHub 自动部署 | 静态托管 + HTTPS + 自动部署，适合 PWA | Vercel / 自托管 |

---

## 十五、风险登记与已知问题

### 15.1 风险登记

| 风险 | 严重度 | 说明 | 缓解措施 |
|---|---|---|---|
| PWA 通知在 iOS 不可靠 | 🔴 高 | iOS Safari PWA 后台通知基本不可用 | 不做后台通知推送；App 内提醒为主；明确告知用户限制 |
| 本地数据丢失 | 🟡 中 | 浏览器清理缓存/卸载 PWA 会丢失 IndexedDB | 提供 JSON 导出备份；引导用户定期导出；未来加云同步 |
| 多端数据不互通 | 🟡 中 | 当前数据存各设备本地，电脑和手机数据独立 | ✅ 已解决：Phase 6 接入 Supabase 云同步 |
| 范围蔓延 | 🟡 中 | 个人项目容易不断加功能导致烂尾 | 严格按 Phase 执行；新功能记入 backlog，不插入当前 Phase |
| ScheduleExpander 边界情况 | 🟡 中 | 跨天事件、时区、夏令时 | 假设单时区（本地时间）；跨天事件暂不支持；记录限制 |
| AI API 费用 | 🟡 中 | DeepSeek API 调用产生费用 | 用户可设置每日调用上限（默认3次）；纯前端不自动调用 |
| AI API Key 暴露 | 🟡 中 | 纯前端直连，Key 可从浏览器开发者工具看到 | 个人使用风险可接受；未来迁移到 Edge Function 代理 |
| 未来 iOS 迁移时业务逻辑绑死 React | 🟡 中 | 如果逻辑写在组件里，迁移要全部重写 | 严格执行"业务逻辑在纯函数/service 中"的规则；Code Review 检查 |
| recurrence 预留字段未来实现复杂 | 🟡 中 | overrides/excludedDates 实现需要仔细的展开逻辑 | 当前不实现；未来实现时先写充分的单元测试 |
| IndexedDB 浏览器兼容性 | 🟢 低 | 现代浏览器全部支持 | 目标浏览器 Chrome/Safari 最新版，不支持 IE |
| 玻璃效果性能 | 🟢 低 | backdrop-filter 在低端设备可能卡顿 | 控制玻璃卡片数量；避免滚动中大量玻璃层叠；必要时降级 |
| Netlify 站点名称不友好 | 🟢 低 | 自动生成的名称 astounding-torrone-5409bc 不好记 | 可后续绑定自定义域名或尝试其他可用名称 |
| 移动端列表项操作按钮不可见 | 🟡 中 | 所有列表项（Todo/Mood/Schedule/Cycle）的编辑/删除按钮使用 group-hover:opacity-100，触摸设备无 hover 状态，按钮永远不可见 | 暂缓，需统一设计移动端交互方案（左滑删除/始终显示/点击进入编辑后删除）；当前 Schedule/Todo 可点击条目进入编辑后删除 |

### 15.2 当前已知限制

1. ~~**数据不互通**：电脑和手机数据独立存储，无法同步~~ ✅ 已解决（Supabase 云同步）
2. **无后台通知**：PWA 在 iOS 无法后台推送通知（需 App 内提醒或未来原生通知）
3. **课程重复规则有限**：只支持每周重复，单双周/调课/临时取消的字段已预留但未实现
4. **AI 建议不持久化**：刷新页面后 AI 建议丢失，需重新生成
5. **无深色模式**：当前只做浅色 Pink Mist Glass 主题
6. **无数据导入**：只支持 JSON 导出备份，不支持从其他工具导入数据
7. **PWA 开发环境限制**：`npm run dev` 开发服务器不注册 Service Worker（devOptions.enabled: false），且局域网 HTTP 地址不满足 PWA 的 HTTPS 要求；PWA/standalone 功能必须在 `npm run build` + `npm run preview` 生产构建或 HTTPS 正式部署（Netlify）下测试；开发环境下从主屏幕图标启动可能表现为 Safari 普通网页模式（非本体 bug，已通过 git diff 确认迁移前后配置一致）
8. **PWA-STANDALONE-REAL-DEVICE-VERIFY**（待验收标记）：后续使用正式 HTTPS 部署地址，从 iPhone 16 Pro / iOS 26.3 的 Safari 添加到主屏幕，并从主屏幕图标启动后，验证内部操作过程中是否出现 Safari 浏览器顶部/底部 UI。当前开发服务器局域网 HTTP 环境不作为最终 PWA standalone 验收依据。暂不修改 PWA 配置。

### 15.3 已修复问题记录

| 日期 | 问题 | 根本原因 | 修复方案 | 经验教训 |
|---|---|---|---|---|
| 2026-08-30 | Supabase 未配置时应用启动崩溃，iPhone 永远停留在启动界面 | supabase.ts 中检查环境变量为空后只 console.warn，仍调用 createClient('','') 抛出 'supabaseUrl is required'，模块加载失败导致整个应用崩溃 | supabase 未配置时导出为 null；新增 isSupabaseConfigured 标志；auth/store 和 CloudRepository 所有方法检查标志，未配置时安全降级 | 外部服务初始化必须有安全降级；模块加载时的同步异常是致命的；本地正常≠生产正常；console.warn 不是错误处理 |
| 2026-08-30 | PWA 启动卡住，永远停留在启动界面 | main.tsx 中 registerSW() 在 React render() 之前同步调用，standalone 模式下抛异常阻塞 React 挂载 | React 挂载优先；registerSW 改动态 import + try-catch；添加 BOOT 诊断日志；6秒超时+8秒安全兜底双重保护 | 第三方初始化绝对不能放在 React 挂载之前；桌面正常≠移动端正常；内联 App Shell 是双刃剑；双重超时保护 |
| 2026-08-30 | PWA 白屏 + 无法自动更新 | index.html无内联加载界面；SW缺少cleanupOutdatedCaches；未手动注册SW；初始化无超时 | 内联App Shell；添加cleanupOutdatedCaches+navigateFallback；手动注册registerSW；8秒初始化超时+10秒同步超时 | PWA必须有内联App Shell；SW缓存必须配置旧缓存清理；任何异步初始化都要有超时保护 |
| 2026-08-30 | 云端同步失败，手机端看不到电脑端数据 | Supabase RLS INSERT 策略要求 `user_id = auth.uid()`，但推送时未设置 `user_id`，导致插入被静默拒绝 | CloudRepository 自动添加 `user_id`；新增 `pushAll()` 全量推送；手动同步同时执行拉取+推送 | 外部服务集成先检查权限模型；静默失败要警惕；双向同步要同时验证；全量同步作为兜底 |
| 2026-08-30 | Netlify 站点手机端打不开，返回 401 | Project visibility 设置为 Private，要求 Netlify 账号登录才能访问 | 改为 Public，个人使用无需密码 | 部署后立即验证多端访问；个人项目优先保证可用性 |
| 2026-08-31 | 日期/时间输入框在窄屏过长/重叠，多表单共同问题 | GlassInput外层div只有w-full缺少min-w-0；grid子项默认min-width:auto，即使内部input有min-w-0，外层div仍被date input隐式最小宽度撑宽 | GlassInput/GlassTextarea外层div添加min-w-0；共享层修复不逐页面打补丁 | grid/flex子项必须显式设置min-w-0才能正确收缩；共享组件要考虑作为grid子项的场景；浏览器实际DOM测量比CSS理论分析可靠 |
| 2026-08-31 | TodoItem 删除按钮不可见，用户无法删除待办 | TodoItem根div缺少group class，导致删除按钮的group-hover:opacity-100不生效，按钮永远opacity-0 | TodoItem根div添加group class | group-hover必须配合父元素group class使用；UI组件要检查hover状态是否真的生效；桌面端要实际hover验证 |
| 2026-08-31 | Schedule 删除功能完全无UI入口，用户无法删除日程 | SchedulePage有deleteTarget/handleDelete/删除确认弹窗，但setDeleteTarget从未被设置为非null值；ScheduleItem只有点击编辑无删除按钮；ScheduleForm无删除按钮 | ScheduleForm增加onDelete prop，编辑模式下左下角显示删除按钮；SchedulePage传递onDelete回调（设置deleteTarget+关闭表单+触发确认弹窗） | CRUD审计要检查D(删除)是否真的有UI入口；有删除逻辑不代表用户能触发；编辑表单中添加删除按钮是常见且安全的模式 |
| 2026-08-31 | Today首页重复模块：「今日日程」+「今日安排」重复，「今日待办」重复两次 | UI Migration后ScheduleList和TodoCheckList组件内部自带SectionHeader，而TodayPage又在外层包了一层SectionHeader，导致每个模块显示两个标题 | 移除子组件内部的SectionHeader，保留TodayPage外层SectionHeader（含「全部」链接）；Todo的「添加」按钮移到外层SectionHeader action中 | 组件迁移时要检查是否自带标题/头部；父子组件不要重复渲染同一信息；迁移后必须实际查看页面而不是只看代码 |
| 2026-08-31 | Cycle缺少删除入口，经期记录创建后找不到删除操作 | CycleHistoryList删除按钮使用group-hover:opacity-100，移动端不可见；PeriodForm编辑表单没有删除按钮 | PeriodForm增加onDelete prop，编辑模式下左下角显示删除按钮（与ScheduleForm一致）；WellnessPage传递onDelete回调 | 所有模块的编辑表单都应有删除按钮，确保移动端可访问；不要只依赖hover显示的操作按钮 |
| 2026-08-31 | Schedule时间选择出现异常竖线/黑色晕影（iPhone真机） | BottomSheet有两层backdrop-filter（backdrop的backdrop-blur-sm + sheet的glass-strong强模糊+伪元素+多层阴影），与Safari原生时间选择器交互时产生合成层渲染冲突（iOS Safari backdrop-filter已知bug） | BottomSheet的backdrop和sheet添加transform:translateZ(0)+will-change:transform，强制创建独立合成层 | iOS Safari的backdrop-filter多层叠加容易产生渲染artifacts；translateZ(0)是常见的合成层优化；电脑浏览器无法复现≠不是bug |
| 2026-08-31 | Daily Mood二次确认交互不一致：首页有二次确认，状态Tab一次点击就保存 | WellnessPage中无记录时的MoodPicker直接绑定handleMoodQuickPick（一次点击就createMood），与TodayPage的MoodCard二次确认逻辑不一致 | WellnessPage增加selectedMoodLevel本地状态，实现与MoodCard一致的二次确认：第一次点击只选中，确认后才保存；同时增加「清除今日记录」入口 | 同一数据在不同页面的交互规则必须一致；二次确认是防止误触的重要模式；清除入口是数据管理的基本能力 |
| 2026-08-31 | 全局一致性：TodoForm和MoodQuickRecord编辑表单没有删除按钮 | 与ScheduleForm/PeriodForm不一致，移动端用户进入编辑后无法删除 | TodoForm和MoodQuickRecord增加onDelete prop，编辑模式下显示删除按钮；所有使用页面传递回调 | 全局一致性审计要检查所有同类组件；编辑表单+删除按钮是CRUD完整的标准模式；不要逐模块遗漏 |

---

*文档结束。本文档随项目开发持续更新。任何与本文档冲突的实现，以实际代码为准并修正本文档；本文档与用户最新指令冲突时，以用户最新指令为准并更新本文档。*
