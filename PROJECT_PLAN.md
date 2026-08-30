# Personal Life OS — 项目状态总览

> **版本**：v6.0（MVP + V1 Cycle + V1 AI + Supabase云同步 + 离线模式 + 通知提醒 + 数据分析，已部署 GitHub + Netlify）
> **项目路径**：`D:\personal_Lifeos_project`
> **本文档地位**：项目当前状态的总览。描述"项目现在是什么样"。
> **最后更新**：2026-08-30（Phase 8.1 数据分析与趋势完成）
> **在线地址**：https://astounding-torrone-5409bc.netlify.app/
> **GitHub 仓库**：https://github.com/ting-png1/personal-life-os（私有）

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

### 待启动的 V1 迭代

| 方向 | 说明 | 状态 |
|---|---|---|
| 多端同步验证 + 离线优化 | 电脑↔手机双向同步测试，离线模式优化 | ✅ 已完成（Phase 6.4-6.5） |
| 通知提醒 | App 内提醒 + PWA 通知（iOS 限制需说明） | ✅ 已完成（Phase 7.1） |
| 数据分析与趋势 | 情绪趋势/Todo完成率/周期统计 | ✅ 已完成（Phase 8.1） |
| Health 健康数据 | 睡眠/步数/心率等，当前只预留接口 | ⏳ 待启动 |
| Netlify 访问控制 | 个人使用无需密码，未来分享测试时再考虑 | ⏳ 待启动（备注） |

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

### 15.2 当前已知限制

1. ~~**数据不互通**：电脑和手机数据独立存储，无法同步~~ ✅ 已解决（Supabase 云同步）
2. **无后台通知**：PWA 在 iOS 无法后台推送通知（需 App 内提醒或未来原生通知）
3. **课程重复规则有限**：只支持每周重复，单双周/调课/临时取消的字段已预留但未实现
4. **AI 建议不持久化**：刷新页面后 AI 建议丢失，需重新生成
5. **无深色模式**：当前只做浅色 Pink Mist Glass 主题
6. **无数据导入**：只支持 JSON 导出备份，不支持从其他工具导入数据

### 15.3 已修复问题记录

| 日期 | 问题 | 根本原因 | 修复方案 | 经验教训 |
|---|---|---|---|---|
| 2026-08-30 | PWA 白屏 + 无法自动更新 | index.html无内联加载界面；SW缺少cleanupOutdatedCaches；未手动注册SW；初始化无超时 | 内联App Shell；添加cleanupOutdatedCaches+navigateFallback；手动注册registerSW；8秒初始化超时+10秒同步超时 | PWA必须有内联App Shell；SW缓存必须配置旧缓存清理；任何异步初始化都要有超时保护 |
| 2026-08-30 | 云端同步失败，手机端看不到电脑端数据 | Supabase RLS INSERT 策略要求 `user_id = auth.uid()`，但推送时未设置 `user_id`，导致插入被静默拒绝 | CloudRepository 自动添加 `user_id`；新增 `pushAll()` 全量推送；手动同步同时执行拉取+推送 | 外部服务集成先检查权限模型；静默失败要警惕；双向同步要同时验证；全量同步作为兜底 |
| 2026-08-30 | Netlify 站点手机端打不开，返回 401 | Project visibility 设置为 Private，要求 Netlify 账号登录才能访问 | 改为 Public，个人使用无需密码 | 部署后立即验证多端访问；个人项目优先保证可用性 |

---

*文档结束。本文档随项目开发持续更新。任何与本文档冲突的实现，以实际代码为准并修正本文档；本文档与用户最新指令冲突时，以用户最新指令为准并更新本文档。*
