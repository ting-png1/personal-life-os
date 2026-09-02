# LifeOS — ChatGPT Handoff 快照

> **用途**：下一次 ChatGPT 接手 LifeOS 时，5 分钟内恢复完整上下文。
> **不是** CHANGELOG，不是完整项目文档。只保存当前真正需要知道的快照。
> **最后更新**：2026-09-02（Layer 2 FROZEN / Product Owner iPhone L4 PASSED）
> **协议版本**：AGENT_PROTOCOL.md v1.1（Evidence Levels L0-L5）

---

## 当前快照

### 项目阶段
- **Stability Sprint 已关闭（CLOSED / L4 PASSED）**；**Layer 2 已正式 FROZEN / L4 PASSED**；尚未进入 V1 Final
- 当前分支：`feature/ui-layer2-migration`（已 push，跟踪 `origin/feature/ui-layer2-migration`）
- 文档版本：v7.7.3 + Layer 2 FROZEN / PASSED

### 当前真实完成状态
- ✅ MVP 核心模块：Today / Schedule / Todo / Mood / Cycle（CRUD 完整）
- ✅ UI Migration Layer 1：Pink Mist Glass 设计系统、BackgroundSystem、BottomNav、5 个页面
- ✅ Layer 2 FROZEN：Material Lab Glass A 已迁移到共享视觉层；Stagger 与 Static Pink Mist 为最终冻结方案；Product Owner iPhone L4 已通过
- ✅ V1.6-V1.10：Schedule 重复规则（单双周/周范围/排除日期）、overrides（临时取消/调课时间/恢复默认）、Todo 分类、Todo 重复（每天/每周+按日期记录完成）
- ✅ Mood V1.1-V1.5：一天多次 Mood Event 时间线、Daily Mood 确定性聚合、Mood Lifeform 基础接入、Mood 记录编辑
- ✅ Stability Sprint 第一批：Todo legacy normalization、日期边界统一、Schedule recurrence/取消恢复/override 校验（无 schema/migration）
- ✅ Stability Sprint 第二批：BottomSheet large、完整导出/清空 Cycle、Today 午夜刷新
- ✅ Stability Sprint 第三批：Todo `dueDate` / `recurrenceStartDate` 语义拆分、旧数据只读兼容、非发生日完成保护、Today 编辑链路修复（无 Dexie migration）
- ✅ 第三批 L4 反馈修复：可选 `recurrenceEndDate`、Todo checkbox 轮廓对比度、TodoForm 打开回顶且不自动聚焦（无 Dexie migration）
- ✅ Product Owner iPhone 定向 L4：`recurrenceEndDate`、普通/禁用 checkbox、表单回顶/不自动弹键盘全部通过
- ⚠️ Supabase 同步代码存在，但未达到生产可信等级；当前 Local First，不得把 Sync 当作备份或数据保障
- ✅ 基础设施：GitHub（私有）、Netlify（已 Public，密码保护已关闭）、PWA（manifest + service worker + App Shell）
- ✅ v7.7.2 BackgroundSystem 渲染 artifact 根因修复：移除静态背景的 will-change:transform，理论根因已修复，当前 iPhone 真机暂未复现晕影，后续观察（不宣称彻底解决）
- ✅ v7.7.3 文档体系扩展：AGENT_PROTOCOL.md（三方协作协议）+ CHATGPT_HANDOFF.md（接手快照）

### 当前重要架构决策
- **技术栈**：Vite + React + TypeScript + PWA + Zustand + Dexie.js/IndexedDB（非 Next.js）
- **TodayState**：运行时派生 ViewModel，不持久化，不入库
- **MVP 不使用 EventBus**：模块间通过 Repository + Zustand + TodayAggregator
- **AI 不直接修改数据**：AI 消费数据 → 分析 → 产生建议 → 用户确认 → 执行
- **Repository 模式**：隔离存储，业务代码不直接依赖 Dexie API
- **业务逻辑纯函数化**：Domain 层不依赖 React/DOM，便于未来 iOS 迁移
- **用户可见文字统一中文**，代码内部命名继续英文
- **Layer 2 Glass A**：共享 `.glass` / `.glass-strong` 使用 `blur(12px) saturate(145%)` 与实验验收参数；普通内容层、Scrim、subtle surface、overlay backdrop 不叠加额外 blur
- **Layer 2 冻结路线**：Glass A + Stagger + Static Pink Mist；Glass B/C、View Transition、CSS Dynamic、Canvas 2D 已淘汰，不进入正式产品

### 当前已知技术边界 / 风险
- **iOS Safari 合成层 artifact（观察项）**：date/time 原生 picker 出现时可能产生临时竖线/晕影。v7.7.2 已修复理论根因（BackgroundSystem 静态背景的 will-change:transform 创建永久合成层），当前 iPhone 真机暂未复现。不宣称彻底解决，后续持续观察。如果复现，接受为 iOS 技术边界，不做视觉降级。
- **PWA standalone 真机验证**：需正式 HTTPS 部署后从 iPhone 主屏幕启动验证，当前暂停
- **Supabase 云同步**：生产能力暂停且不可信赖，当前不得作为数据保障；后续单独进入 Sync Stabilization Phase，不在本 Sprint 重构
- **Weekly/Monthly Mood**：暂缓，需真实数据积累
- **中央大型动态 Mood Lifeform**：已基础接入（最新 MoodRecord → Lifeform），最终规格待 Daily Mood 稳定后切换
- **性能问题**：iPhone 轻微卡顿，暂无明确瓶颈，待定位
- **Todo 旧记录兼容过渡**：新语义已拆分；旧重复任务在编辑前可能继续通过 legacy `dueDate` 或运行时 `createdAt` fallback 展开。不会后台写回，编辑时要求确认正式起点。
- **Todo 重复终点兼容**：`recurrenceEndDate` 为非索引可选字段；旧记录缺失时读取为 null（无限重复），不后台写回。范围含起点与终点当天。
- **页面切换背景光晕延迟（observation）**：Product Owner 观察到页面切换时粉色光晕约零点几秒渲染延迟；当前仅登记，不主动修改 BackgroundSystem。
- **Todo 日期小型标注（product backlog）**：希望列表直接显示重复起止日期或非重复截止日期；属于后续信息可见性增强，本次不实现。
- **PRODUCT_OWNER_REVIEW — Today 英文问候（既有问题）**：L3 回归发现 Today 仍显示 `Good noon.`，与“用户可见文字统一中文”规则冲突；该文字在本轮前已存在，与 Layer 2 迁移无关，按 Scope Lock 未修改。

### 当前正在处理的问题
- 当前没有活动开发任务；Layer 2 已正式 FROZEN / L4 PASSED，停工等待 Product Owner 下一步指令，不自行进入 V1 Final
- Analytics / Notification / Sync 继续冻结，等待 Product Owner 明确指令
- Sync 仍“不可信/不可作为生产数据保障”，如未来启动应单独立项

### 最近一次重要开发结论
- **稳定性优先**：旧 Todo 数据、日期边界、Schedule recurrence、完整备份与 Today 跨午夜刷新属于确定性正确性问题，先于新增 V1 功能处理。
- **无隐式 migration**：第一、第二批未修改 Dexie version/schema；Todo legacy 只在读取时补默认值，不批量覆盖用户数据。
- **Evidence Level**：L1 tsc/build、L2 10 suite / 26 test、L3 浏览器回归、L4 Product Owner iPhone 定向复验均通过。尚无 L5 Production 验证。
- **渲染 artifact**：继续作为观察项，不再主动修改。
- **Layer 2**：Glass A 原参数进入共享视觉层；Stagger 参数不变；BackgroundSystem 不改。L1/L3/L4 已通过，L5 尚未执行。

### 当前推荐的下一步
1. **停工等待 Product Owner 下一步指令**：Layer 2 已 Freeze，但不要自动进入 V1 Final
2. **两项后续记录**：背景光晕短暂渲染延迟仅观察；Todo 日期小型标注等待产品排期
3. **冻结边界保持**：Analytics、Notification、Sync 不自行启动；Sync Stabilization 如未来启动必须独立立项
4. **Production 仍未验证**：任何 Netlify 部署、master merge 或 PR 都需另行明确批准

### 哪些事项必须用户本人验收
- iPhone 16 Pro / iOS 26.3 真机体验（渲染 artifact、移动端布局、交互流畅度）
- 产品方向、交互逻辑、数据定义变化
- 数据模型 / Dexie schema / migration 变更
- 生产部署（push / Netlify deploy）
- PWA standalone 从主屏幕启动验证

### Agent 协作协议
- 详见 `AGENT_PROTOCOL.md` v1.1
- 三方角色：人类 Product Owner（决策+真机验收）、ChatGPT（架构审查+流程审查+明确指令）、豆包（实现+本地验证+文档+commit）
- 核心原则：Product Audit First / Scope Lock / Change Surface / Evidence Levels / Deterministic First AI Second
- ChatGPT 必须审查开发流程本身，不只是代码
- 执行提示词保持明确、有限、可验证

---

## 快速参考

| 项目 | 值 |
|---|---|
| 项目路径 | `D:\personal_Lifeos_project` |
| UI Preview 路径 | `D:\lifeUI_preview`（已冻结 Layer 1） |
| 在线地址 | https://astounding-torrone-5409bc.netlify.app/ |
| GitHub | https://github.com/ting-png1/personal-life-os（私有） |
| Supabase 项目 ID | ryurxondlokpgkmcqfxs |
| 当前局域网预览 | `http://10.15.4.112:4174/`（2026-09-02 本机地址；需手动运行 production preview） |
| 真机基准设备 | iPhone 16 Pro / iOS 26.3 |
| IndexedDB 数据库名 | plife-os（Dexie version 2） |
| Stability 实现基线 | `9f6c83e`，已 push；收尾文档提交为当前分支 HEAD（以 `git log -1` 为准） |
| Layer 2 正式分支 | `feature/ui-layer2-migration`（FROZEN / L4 PASSED） |
