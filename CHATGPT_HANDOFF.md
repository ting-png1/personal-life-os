# LifeOS — ChatGPT Handoff 快照

> **用途**：下一次接手 LifeOS 时快速恢复当前上下文。
> **不是** CHANGELOG，不是完整项目文档。只保存当前真正需要知道的快照。
> **最后更新**：2026-09-10（V2 进入 Final Acceptance / Polish）
> **协议版本**：AGENT_PROTOCOL.md v1.3（Evidence Levels L0-L5）

---

## 当前快照

### 项目阶段
- 当前阶段：**V2 Final Acceptance / Polish**。
- 当前开发分支：`v2-development`；以 `git log -1` 为最新 checkpoint。
- `master` + annotated tag `v1.0.0` 仍是 V1 稳定 Production 基线。
- V2 当前只接受验收发现的确定性 bugfix、必要 polish、跨域回归和文档对账；不扩展 Foundation、Sync 协议或新增业务域。
- V2 Preview 与 V1 Production 分离；尚未 merge `master`，尚未发布 V2 Production。

### 当前真实完成状态
- ✅ V1 核心：Today / Schedule / Todo / Mood / Cycle、Pink Mist Glass、PWA 与稳定性修复仍是产品基线。
- ✅ Life State：运行时 deterministic read model，复用 Today / Cycle / normalized Health；保留 `not-ready` 与 `ready + null`，不持久化。
- ✅ Health：DailyHealthSummary contract、runtime validation、Local-First Repository、按本地日期安全 upsert、Life State integration、Capacitor shell 与 provider-neutral native bridge foundation。
- ⏸ Native Health：Swift HealthKit、Apple capability 与 iOS native 真机验证留给 macOS Native Milestone；Windows contract/mock 不算该能力完成。
- ✅ Baseline / Timeline：14 日个人窗口、每项至少 7 个有效样本；当前 baseline 为 sleep duration / resting HR / HRV / Daily Mood，Timeline 当前组合 Health + Daily Mood，均不持久化为第二份事实。
- ✅ Continuity：Life / Relationship 两域、manual confirmed lifecycle、evidence、update、expire、supersede 与结构化读取；Candidate 只有经 host validation 和用户确认后才进入同一 Repository。
- ✅ Context / Intelligence：permission-first Context Assembly、provider-neutral Intelligence Runtime、read-only LifeOS Bridge v0；Intelligence 不直接访问整库或写事实层。
- ✅ Riven 产品交互：单轮 user-triggered 请求、loading/unavailable/degraded、结构化结果，以及 Today / More 入口已接入。
- ✅ Action：Todo create/update/set-completion 已完成 Proposal → Permission → Confirmation when required → Domain Validation → Execute → Audit → Undo/Compensation。
- ✅ Automation / Proactivity：deterministic reminder foundation；proactive daily review 必须显式 opt-in，并受 scope、frequency、quiet hours、permission 与 cost budget 约束，只产生 governed output。
- ✅ Backup / Restore：LifeOS Data Package 覆盖核心事实、Health、Continuity、Action Audit 和可恢复设置；完整执行 Validate → Migrate → Atomic Restore → Reread Verify。
- ✅ Migration Gate：Dexie schema v1-v6 历史 fixtures、重复打开、失败原子性与升级后 Backup → Restore 已验证。
- ✅ Sync v1：Dexie 是 source of truth；durable outbox、checkpoint、tombstone、idempotent/domain-aware reconciliation；Supabase 仅为 append-only relay。Todo/Schedule/Mood/Cycle/Health/Continuity 同步，Action Audit 不跨设备。
- ✅ Sync runtime：新 Sync v1 是唯一 runtime 路径；启动、focus、恢复联网时 best-effort 触发，远端落库后刷新相关 Zustand view；未登录/离线/Supabase 失败不阻塞本地 CRUD。

### 当前重要架构决策
- **Local First**：Dexie / IndexedDB 是本地事实源；Backup 与 Sync 是两套能力；Netlify 只交付静态应用。
- **Fact / Derived / Inference / Suggestion 分层**：AI inference 不得静默升级为事实；Life State、Baseline、Timeline 都是 deterministic derived state。
- **Riven ≠ Provider**：Riven 是产品 intelligence identity。当前配置 adapter 的 provider id 是 `deepseek`；UI 可显示 Riven，但 runtime metadata 不得把 DeepSeek 冒充 Riven。
- **Provider 权限**：Provider 只收到本次请求授权的最小 context；fallback 默认不获得 Relationship Continuity。
- **写入治理**：Intelligence 只能产生 suggestion / Continuity Candidate / Action Proposal；所有事实写入继续由既有 Domain / Repository 所有。
- **Continuity 所有权**：Candidate 不是真实 Continuity；确认后复用 Manual Core，不建立第二套 memory store。
- **Sync 所有权**：Supabase relay 不维护业务当前状态；远端 operation 必须先经过 validation / reconciliation 才能进入 Local Repository。
- **Native 所有权**：未来 Swift bridge 只读取和转换 HealthKit 数据，最终只能通过 Health Import Boundary 写入 normalized Health Repository。
- **视觉冻结**：Glass A + Stagger + Static Pink Mist；Background 与 BottomNav 保持稳定，不采用 View Transition、动态 CSS/Canvas background、WebGL/WebGPU。

### 当前已知技术边界 / 风险
- **iOS Safari BottomSheet**：真机与最小 Repro 均确认，键盘/viewport 变化时实时 `backdrop-filter` sampling 会产生竖线、残帧或底页穿透。当前所有 iOS BottomSheet 使用静态、不采样底页的 Pink Mist Glass；非 iOS 保留原 Glass A。该 fallback 等待 Product Owner L4 复验。
- **Swift HealthKit 未实现**：Capacitor 与 bridge contract 已有，不能把 Windows adapter/mock 证据写成 native capability passed。
- **V2 尚未 Production**：当前 Sync、Riven 与跨域闭环只在 `v2-development` / Preview；不得把 V1 的 L5 继承为 V2 L5。
- **Riven Provider 配置**：Riven 是产品 identity；当前实际网络 provider 是可选 DeepSeek adapter，未配置/网络失败时明确 degraded，不影响本地功能。
- **Weekly/Monthly Mood 与更多 baseline 指标**：未为了图表提前扩展；当前只保留已有语义可靠的最小 derived foundation。
- **Todo 旧记录兼容过渡**：新语义已拆分；旧重复任务在编辑前可能继续通过 legacy `dueDate` 或运行时 `createdAt` fallback 展开。不会后台写回，编辑时要求确认正式起点。
- **页面切换背景光晕延迟（observation）**：Product Owner 观察到页面切换时粉色光晕约零点几秒渲染延迟；当前仅登记，不主动修改 BackgroundSystem。
- **Todo 日期小型标注（product backlog）**：希望列表直接显示重复起止日期或非重复截止日期；属于后续信息可见性增强，本次不实现。

### 当前正在处理的问题
- V2 Foundation 与产品闭环已完成，当前进入 **Final Acceptance / Polish**。
- 当前验收重点是 iOS BottomSheet stable fallback，以及 Riven/Action/Continuity/Sync/Backup 的 focused product regression。
- 不进入新 Phase，不扩展 Sync、Health、Intelligence、Action、Continuity 或 Proactivity scope。

### 最近一次重要开发结论
- **Sync v1 已取代旧 runtime 路径**：Local Dexie 仍是事实源；Supabase 只做 append-only relay；旧 SyncService/CloudRepository 不得重新并行启用。
- **Riven/provider 已分离**：页面 identity 与 provider metadata 是两层；当前 DeepSeek 必须报告 `deepseek`。
- **Intelligence 闭环已产品化**：单轮请求可产生 governed Todo Proposal 与 Continuity Candidate，但不能直接写事实。
- **Safari 处理边界已收敛**：不再用 timer/render-phase/visualViewport 动态修补 WebKit；iOS BottomSheet 使用静态视觉等价 fallback。
- **自动 Evidence 基线**：L1 typecheck + production build passed；L2 47 suites / 157 tests passed。iOS fallback 仍需 L4，V2 尚无 L5。

### 当前推荐的下一步
1. Product Owner 在最新 V2 Preview 复验所有主要 BottomSheet，重点覆盖首次打开、键盘唤起、连续开关、Safari 与 PWA standalone。
2. 通过后执行 V2 focused product regression：Riven 单轮请求、Todo Proposal/Undo、Continuity Candidate confirmation、Sync Local-First degradation、Backup/Restore 入口。
3. 只修验收确认的确定性问题；不顺手重构或扩大 V2 scope。
4. Final Acceptance 完成后再制定 V2 freeze / merge / Production release 指令，不自动操作 `master`。

### 哪些事项必须用户本人验收
- iPhone Safari / PWA 的视觉、键盘、safe-area、BottomSheet 与交互流畅度。
- 产品语义、Continuity 权限、数据模型 / Dexie migration、重大架构或新依赖。
- V2 freeze、merge `master` 与 Production deployment。
- macOS Native Milestone 的 Apple capability、HealthKit 权限和 Swift 真机行为。

### Agent 协作协议
- 详见 `AGENT_PROTOCOL.md` v1.3。
- 三方角色：人类 Product Owner（决策+真机验收）、ChatGPT（架构与产品审查）、Codex/Implementation Agent（实现、验证与授权范围内 Git 操作）；Riven 是产品 intelligence identity，不作为具体 Provider 或执行 Agent 名称。
- 核心原则：Product Audit First / Scope Lock / Change Surface / Evidence Levels / Deterministic First AI Second
- ChatGPT 必须审查开发流程本身，不只是代码
- 执行提示词保持明确、有限、可验证

---

## 快速参考

| 项目 | 当前值 |
|---|---|
| 项目路径 | `D:\personal_Lifeos_project` |
| 开发分支 | `v2-development` |
| V2 阶段 | Final Acceptance / Polish |
| 正式 Production | https://astounding-torrone-5409bc.netlify.app/ （仍为 V1） |
| GitHub | https://github.com/ting-png1/personal-life-os（私有） |
| Supabase 项目 ID | ryurxondlokpgkmcqfxs |
| 真机基准设备 | iPhone 16 Pro / iOS 26.3 |
| IndexedDB 数据库名 | `plife-os`（Dexie schema v6） |
| 当前自动测试基线 | 47 suites / 157 tests |
| V1 Final Release | `master` + annotated tag `v1.0.0`（Production L5 PASSED） |
