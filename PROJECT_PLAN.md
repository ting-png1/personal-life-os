# Personal Life OS — 最终项目计划书（终版执行标准）

> **版本**：v3.2（MVP + V1 Cycle + V1 AI 完成，V1 通知待启动）
> **项目路径**：`D:\personal_Lifeos_project`
> **本文档地位**：开发的唯一执行标准。任何架构变更必须更新本文档并记录在「修订日志」中。
> **最后更新**：MVP 全部完成（17/17 任务），V1 Cycle 模块开发中

---

## 目录

1. [产品定义](#一产品定义)
2. [技术栈](#二技术栈)
3. [架构（五层）](#三架构五层命名统一)
4. [数据模型](#四数据模型终版)
5. [TodayState 设计](#五todaystate-设计)
6. [模块数据流](#六四个模块之间的数据流)
7. [Zustand Store 设计](#七zustand-store-设计)
8. [Dexie 数据库结构](#八dexie-数据库结构)
9. [页面与导航结构](#九页面与导航结构)
10. [Design System（Pink Mist Glass）](#十design-systempink-mist-glass)
11. [UI 组件结构](#十一ui-组件结构)
12. [开发任务清单](#十二开发任务清单17-项)
13. [未来 iOS 迁移策略](#十三未来-ios-迁移策略)
14. [架构决策记录（ADR）](#十四架构决策记录adr)
15. [问题与修订日志](#十五问题与修订日志)
16. [风险登记](#十六风险登记)
17. [开发规范与约束](#十七开发规范与约束)

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

### 1.4 MVP 范围

**做**：Today（聚合中心）、Schedule（课程+日程）、Todo（待办）、Mood（情绪记录）、PWA 可安装离线使用。

**不做**：AI、云同步、账号、Cycle 生理周期、Health 健康、通知推送、数据分析、Widget、Supabase、HealthKit、Apple Watch、EventBus。

### 1.5 Today 页面结构

```
Today
├── 日期 / 星期 / 问候语（"08 / 30 · Sunday / Good morning."）
├── 今日状态（Mood：已记录显示表情+标签；未记录显示"今天感觉怎么样？"+快速选择）
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

**明确不安装**：Supabase、AI SDK、Redux、EventBus 库、图表库、表单库、MUI/Ant Design。

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
│  useMood() + Zustand Stores                        │
│  组合数据、管理 loading/error、暴露操作方法          │
├──────────────────────────────────────────────────┤
│  第 3 层：Domain / Pure Logic Layer                │
│  TodayAggregator.buildTodayState()                  │
│  ScheduleExpander.expandForDate()                   │
│  TodoFilter / MoodSummary 等纯函数                  │
│  不依赖 React / DOM / Dexie，可单测可移植           │
├──────────────────────────────────────────────────┤
│  第 4 层：Repository Layer                          │
│  TodoRepository / ScheduleRepository /              │
│  MoodRepository（接口 + Dexie 实现）                │
│  上层只依赖接口，未来换 SwiftData 只换实现           │
├──────────────────────────────────────────────────┤
│  第 5 层：Infrastructure Layer                      │
│  Dexie / IndexedDB（3 张表）                        │
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

## 四、数据模型（终版）

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

> **修订记录**：原模型无 `completedAt`。架构审计指出：统计"今天完成了几个"需要完成时间，仅靠 `updatedAt` 会被编辑操作污染。新增 `completedAt`。

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

> **修订记录 1**：原模型字段名为 `startTime`/`endTime`，有歧义（听起来像只有时间）。改为 `startDateTime`/`endDateTime`，明确为完整日期时间。
>
> **修订记录 2**：原模型无 `recurrence`。架构审计指出：大学课程天然周期性（每周一三五，持续 18 周），一次性事件模型要求用户创建 18 条记录，不可接受。新增 `recurrence` 字段，TodayAggregator 将重复课程展开为当日实例。
>
> **修订记录 3（用户反馈）**：用户指出 recurrence 不应只考虑"每周重复"，大学课程可能碰到单双周、调课、临时取消。模型预留 `weekRange`/`excludedDates`/`overrides` 扩展字段。**MVP 不实现这些字段的 UI 和逻辑**，TodayAggregator 暂只处理 `freq + daysOfWeek + startDate + endDate`。字段预留确保未来扩展不破坏数据模型。

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

### 4.3.1 PeriodRecord（V1 新增）

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

> **设计说明**：V1 新增生理周期模块。周期预测（下次经期、排卵日、可孕窗口、周期阶段）全部由 `CycleCalculator` 纯函数从 PeriodRecord 历史派生，不存库。不做医疗诊断，数据不足时提示"记录更多周期后可预测"。

#### 4.3.2 AIRecommendation（AI 建议，V1 新增，运行时不持久化）

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

> **设计说明**：AI 建议是运行时派生数据，当前 MVP/V1 不持久化到 IndexedDB（刷新后需重新生成）。AI 设置（API Key、每日上限）存 localStorage。AI 只产生建议，不直接修改 Todo/Schedule/Mood 数据；用户确认后仅标记状态，不自动执行。纯前端直连 DeepSeek API（个人使用，Key 暴露风险可接受），不搭后端代理。

### 4.4 输入类型（Create 时使用，不含系统字段）

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
  // date 自动设为今天，createdAt 自动生成
}
```

---

## 五、TodayState 设计

### 5.1 接口定义

```typescript
interface TodayState {
  date: string;                          // "2026-08-30"
  weekday: string;                       // "Sunday" / "周日"
  greeting: string;                      // "Good morning." / "Good afternoon." / "Good evening."

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

- **不单独建 useTodayStore**：TodayState 完全是其他三个 store 的派生值。单独建 store 需要手动同步，容易出现"Todo 改了但 TodayState 没更新"的 bug。`useMemo` + 三个 store 订阅是最简单可靠的方式。
- **不持久化 TodayState**：每次打开重新计算，保证数据一致性。历史趋势从原始数据重新聚合，不查 TodayState 快照。
- **不在 aggregator 里做格式化**：aggregator 只返回原始数据（ISO 字符串），格式化（如 "09:00"）是 UI 层的职责。
- **energy 等派生指标不在 MVP**：原架构报告提到 energy.score，MVP 不实现。未来加入时作为 TodayState 的可选字段，由纯函数计算。

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

### 6.5 模块间禁止的依赖

| 禁止 | 原因 |
|---|---|
| Today 组件直接 import Dexie | 违反分层，UI 不碰数据库 |
| TodoStore 直接操作 MoodStore | 模块间不直接通信，通过 Today 聚合间接联动 |
| ScheduleExpander 访问 Zustand | 纯函数不能依赖状态管理库 |
| Repository 返回 Dexie Table 对象 | 上层不应知道 Dexie 存在 |
| TodayAggregator 做日期格式化 | 格式化是 UI 职责 |
| 模块间直接 import 对方的内部组件 | 只通过 Repository 接口或 TodayState 聚合 |

### 6.6 无 EventBus

MVP 不使用 EventBus。模块间联动通过：明确的方法调用 + Repository + Zustand feature store + TodayAggregator。只有未来模块数量明显增加、出现插件化需求或复杂异步事件链时，再重新评估 EventBus（候选 `mitt`，200 字节）。

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

### 7.2 useTodoStore

```
State:
  todos: Todo[]
  loading: boolean
  error: string | null

Actions:
  loadAll()                  // App 启动时从 Dexie 加载全部
  create(input: CreateTodoInput)
  update(id, patch)          // 部分更新，自动维护 updatedAt
  toggleComplete(id)         // 便捷方法：完成↔取消完成，自动维护 completedAt
  remove(id)

内部规则：
  - create: repository.create → store.todos 追加 → 按 createdAt 排序
  - update: repository.update → store.todos 替换对应项
  - toggleComplete:
      if completed → update(id, { completed: false, completedAt: null })
      else → update(id, { completed: true, completedAt: now() })
  - remove: repository.remove → store.todos 过滤
  - 所有 action 先写库成功再更新 store（写库失败则不更新 UI，避免不一致）
```

### 7.3 useScheduleStore

```
State:
  events: ScheduleEvent[]
  loading: boolean
  error: string | null

Actions:
  loadAll()
  create(input: CreateScheduleInput)
  update(id, patch)
  remove(id)

内部规则：
  - create 时校验 endDateTime > startDateTime
  - recurrence 字段原样存储（Dexie 自动序列化 JSON）
  - MVP 不做时间冲突检测
```

### 7.4 useMoodStore

```
State:
  records: MoodRecord[]
  loading: boolean
  error: string | null

Actions:
  loadAll()
  create(input: CreateMoodInput)   // date 自动设为今天
  update(id, patch)
  remove(id)

内部规则：
  - create 时自动填充 date=todayStr, createdAt=now()
  - 不限制一天记录条数
  - records 按 createdAt 降序（最新在前）
```

### 7.5 Store 初始化时机

```
main.tsx 启动流程：
  1. 初始化 Dexie 数据库（打开连接）
  2. 并行调用 todoStore.loadAll() / scheduleStore.loadAll() / moodStore.loadAll()
  3. 全部加载完成后渲染 <App />
  4. 加载期间显示全屏 Loading（粉色 logo + 动画）
```

**全量加载策略**：MVP 数据量小（个人用户几年的 Todo 可能几千条），全量加载到内存后查询/聚合都是 O(n) 数组操作，性能足够。未来数据量大了再改按需加载/分页。

---

## 八、Dexie 数据库结构

### 8.1 数据库定义

```
数据库名："plife-os"
版本：1
文件：src/data/database.ts
```

### 8.2 表结构与索引

| 表名 | 主键 | 索引 | 说明 |
|---|---|---|---|
| `todos` | `id` | `dueDate, completed, priority, createdAt` | dueDate 索引加速 Today 筛选 |
| `schedule_events` | `id` | `type, startDateTime, createdAt` | MVP 全量加载后内存筛选，索引为未来准备 |
| `mood_records` | `id` | `date, createdAt` | date 索引加速"查当天情绪" |
| `period_records` | `id` | `startDate, endDate, createdAt` | V1 新增，startDate 索引加速周期计算 |

### 8.3 字段存储说明

- `id`：UUID string，客户端生成（`crypto.randomUUID()`）
- 日期时间字段：ISO string（`"2026-08-30T09:00:00"`），Dexie 原生支持 string 索引
- `recurrence`：JSON 对象，Dexie 自动序列化/反序列化
- `tags`：string 数组，Dexie 自动处理
- `completed`：boolean（Dexie 存 boolean，索引时可查）
- MVP 不做软删除，删除即物理删除（未来加同步时再加 `deletedAt`）

### 8.4 版本迁移

使用 Dexie 的 `version(1).stores({...})` 写法。未来表结构变化时：

```typescript
db.version(2).stores({ todos: 'id, dueDate, completed, priority, createdAt, deletedAt' })
  .upgrade(tx => tx.table('todos').toCollection().modify(t => { t.deletedAt = null }))
```

现在就按正确的版本化方式写，未来不返工。

---

## 九、页面与导航结构

### 9.1 底部 Tab Bar（5 个入口）

| Tab（模块名） | 用户可见标签 | 路由 | 页面 | 说明 |
|---|---|---|---|---|
| Today | 今日 | `/` | TodayPage | 默认首页，App 启动后第一个看到 |
| Schedule | 日程 | `/schedule` | SchedulePage | 周视图为主，可切换日视图 |
| Todo | 待办 | `/todo` | TodoPage | 列表 + 筛选 + 快速添加 |
| Wellness | 状态 | `/wellness` | WellnessPage | MVP 只有 Mood（顶部 SegmentedControl 预留位置） |
| More | 更多 | `/more` | MorePage | 两个入口：设置 / 关于 |

### 9.2 二级页面（非 Tab，从列表点击进入）

| 路由 | 页面 | 入口 |
|---|---|---|
| `/schedule/:id` | ScheduleDetailPage | 点击日程卡片 → 查看/编辑/删除 |
| `/todo/:id` | TodoDetailPage | 点击 Todo → 查看/编辑/删除 |
| `/settings` | SettingsPage | More → Settings |
| `/about` | AboutPage | More → About |

**MVP 不做**：Mood 详情页（情绪记录简单，列表左滑删除即可）。

### 9.3 页面布局规范

- 顶部：页面标题 + 可选操作按钮（如"添加"）
- 内容：可滚动区域
- 底部：TabBar（固定，不随内容滚动）
- 添加/编辑操作：优先用 **BottomSheet**（底部弹出），而非跳转新页面
- 空状态：使用 `EmptyState` 组件
- 移动端优先（375px 基准），桌面端不强制拉伸全屏

### 9.4 Wellness 页面的未来扩展

当前 Wellness 只有 Mood，但导航结构预留：
```
Wellness
├── Mood（MVP 实现）
├── Cycle（未来）
└── Health（未来）
```
顶部 SegmentedControl 当前只有 "Mood" 一项，视觉上预留位置，未来加 Cycle/Health 时直接加选项。

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

**不使用**：厚重的白色不透明卡片、高饱和渐变背景、深色模式（MVP 只做浅色）。

---

## 十一、UI 组件结构

### 11.1 组件清单

| 组件 | 文件 | 用途 | 关键 Props |
|---|---|---|---|
| **GlassCard** | `shared/ui/GlassCard.tsx` | 所有卡片的容器 | `padding?, onClick?, hover?` |
| **GlassButton** | `shared/ui/GlassButton.tsx` | 按钮 | `variant: primary/secondary/ghost/danger`, `size: sm/md/lg`, `loading?, disabled?` |
| **GlassInput** | `shared/ui/GlassInput.tsx` | 文本输入 | `label?, placeholder?, error?, type?` |
| **SectionHeader** | `shared/ui/SectionHeader.tsx` | 区块标题 | `title`, `action?` |
| **StatusBadge** | `shared/ui/StatusBadge.tsx` | 状态/类型标签 | `variant`, `text` |
| **EmptyState** | `shared/ui/EmptyState.tsx` | 空状态 | `icon, title, description?, action?` |
| **Progress** | `shared/ui/Progress.tsx` | 进度条 | `value: 0-1`, `showLabel?, label?` |
| **Modal** | `shared/ui/Modal.tsx` | 居中弹窗 | `open, onClose, title, children` |
| **BottomSheet** | `shared/ui/BottomSheet.tsx` | 底部弹出（添加/编辑首选） | `open, onClose, title, children, height?` |
| **TabBar** | `shared/ui/TabBar.tsx` | 底部导航栏 | `items[], activeRoute` |
| **SegmentedControl** | `shared/ui/SegmentedControl.tsx` | 选项切换 | `options[], value, onChange` |

### 11.2 组件使用规则

1. 所有页面和 feature 组件**只能使用 `shared/ui/` 中的组件**，不允许自己写 `<button>`、`<input>`、`<div className="card">`
2. 需要的样式 `shared/ui` 没有时，**先扩展 Design System token 或组件**，再使用
3. feature 内部组件（如 `TodoItem`）可以组合 `GlassCard` + `StatusBadge`，但不能重新定义颜色
4. `BottomSheet` 是添加/编辑的首选交互方式（比跳转页面层级浅），`Modal` 用于确认删除
5. 图标统一用 `lucide-react`，不混用多个图标库

### 11.3 组件开发优先级

- **Phase 1 第一批**（Task 1.5）：GlassCard, GlassButton, GlassInput, SectionHeader, StatusBadge, EmptyState, Progress
- **Phase 1 第二批**（Task 1.6）：TabBar, BottomSheet, Modal, SegmentedControl

---

## 十二、开发任务清单（17 项，4 个 Phase）

### Phase 0：项目初始化（5 项）— ✅ 已完成

| 任务 | 状态 | 关键产物 |
|---|---|---|
| 0.1 初始化 Vite + React + TS | ✅ | Vite 5 + React 18 + TS strict，`@/` 别名 |
| 0.2 配置 Tailwind + 设计 Token | ✅ | Pink Mist Glass 完整 token，`.glass` 工具类 |
| 0.3 安装核心依赖 | ✅ | zustand/dexie/date-fns/react-router/lucide-react |
| 0.4 配置 PWA | ✅ | manifest + autoUpdate SW + 5 图标（含 maskable） |
| 0.5 创建目录结构 | ✅ | 19 个目录，五层架构对应 |

### Phase 1：数据层 + Design System（6 项）— ✅ 已完成

| 任务 | 内容 | 前置依赖 |
|---|---|---|
| 1.1 定义 Domain 类型 | Todo/ScheduleEvent/MoodRecord + 输入类型 + RecurrenceRule | 0.5 |
| 1.2 创建 Dexie 数据库 | AppDatabase + 3 表 + 索引 + 版本化 | 1.1 |
| 1.3 实现 Repository 层 | 3 个 Repository 接口 + Dexie 实现 | 1.1, 1.2 |
| 1.4 实现通用工具函数 | date.ts / id.ts / constants.ts | 0.5 |
| 1.5 Design System 组件第一批 | GlassCard/Button/Input/SectionHeader/StatusBadge/EmptyState/Progress | 0.2 |
| 1.6 Design System 组件第二批 | TabBar/BottomSheet/Modal/SegmentedControl | 1.5 |

### Phase 2：业务模块（4 项）— ✅ 已完成

| 任务 | 内容 | 前置依赖 |
|---|---|---|
| 2.1 Todo 模块 | store/hooks/services/repository/components/TodoPage | 1.3, 1.4, 1.5 |
| 2.2 Schedule 模块 | store/hooks/ScheduleExpander/repository/components/SchedulePage | 1.3, 1.4, 1.5, 1.6 |
| 2.3 Mood 模块 | store/hooks/services/repository/components/WellnessPage | 1.3, 1.4, 1.5, 1.6 |
| 2.4 Today 聚合模块 | TodayAggregator/useToday/components/TodayPage | 2.1, 2.2, 2.3 |

### Phase 3：集成与打磨（5 项）— ✅ 已完成

| 任务 | 内容 | 前置依赖 |
|---|---|---|
| 3.1 路由与全局布局 | React Router 配置 + TabBar + 全局布局 | 1.6, 2.4 |
| 3.2 App 启动数据加载 | 并行 loadAll + Loading 屏 + 错误处理 | 2.1, 2.2, 2.3, 3.1 |
| 3.3 More/Settings/About + 数据导出 | 设置页/关于页/JSON 备份导出 | 3.1 |
| 3.4 跨模块集成测试与 Bug 修复 | 端到端流程测试 + 移动端适配 | 2.4, 3.1, 3.2 |
| 3.5 最终打磨与 PWA 验收 | 动画/空状态文案/PWA 全量验收/README | 3.4 |

### Phase 4：V1 — Cycle 生理周期模块（6 项）— ✅ 已完成

> **V1 第一个迭代**。纯本地功能，不依赖 Supabase / AI / 外部服务。
> **设计约束**：不做医疗诊断；用户可手动修正；预测基于历史数据，数据不足时显示"记录更多周期后可预测"。

| 任务 | 内容 | 前置依赖 | 状态 |
|---|---|---|---|
| 4.1 Cycle 数据模型 + Dexie 表 + Repository | PeriodRecord + 输入类型 + Dexie 表 `period_records`（version 2）+ Repository 接口与实现 | MVP 完成 | ✅ |
| 4.2 CycleCalculator 纯函数 | 预测下次经期、计算当前阶段、平均周期、可孕窗口、是否推迟、buildCurrentCycleState、buildCycleStatsList。20+ 纯函数，不依赖 React/DOM/Dexie | 4.1 | ✅ |
| 4.3 Cycle Store + useCycle Hook | Zustand store（records/loading/error + CRUD）+ useCycle hook（组合 store + 纯函数，暴露 currentCycleState/cycleStats） | 4.1, 4.2 | ✅ |
| 4.4 Cycle UI 组件 | CycleStatusCard（状态卡片，含空状态/经期中/距下次经期/推迟提醒/统计）、PeriodForm（记录经期 BottomSheet，含日期/经量/症状/备注）、CycleHistoryList（历史周期列表） | 4.3 | ✅ |
| 4.5 整合到 Wellness + Today | Wellness 页面顶层 SegmentedControl 增加"情绪/周期"切换；Today 页面增加 CycleStatusCard；AppInitializer 增加 cycle 数据加载 | 4.4 | ✅ |
| 4.6 构建验证 + 集成测试 + 计划书更新 | tsc + build 通过；手动测试记录经期→预测→Today 显示；同步更新计划书数据模型和修订日志 | 4.5 | ✅ |

### Phase 5：V1 — AI 智能建议模块（7 项）— ✅ 已完成

> **V1 第二个迭代**。纯前端直连 DeepSeek API，个人使用，不搭后端代理。
> **核心约束**：AI 只产生建议，不直接修改数据；重要操作必须 AI 建议 → 用户确认 → 系统执行。
> **用户确认的决策**：纯前端直连、隐私提示不加、用户可手动设置每日调用次数上限。

| 任务 | 内容 | 前置依赖 | 状态 |
|---|---|---|---|
| 5.1 AI 数据模型 + 设置存储 | AIRecommendation / AISuggestion / AISettings / AIDailyUsage 类型 + localStorage 存储（API Key、每日上限、调用计数） | V1 Cycle 完成 | ✅ |
| 5.2 AIService 服务层 | 构建 system/user prompt（聚合今日状态）、调用 DeepSeek Chat API、解析 JSON 响应、错误处理、重试机制、buildAIGenerationInput 纯函数 | 5.1 | ✅ |
| 5.3 AI Store + Hook | useAIStore（建议列表、loading、error、每日计数）+ useAI hook（组合 store + service，暴露 generate/dismiss/confirm/canGenerate/remaining） | 5.1, 5.2 | ✅ |
| 5.4 AI UI 组件 | AIRecommendationCard（未配置/加载中/错误/次数耗尽/有内容 五种状态）、SuggestionItem（单条建议含类型标签+优先级+采纳按钮） | 5.3 | ✅ |
| 5.5 Settings 页面增加 AI 配置 | API Key 密码输入（显示/隐藏）、每日调用上限（数字输入+3/5/10快捷选项）、今日已用次数显示、保存/清除按钮 | 5.1 | ✅ |
| 5.6 Today 页面整合 AI 建议 | Today 页面增加 AIRecommendationCard（周期卡片之后、日程之前）、"生成今日建议"按钮、用户确认后标记建议、"去配置"跳转 Settings | 5.4 | ✅ |
| 5.7 构建验证 + 集成测试 + 计划书更新 | tsc + build 通过（JS 394KB/gzip 122KB）；浏览器测试 Today AI 卡片（未配置状态）和 Settings AI 配置区域均正常；同步更新计划书 | 5.5, 5.6 | ✅ |

### 任务依赖总览

```
Phase 0:  0.1 → 0.2 → 0.4
          0.1 → 0.3
          0.1 → 0.5

Phase 1:  0.5 → 1.1 → 1.2 → 1.3
          0.5 → 1.4
          0.2 → 1.5 → 1.6
          （1.1-1.4 数据层 与 1.5-1.6 UI 组件 可并行）

Phase 2:  1.3 + 1.4 + 1.5 → 2.1 (Todo)
          1.3 + 1.4 + 1.5 + 1.6 → 2.2 (Schedule)
          1.3 + 1.4 + 1.5 + 1.6 → 2.3 (Mood)
          （2.1/2.2/2.3 三模块可并行）
          2.1 + 2.2 + 2.3 → 2.4 (Today)

Phase 3:  1.6 + 2.4 → 3.1
          2.1+2.2+2.3 + 3.1 → 3.2
          3.1 → 3.3
          2.4 + 3.1 + 3.2 → 3.4 → 3.5
```

---

## 十三、未来 iOS 迁移策略

> 当前不开发 iOS。以下为架构设计时的迁移考量，目的是"不为未来过度设计，但尽可能避免现在做出无法迁移的架构"。

### 13.1 可复用层（现在就要保护好）

| 层 | 复用方式 | 现在的保护措施 |
|---|---|---|
| Supabase 数据库（未来） | 直接复用 | MVP 不接 Supabase，但数据模型设计考虑未来同步（UUID 主键、updatedAt） |
| Edge Functions（未来） | 直接复用 | AI 逻辑未来放服务端，客户端不持有 API Key |
| 数据模型 / Schema | 复用，SwiftData 模型对应同一套字段 | TypeScript 类型定义清晰，字段命名规范 |
| 业务规则（纯函数） | 可移植到 Swift 或通过 API 暴露 | TodayAggregator/ScheduleExpander/TodoFilter 等写成纯函数，不依赖 React/DOM/Dexie |
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
2. **AI 逻辑未来放服务端**：MVP 不接 AI，但架构上预留 Edge Function 代理模式
3. **数据模型与 UI 分离**：TypeScript 类型定义就是未来 Swift 模型的蓝图
4. **不使用浏览器专有 API 做核心功能**：核心功能不依赖 `localStorage`/`document.cookie`
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
| ADR-003 | 不使用 EventBus | 模块少（4 个）、联动清晰可枚举，直接调用 + 状态订阅更可维护 | mitt 轻量事件库 |
| ADR-004 | TodayState 为派生 ViewModel，不存库 | 避免数据冗余和不一致，保证数据真相源唯一 | 存为每日快照表 |
| ADR-005 | AI 必须走 Edge Function 代理（未来） | 保护 API Key，可加限制和缓存，可切换供应商 | 客户端直接调用 |
| ADR-006 | AI 建议用户确认后才执行（未来） | AI 不可信，用户保留控制权 | AI 自动执行 |
| ADR-007 | Zustand 而非 Redux | 轻量（1KB），个人项目足够，无样板 | Redux Toolkit / Jotai |
| ADR-008 | Mood/Cycle/Health 合并为 Wellness 页面 | 减少底部 Tab，统一"状态记录"类；MVP 只有 Mood | 各占一个 Tab |
| ADR-009 | MVP 不接 Supabase/AI | 控制范围，快速验证核心闭环；接 Supabase 增加 Auth/RLS/同步调试复杂度 | 一开始就全量接入 |
| ADR-010 | ScheduleEvent 用 recurrence 字段而非独立 Course 表 | 统一事件模型，避免两张表关联查询；课程和个人事件共享 UI | 独立 Course 表 + Event 表 |
| ADR-011 | 全量加载到内存而非按需查询 | MVP 数据量小，内存操作性能足够，简化代码 | 按需查询/分页 |
| ADR-012 | 添加/编辑用 BottomSheet 而非跳转页面 | 减少导航层级，移动端体验更好 | 独立编辑页面 |
| ADR-013 | 不使用 MUI/Ant Design 等重型组件库 | 与玻璃拟态风格冲突，包体积大 | shadcn/ui 按需复制 |
| ADR-014 | recurrence 预留 weekRange/excludedDates/overrides | 用户反馈大学课程有单双周/调课/临时取消，预留扩展位 | 只支持每周重复 |

---

## 十五、问题与修订日志

### 架构讨论阶段（第一轮 → 第二轮）

| # | 问题 | 原因 | 修订 |
|---|---|---|---|
| 1 | Next.js 默认假设 | PWA + 本地优先与 Next.js SSR/RSC 冲突 | 改为 Vite + React + TS |
| 2 | TodayState 疑似万能表 | 数据冗余、写入放大、跨天困难 | 明确为派生 ViewModel，不持久化 |
| 3 | EventBus 候选 | 单用户 4 模块应用不需要，隐式依赖调试困难 | MVP 不使用，未来再评估 |
| 4 | AI 与业务模块并列 | AI 不拥有数据，是建议生成服务 | 改为 Domain Service + Edge Function 代理（未来） |
| 5 | 8 模块对 MVP 过多 | 范围蔓延导致烂尾 | MVP 只做 Today/Schedule/Todo/Mood |
| 6 | ScheduleEvent 无 recurrence | 大学课程周期性，一次性模型要求创建 18 条 | 新增 recurrence 字段 |
| 7 | startTime/endTime 命名歧义 | 听起来像只有时间 | 改为 startDateTime/endDateTime |
| 8 | Todo 无 completedAt | 统计"今天完成"会被编辑操作污染 | 新增 completedAt |

### 用户反馈阶段（第二轮 → 终版）

| # | 反馈 | 处理 |
|---|---|---|
| 1 | recurrence 不要只考虑每周重复，大学有单双周/调课/临时取消 | 模型预留 weekRange/excludedDates/overrides 字段，MVP 不实现 UI 和逻辑 |
| 2 | "四层架构"实际是五层，命名要统一 | 统一为五层：UI → Hook/Store → Domain → Repository → Infrastructure |
| 3 | 接受全部核心架构结论 | Vite/TS/PWA/Zustand/Dexie 确认，MVP 不接 Supabase/AI |
| 4 | TodayState 派生化确认 | 不持久化，TodayAggregator 纯函数计算 |
| 5 | MVP 范围确认 | Today/Schedule/Todo/Mood 四模块，其余暂缓 |
| 6 | Today 不直接操作数据库确认 | UI → Repository → Store/Aggregator → View |
| 7 | 业务逻辑纯函数化确认 | 与 React/DOM 无关，未来可迁移 |
| 8 | Design System 先行确认 | Pink Mist Glass，组件共享 |
| 9 | 用户可见文字统一中文（硬性要求） | 所有用户可见文字必须中文；代码内部（文件名/类型/变量/函数/组件名）继续英文。TabBar 标签：今日/日程/待办/状态/更多 |

### 开发执行阶段（Phase 0）

| # | 问题 | 原因 | 处理 |
|---|---|---|---|
| 1 | vite.config.ts 中 `__dirname` 不可用 | ESM 模式下 `__dirname` 未定义 | 改用 `fileURLToPath(new URL('./src', import.meta.url))` |
| 2 | `path` 模块类型缺失 | tsconfig.node.json 未包含 node 类型 | 安装 @types/node，tsconfig.node.json 添加 `"types": ["node"]` |
| 3 | src 目录不存在导致 Write 失败 | 目录需先创建 | 先 New-Item 创建目录再写文件 |
| 4 | npm install 超 15s 自动转后台 | sharp 包较大，下载慢 | 等待后台任务完成，验证 node_modules |

### 开发执行阶段（V1 — Cycle 生理周期模块）

| # | 问题 | 原因 | 处理 |
|---|---|---|---|
| 1 | SegmentedControl 不支持空值/取消选择 | 经量是可选字段，需要支持取消选择 | 改用自定义切换按钮（再次点击可取消），不修改共享组件 |
| 2 | StatusBadge 不支持 variant="custom" | 周期阶段颜色是动态的，需要自定义颜色 | StatusBadge 已支持 `color` prop，直接传 CSS 颜色值即可 |
| 3 | CurrentCycleState 缺少 recordCount | CycleStatusCard 需要判断是否有记录 | 在 CurrentCycleState 增加 `recordCount: number` 字段，由 buildCurrentCycleState 填充 |
| 4 | 数据库 version 1 已存在，新增表需要 version 2 | Dexie 版本化管理 | 使用 `this.version(2).stores({ periodRecords: ... })` 新增表，Dexie 自动迁移 |

### 开发执行阶段（V1 — AI 智能建议模块）

| # | 问题 | 原因 | 处理 |
|---|---|---|---|
| 1 | ScheduleInstance 没有 startTime/endTime 属性 | ScheduleInstance 使用 startDateTime/endDateTime（完整 ISO 字符串） | 在构建 AI 输入时用 `item.startDateTime.slice(11, 16)` 提取 HH:mm |
| 2 | TodayPage 缺少 useNavigate | AI 卡片"去配置"按钮需要跳转 Settings | 增加 `useNavigate` 导入和 `const navigate = useNavigate()` 声明 |
| 3 | store 中 confirmSuggestion/dismissSuggestion 参数未使用 | MVP 阶段确认建议仅标记整体状态，不处理单条 | 参数名加下划线前缀 `_suggestionId`，TS 不再报错 |

---

## 十六、风险登记

| 风险 | 严重度 | 说明 | 缓解措施 |
|---|---|---|---|
| PWA 通知在 iOS 不可靠 | 🔴 高 | iOS Safari PWA 后台通知基本不可用 | MVP 不做通知推送；App 内提醒为主；明确告知用户限制 |
| 本地数据丢失 | 🟡 中 | 浏览器清理缓存/卸载 PWA 会丢失 IndexedDB | V1 加云同步；MVP 提供 JSON 导出备份；引导用户定期导出 |
| 范围蔓延 | 🟡 中 | 个人项目容易不断加功能导致烂尾 | 严格按 17 任务执行；新功能记入 backlog，不插入当前 Phase |
| ScheduleExpander 边界情况 | 🟡 中 | 跨天事件、时区、夏令时 | MVP 假设单时区（本地时间）；跨天事件暂不支持；记录限制 |
| IndexedDB 浏览器兼容性 | 🟢 低 | 现代浏览器全部支持 | 目标浏览器 Chrome/Safari 最新版，不支持 IE |
| 玻璃效果性能 | 🟢 低 | backdrop-filter 在低端设备可能卡顿 | 控制玻璃卡片数量；避免滚动中大量玻璃层叠；必要时降级 |
| 未来 iOS 迁移时业务逻辑绑死 React | 🟡 中 | 如果逻辑写在组件里，迁移要全部重写 | 严格执行"业务逻辑在纯函数/service 中"的规则；Code Review 检查 |
| recurrence 预留字段未来实现复杂 | 🟡 中 | overrides/excludedDates 实现需要仔细的展开逻辑 | MVP 不实现；未来实现时先写充分的单元测试 |

---

## 十七、开发规范与约束

### 17.1 编码规范

- TypeScript strict 模式，禁止 `any`（必要时用 `unknown` + 类型守卫）
- 所有函数参数和返回值有明确类型
- 组件文件不超过 300 行，超过则拆分
- `page.tsx` 类文件极薄，只做布局组合，不写业务逻辑
- 导入顺序：外部库 → `@/shared` → `@/features` → 相对路径
- 文件命名：组件用 PascalCase（`TodoItem.tsx`），工具/类型/服务用 camelCase（`date.ts`、`types.ts`）

### 17.2 用户可见文字统一中文（硬性要求）

**所有用户能够看到的文字必须使用中文。** 这是硬性要求，无例外。

**必须中文的内容**：
- 底部导航标签：Today → 今日，Schedule → 日程，Todo → 待办，Wellness → 状态，More → 更多
- 按钮文字：Add → 添加，Save → 保存，Cancel → 取消，Delete → 删除，Edit → 编辑
- 页面标题、区块标题（SectionHeader）
- 空状态文案（EmptyState 的 title / description）
- 表单标签（label）、占位符（placeholder）
- 错误提示、加载提示
- 情绪等级文字：很糟/不好/平稳/不错/很好
- 日程类型文字：课程/个人/休息/其他
- 优先级文字：高/中/低
- 问候语：Good morning → 早上好（或保留英文问候语需用户确认，默认中文）
- 设置页、关于页全部文字
- 确认弹窗的标题和内容

**继续使用英文的内容（代码内部）**：
- 文件名（`TodoItem.tsx`、`date.ts`）
- TypeScript 类型 / 接口名（`Todo`、`ScheduleEvent`、`TodayState`）
- 变量名、函数名（`filterTodosByDate`、`buildTodayState`）
- Component 名称（`GlassCard`、`BottomSheet`）
- CSS 类名、Tailwind 类名
- 路由路径（`/schedule`、`/todo/:id`）
- 控制台日志（开发调试用）
- 代码注释（可中文可英文，建议中文）

**禁止**：在 JSX 文本内容、`placeholder`、`label`、`title` 等用户可见属性中使用英文（技术术语除外，如 API 名称，但需尽量中文化）。

**TabBar 最终标签**：今日 / 日程 / 待办 / 状态 / 更多

### 17.3 架构约束（铁律）

1. UI 层不直接 import Dexie / Supabase
2. Domain 层纯函数不 import React / DOM / Dexie
3. Repository 上层只依赖接口，不依赖具体实现
4. 模块间不直接 import 对方的内部组件/Store
5. TodayState 不入库、不持久化、不是数据库表
6. AI（未来）不直接修改业务数据，只写 Recommendation 表
7. 所有颜色通过 Design System token 引用，禁止硬编码
8. 所有页面使用 `shared/ui/` 组件，禁止自写 `<button>`/`<input>`

### 17.4 测试与验证

- 每个任务完成后必须：`npm run build` 通过 + `tsc --noEmit` 无错误
- Domain 层纯函数必须可单测（未来加 Vitest）
- 跨模块联动必须手动验证（修改 Todo → Today 自动更新）
- 移动端视口（375px）无横向滚动、无元素溢出
- PWA 构建产物包含 manifest + sw.js + 图标

### 17.5 Git（如果使用）

- 每个任务完成后 commit，message 格式：`feat: 模块 - 任务描述` 或 `fix: 模块 - 修复内容`
- 不在 commit 中包含 `node_modules/`、`dist/`
- `.gitignore` 包含：node_modules, dist, .env, *.local

### 17.6 变更控制

- 任何架构层面的变更（新增依赖、修改数据模型、调整分层）必须：
  1. 暂停当前任务
  2. 记录问题和原因
  3. 向用户请示
  4. 获得确认后更新本文档（修订日志 + ADR）
  5. 再继续执行
- 非架构层面的实现细节（组件内部实现、样式微调）可自行决策，但需在任务报告中说明

---

*文档结束。本文档随项目开发持续更新。任何与本文档冲突的实现，以本文档为准；本文档与用户最新指令冲突时，以用户最新指令为准并更新本文档。*
