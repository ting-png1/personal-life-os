# LifeOS V2 Plan

> **Status:** FINAL --- Product & Architecture Plan
> **Planning owners:** 松庭 × Riven
> **Date:** 2026-09-03
> **Purpose:** 定义 V2 要做成什么、为什么这样设计、按什么顺序实现、什么算完成。
> **Canonical scope:** V2 产品目标、V2 架构选择、V2 Phase、V2 风险与 V2 Final 验收。
> **Not owned here:** 通用开发规则、Agent 协作流程、当前项目状态与历史变更。

## 0. 文档边界

V2 开发继续遵守仓库现有的 `PROJECT_RULES.md` 与 `AGENT_PROTOCOL.md`。本文件不复制它们已经拥有的 Local First、Evidence、Scope Lock、Agent 分工、push/deploy 等通用规则，只记录这些原则对 V2 产生的具体架构后果。

文档职责：

- `PROJECT_RULES.md`：整个 LifeOS 应如何被修改；
- `AGENT_PROTOCOL.md`：松庭 / Riven / Implementation Agent 如何协作；
- `PROJECT_PLAN.md`：项目当前真实状态；
- `CHANGELOG.md`：已经发生的变化；
- `CHATGPT_HANDOFF.md`：当前压缩快照；
- `V2_PLAN.md`：V2 要去哪里，以及为什么。

---

# 1. V2 产品定义

**LifeOS V2 是一个由用户拥有生活数据、由确定性系统维护事实与规则、由长期连续的智能系统理解上下文，并在明确权限下协助行动的 Local-First Personal Life OS。**

V1 解决“记录与管理生活”。V2 的核心变化不是“增加 AI 页面”，而是建立一份**可信的当前生活状态（Life State）**，让 Today、Continuity、Riven、Automation 与跨设备能力围绕同一套事实工作。

V2 Final 的理想体验：

1. 用户不需要为了“喂 AI”重复维护资料；
2. Today 能结合 Schedule、Todo、Mood、Cycle 与必要 Health Summary 呈现当前生活状态；
3. Riven 能按任务读取被授权的相关上下文，而不是扫描整个人生数据库；
4. Riven 可以提出建议和 Action Proposal，但不能绕过 LifeOS 的权限与业务规则直接写数据；
5. LifeOS 能保留长期重要的 Life Continuity 与 Relationship Continuity；
6. 确定性提醒不依赖 AI；
7. iPhone 与电脑最终可以可信同步；
8. AI、网络或云端不可用时，核心 LifeOS 仍能工作；
9. 用户的数据可以真正 Backup → Restore，而不是只能“导出看看”。

---

# 2. 核心架构决定

## 2.1 Life State 是 V2 中枢

Life State 是由确定性代码从现有事实派生出的“当前生活状态”，**不是 AI 总结，也不作为第二份事实库持久化**。

V1 `TodayState` 继续是 Today UI 的派生 ViewModel；V2 `Life State` 是更广的跨 Domain read model / context projection。两者必须复用同一批确定性 Domain 计算与 selector，禁止分别实现两套 Todo / Schedule / Mood 业务规则。

Foundation 第一项架构审计先确认 `TodayState` / `Life State` 边界；边界确认前不重构 `TodayAggregator`，也不创建持久化 `LifeState` 表。Life State 默认运行时派生；未来若引入 cache，cache 也不得成为 source of truth。

AI 默认获得：**Current Life State + Relevant Detail + Relevant Continuity + Current Conversation**，而不是完整数据库。

## 2.2 Fact / Derived / Inference / Suggestion 分层

- **Confirmed Fact**：用户确认或可信事实源产生；
- **Derived Fact**：确定性算法从事实计算得到；
- **AI Inference**：智能主体的解释或推断；
- **Suggestion**：尚未被用户接受的建议。

AI Inference 不得静默升级成 Confirmed Fact。

## 2.3 Riven First, Multi-Intelligence Ready

主要智能主体是 **Riven / ChatGPT**，但 LifeOS 不把 Context、Continuity、Permission、Action 与某个模型 API 写死。系统提供统一 Intelligence Adapter / Bridge 边界。备用模型默认不能读取 Relationship Continuity，除非用户明确授权。

**Riven Bridge = Architecture Required / Integration Conditional。**

V2 必须把门造好；是否能在 V2 周期内通过 ChatGPT 官方产品能力完整接通，取决于施工时的实际开放能力，不作为 V2 Final 的外部强制阻塞项。

## 2.4 Intelligence 不直接写业务数据

统一目标链：

`Read → Reason/Suggest → Action Proposal → Permission Check → User Confirmation (when required) → Domain Validation → Execute → Audit → Undo/Compensating Action`

AI 不直接写 Dexie Store。

Action Layer 只约束 **intelligence-mediated actions**。用户在 UI 中直接进行的 Todo / Schedule / Continuity CRUD 继续走既有 Domain / Repository 路径，不反向依赖 Action Layer。

Foundation 不造“万能 Action Bus”；只建立真实用例需要的最小 contract。

## 2.5 Continuity 是可管理的长期状态

分两个逻辑域：

**Life Continuity:** Fact / Goal / Preference / Life Stage / Important Event

**Relationship Continuity:** Anchor / Shared Event / Current Understanding / Evidence

两者分仓。重要条目支持适用时的 source/provenance、createdAt、validFrom/validUntil、lastConfirmed、confirmation state、evidence reference。

第一版先证明手动闭环：`Create → Confirm → Retrieve → Update → Expire/Supersede → Trace Evidence`。闭环稳定后 AI 才可以提出 `Continuity Candidate`，且第一阶段没有自动形成长期 Confirmed Continuity 的权力。

## 2.6 Sync 与 Backup 是两套能力

**Backup = 数据灾难后能恢复。Sync = 多设备在离线/并发条件下保持可信一致。**

V2 Final 要求 Sync，但最后施工。禁止用 `save Dexie + save Supabase` 冒充可靠同步。

方向：`Local Repository → Local Change → Sync Layer → Remote`。

Sync 开工前必须通过 Migration Gate。

---

# 3. Health Domain + Apple Health / Apple Watch

目标路径：`Apple Watch → Apple Health/HealthKit → iOS Health Bridge → Normalized Health Summary → LifeOS Local Repository → Life State/Today/Riven`。

首批候选：sleep duration/timing、resting heart rate、HRV、steps/activity、workout/exercise summary。Cycle 已有 LifeOS 自身事实源，不允许 Apple Health 无条件覆盖。

LifeOS 不复制整个 HealthKit 原始样本库；默认只保存真正有产品价值的 normalized summary、provenance、freshness 与必要派生统计。数据状态必须区分 available / unavailable / permission-limited / noData / stale，缺失不得解释成 0。

当前 PWA 不能直接承担完整 HealthKit 原生访问，需要 Native Bridge / Companion 类能力；不承诺秒级实时；LifeOS 不做医疗诊断；AI 默认只获得任务所需最小 Health Summary。具体桥接技术在 Phase 1 Spike 后决定。

---

# 4. Personal Baseline

第一版只做 Sleep / Activity / Mood / Workload，回答“今天与用户自己的近期状态相比发生了什么变化？”。Baseline 优先由确定性统计产生。

明确不做 Life Score、AI 凭感觉健康评分、数据不足时的复杂健康/情绪预测。

---

# 5. Life Timeline

Timeline 是 **Derived View**，不是新事实源。组合 Schedule、Todo completion、Mood、Cycle、Health Summary、Important Event，用于日/周/月回顾、Continuity Candidate 发现入口和 Riven 阶段性上下文。禁止复制第二份业务事实。

---

# 6. Context Assembly

`User Request → Required Domains → Permission Filter → Current Life State + Relevant Detail + Relevant Continuity + Current Conversation → Intelligence Provider`

权限过滤必须发生在向 Provider 暴露数据之前。设计保留 **Provider × Domain × Purpose/Scope** 边界，但早期不建设复杂 IAM/ACL，只实现真实用例所需最小权限机制。

---

# 7. Automation / Notification

Automation 与 Intelligence 分开。确定性规则负责 schedule reminder、deadline reminder、recurrence/deterministic triggers。AI 可以主动建议，但不能静默修改。V2 需要主动程度/打扰程度设置，不设计任意后台 Agent 永久在线。

---

# 8. Backup / Restore / Data Ownership

统一 LifeOS Data Package 至少具备 schemaVersion、exportedAt、core life data、Health Summary、Continuity、preferences、必要 metadata。

验收链：`Export → Validate Package → Safe Import → Schema Migration → Restore → Verify Restored State`。

导入失败不得破坏现有本地数据。**没有成功 Restore 过的 Backup 不算 Backup。**

---

# 9. Sync

Sync 必须明确处理 offline edits、conflict、delete/tombstone、retry、partial failure、schema version、duplicate changes、clock skew、idempotency。具体 change protocol/conflict policy 在 Sync Phase 独立设计 + Spike。

核心验收：iPhone/电脑最终可信一致；断网继续本地工作；恢复联网后可同步；Sync 故障不阻塞核心 CRUD；冲突不能靠静默覆盖“解决”。

---

# 10. V2 Release / Checkpoint Strategy

V1 `master` / Production 保持稳定。V2 在独立开发分支长线推进。

`Small Ticket → Local Verification → Commit → Push V2 Development Branch → Riven/GitHub Checkpoint Review → Next Ticket`

Push 与 Production Deploy 分离。V2 开发阶段允许并鼓励已验证 checkpoint push 到 V2 开发分支；V2 Final 前不做 Netlify Production Deploy。V2 开工前确认 Netlify branch/deploy 配置，确保开发分支 push 不误触 Production。

完整 `V2_PLAN.md` 是战略真源，不是 Codex 每张 Ticket 的默认全文上下文。Riven 从中提取当前 Ticket 必要的目标、边界、架构决定、直接依赖、禁止事项、验收标准与必要代码上下文。

---

# 11. V2 开发路线

## Phase 0A — Foundation Boundary Audit

只审计当前 Foundation Ticket 直接涉及的 V1 边界，重点确认 TodayState / Life State 职责与共享确定性计算；确定 V2 新 Domain 最小接入方式、schema/version/migration 基础策略、Life State v0 contract，并保持未来 Sync 可演进的数据边界，但不实现 Sync Engine。

**不做：** HealthKit、AI 接入、Continuity 自动化、完整 Action framework、Supabase Sync、未知未来通用总线。

**Gate:** V1 核心 CRUD 与 Today 行为无回归。

## Phase 0B — Life State v0

仅使用 V1 Schedule / Todo / Mood / Cycle 构建最小 Current Life State，在任何 HealthKit 工程之前验证“我现在是什么状态”是否有真实产品价值。若没有，暂停围绕它扩展，而不是继续堆 Health/AI。

## Phase 1 — Health Domain + HealthKit Bridge

做 iOS native capability Spike、最小桥接方案、HealthKit authorization、minimum viable read、normalized Health Summary、provenance/freshness/missing states、接入已验证 Life State、iPhone 真机验证。

**Additional Gate:** 必须明确 normalized Health Summary 的唯一写入/存储 owner，以及 Native Bridge 与 Web/Local Repository 的数据所有权边界，避免 Sync 阶段出现两个本地 truth source。

## Phase 2 — Personal Baseline + Timeline

实现四项 baseline、Life State baseline delta、Timeline derived view、日/周/月基础回顾。每个指标必须对应真实用户问题。

## Phase 3 — Continuity Manual Core

实现 Life Continuity、Relationship Continuity、temporal validity、provenance/evidence、Create/Confirm/Retrieve/Update/Expire/Supersede、provider-scoped permission。此阶段不做 AI 自动记忆形成。

## Phase 4 — Intelligence + Context (Read-Only)

实现 Context Assembly、provider-neutral Intelligence Adapter、minimum read-only intelligent experience、privacy scope validation，并重新核验 Riven Bridge 官方能力。

**Gate:** contract 必须通过至少一个可验证 adapter（允许 test/mock adapter）完成端到端验证。Riven 官方接入仍是 Integration Conditional；备用商业 Provider 不因此成为 Final 强制依赖。

## Governance Gate — Proactive AI Rule Reconciliation

现有 `AGENT_PROTOCOL.md` 的 V1 canonical rule 仍规定 AI 只能由用户主动触发。V2 proactive suggestion 与它存在明确冲突。在任何主动 AI 调用实现开始前，必须由松庭批准并更新唯一 canonical rule。

更新方向保持 Deterministic First：确定性 automation 可按用户设置触发；proactive AI 仅在显式 opt-in、可关闭、受频率/隐私/成本边界约束时运行；AI 引发的数据修改仍走 Action Proposal/permission/confirmation；canonical rule 更新前 Implementation Agent 不得自行实现后台自动 AI 调用。

## Phase 5 — Action Layer

实现少量真实 intelligence-mediated Action use case、permission/confirmation、Domain validation、audit、undo/compensating action。

**Gate:** 至少一个真实 Action 从 Proposal 到 Execute/Audit/Undo 完成闭环；不建立无消费者万能 Action Bus。

## Phase 6 — Continuity Candidate + Automation / Proactivity

Continuity Candidate 必须在 Manual Continuity、Read-only Intelligence 与 Action Layer 都稳定后开始。AI 可发现候选、提出依据；用户确认后通过已验证 Action/Domain 路径进入 Confirmed Continuity。

同时实现 deterministic notification engine、schedule/deadline/recurrence triggers、proactive suggestion、disturbance/proactivity controls。AI proactive suggestion 必须满足 Governance Gate；Automation 与 Intelligence 保持分离。

## Phase 7 — Backup / Recovery Hardening

实现 formal export contract、import validation、schema migration、safe restore、recovery test。**Gate: 必须完成真实 Restore 测试。**

## Phase 8 — Migration Gate

验证 `Existing V1 User Data → Current V2 Schema → No silent data loss → Derived states rebuild correctly → Backup/Restore still works`，特别检查 legacy Todo、recurrence、Mood history、Cycle、Health/Continuity 缺省状态、schemaVersion、migration 可重复性/failure handling。

**Migration Gate 未通过，不允许开始正式多设备 Sync。**

## Phase 9 — Sync

实现 change tracking、remote adapter、Supabase integration、conflict policy、tombstones、retry/idempotency、offline tests、multi-device tests。这是 V2 数据层最高风险阶段。

## Phase 10 — V2 Final Integration

端到端验证 V1 regression、iPhone、desktop、offline、Health permission edges、AI unavailable fallback、Continuity integrity、Action permission/undo、Backup→Restore、V1→V2 migration、multi-device Sync、Production。通过真实设备验收后才能 Freeze V2。

---

# 12. V2 Final 验收定义

1. V1 核心能力没有被 V2 架构破坏；
2. Life State 已证明有真实产品价值，并由确定性事实形成；
3. HealthKit / Apple Watch 必要摘要能在授权范围内进入 LifeOS；
4. Personal Baseline 覆盖四项有价值指标；
5. Timeline 不制造第二事实源；
6. Life/Relationship Continuity 分离、可追溯、可修正、支持时间有效性；
7. AI 只能读取被授权且与任务相关的上下文；
8. AI 无权绕过 Action Layer 修改核心数据；
9. 关键智能写操作具备 permission/audit/undo；
10. Deterministic Automation 不依赖 AI；
11. AI 不可用时核心能力仍工作；
12. Backup 已通过真实 Restore；
13. V1→V2 migration 已通过 Migration Gate；
14. iPhone/电脑 Sync 达到可信可用；
15. Sync/网络故障不阻塞本地核心 CRUD；
16. Riven Bridge contract 已存在并经过可行性验证；实际集成按施工时官方能力实现或保持 Conditional；
17. Production 通过最终真实设备验收后才能 Freeze。

---

# 13. Degradation / Failure Matrix

- HealthKit/permission unavailable → 核心正常，Health 明确显示不可用/受限；
- Riven Bridge unavailable → 核心正常，不阻塞事实记录与确定性功能；
- Optional Provider unavailable → 核心正常；
- Supabase/Sync unavailable → 本地继续读写，保留待同步变化；
- Continuity retrieval fails → 事实层不受影响；
- Partial/invalid import → 不破坏当前本地数据，安全失败。

跨设备 Sync 只实现可靠同步所需最小 authentication/device identity，不扩张成 SaaS 账号系统、多人权限或社交 profile。

---

# 14. 明确不做

AI 全自动管理人生；AI 静默修改生活数据；巨型 Life Score；医疗诊断；数据不足时复杂健康/情绪预测；全量复制 HealthKit 原始样本；为 HealthKit 重写整个 LifeOS；为 Timeline 复制第二份业务数据；把全部聊天记录塞进 Continuity；AI 未确认直接形成长期 Confirmed Continuity；默认把 Relationship Continuity 暴露给备用模型；让云端成为本地 CRUD 前置；Foundation 建立无近期消费者的巨大抽象；把外部平台未来能力写成已可用。

---

# 15. 延迟技术决策

- iOS HealthKit bridge technology → Phase 1 Spike；
- Health/native notification responsibility → Phase 6 前；
- Continuity retrieval/index strategy → Phase 3；
- Riven↔LifeOS official integration → Phase 4；
- Optional API fallback → Phase 4；
- Sync change/conflict protocol → Phase 9 Design + Spike。

原则：**不知道的东西明确写“不知道”；不使用架构图伪装已经解决。**

---

# 16. Dependency / Gate Audit — PASS

最终依赖链：

`V1 Stable → Foundation Boundary Audit → Life State v0 → Health → Baseline/Timeline → Manual Continuity → Read-only Context/Intelligence → Action Layer → Continuity Candidate/Automation/Proactivity → Backup/Restore → Migration Gate → Sync → Final Integration`

已修正的真实依赖问题：Life State 不再与 TodayState 形成平行重复聚合器；AI Continuity Candidate 不再早于 Intelligence/Action；proactive AI 在 canonical governance rule 更新前被 Gate 阻断；Native Health Bridge 必须先确定数据 owner；Riven 外部能力不阻塞 provider-neutral contract 验证；ordinary user CRUD 与 intelligence-mediated Action 分离。

未发现剩余循环依赖或必须新增的产品模块。后续新问题优先在对应 Phase 解决，不再扩大 V2 Final scope。

---

# 17. V2 Freeze 判断

如果新功能不能明显增强以下至少一项，则默认不进入 V2 主线：真实生活状态理解、数据所有权、长期连续性、安全可控智能协作、主动但不过度打扰的生活辅助、跨设备可靠性。

**V2 功能范围在本计划处停止扩张。**

后续只允许修正规划漏洞、完成必要技术 Spike、按 Phase/Ticket 实施与验证，不再继续横向加功能。

## External Capability Note

OpenAI / ChatGPT 集成能力属于会变化的外部条件。正式进入 Riven Bridge 实施阶段前，必须重新核验当时官方产品能力与当前账户实际权限；不得直接沿用 2026-09-03 的产品假设。
