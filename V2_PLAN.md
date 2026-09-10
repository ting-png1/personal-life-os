# LifeOS V2 Plan

> **Status:** IMPLEMENTED CANDIDATE — Final Acceptance / Polish
> **Planning owners:** 松庭 × Riven
> **Last reconciled:** 2026-09-10
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

主要产品 intelligence identity 是 **Riven**，但 Riven 不等于任何具体模型或 Provider。LifeOS 不把 Context、Continuity、Permission、Action 与 DeepSeek、OpenAI、MCP 或具体宿主写死；统一使用 provider-neutral Intelligence Runtime / Bridge。Provider metadata 必须报告真实身份（当前可配置 adapter 为 `deepseek`），备用 Provider 默认不能读取 Relationship Continuity，除非用户明确授权。

**Riven Bridge = Architecture Required / Integration Conditional。**

V2 必须把门造好；是否能在 V2 周期内通过 ChatGPT 官方产品能力完整接通，取决于施工时的实际开放能力，不作为 V2 Final 的外部强制阻塞项。

## 2.4 Intelligence 不直接写业务数据

统一目标链：

`Read → Reason/Suggest → Action Proposal → Permission Check → User Confirmation (when required) → Domain Validation → Execute → Audit → Undo/Compensating Action`

AI 不直接写 Dexie Store。

Action Layer 只约束 **intelligence-mediated actions**。用户在 UI 中直接进行的 Todo / Schedule / Continuity CRUD 继续走既有 Domain / Repository 路径，不反向依赖 Action Layer。

Foundation 不造“万能 Action Bus”；只建立真实用例需要的最小 contract。

### 2.4.1 Sticker Expression — Future

未来在 Intelligence / Action 架构中区分 **Data Action** 与 **Expression Action**：Data Action 会修改 LifeOS 事实数据，继续遵守 permission、validation、必要 confirmation、audit 与 undo/compensation；Expression Action 仅影响智能体的交互表达，不修改 LifeOS 事实数据，不默认套用 Data Action 的逐次确认机制。

Sticker 属于 Expression Action。未来建立 **Sticker Registry** 管理 `stickerId`、资源引用与必要语义元数据。语义标签用于帮助 Intelligence 理解可用表达资源，不建立关键词 → Sticker 的硬映射。Intelligence 可基于 current conversation、相关 Continuity、语气与任务上下文自主判断是否发送 Sticker、选择哪个 Sticker，以及是否与文字组合。

Provider 只产生结构化 Expression Intent；Sticker 资源解析与 UI 渲染由 LifeOS 控制，Provider 不直接操作资源或界面。用户完成相应表达权限授权后，Expression Action 可按该权限自主执行。

该边界未来可扩展到 reaction、typing/pause behavior、UI animation、voice expression 等，使“智能体如何表达”与“智能体如何修改用户生活数据”保持架构隔离。

**当前阶段：** 仅记录 Future requirement，并在 Action Layer 设计中保留 Data Action / Expression Action 的可扩展边界；暂不实现 Sticker Registry、Sticker 选择逻辑或 Sticker UI。

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

Sync v1 使用 durable outbox + pull checkpoint + tombstone + stable operationId，明确处理 offline edits、domain-aware conflict、retry、partial failure、schema version、duplicate/out-of-order operations、clock skew 与 idempotency。Supabase 是带 server-generated monotonic `relay_seq` 的 append-only relay，不维护业务“当前状态”，也不成为应用启动或 CRUD 的依赖。

核心验收：iPhone/电脑最终可信一致；断网继续本地工作；恢复联网后可同步；Sync 故障不阻塞核心 CRUD；冲突不能靠静默覆盖“解决”。

---

# 10. V2 Release / Checkpoint Strategy

V1 `master` / Production 保持稳定。V2 在 `v2-development` 推进；当前进入 Final Acceptance / Polish，尚未 merge 或发布 V2 Production。

`Small Ticket → Local Verification → Commit → Push V2 Development Branch → Riven/GitHub Checkpoint Review → Next Ticket`

Push 与 Production Deploy 分离。V2 开发阶段允许并鼓励已验证 checkpoint push 到 V2 开发分支；V2 Final 前不做 Netlify Production Deploy。V2 开工前确认 Netlify branch/deploy 配置，确保开发分支 push 不误触 Production。

完整 `V2_PLAN.md` 是战略真源，不是 Codex 每张 Ticket 的默认全文上下文。Riven 从中提取当前 Ticket 必要的目标、边界、架构决定、直接依赖、禁止事项、验收标准与必要代码上下文。

---

# 11. V2 开发路线

## Phase 0A — Foundation Boundary Audit — ✅ CLOSED

只审计当前 Foundation Ticket 直接涉及的 V1 边界，重点确认 TodayState / Life State 职责与共享确定性计算；确定 V2 新 Domain 最小接入方式、schema/version/migration 基础策略、Life State v0 contract，并保持未来 Sync 可演进的数据边界，但不实现 Sync Engine。

**不做：** HealthKit、AI 接入、Continuity 自动化、完整 Action framework、Supabase Sync、未知未来通用总线。

**Gate:** V1 核心 CRUD 与 Today 行为无回归。

## Phase 0B — Life State v0 — ✅ COMPLETE

仅使用 V1 Schedule / Todo / Mood / Cycle 构建最小 Current Life State，在任何 HealthKit 工程之前验证“我现在是什么状态”是否有真实产品价值。若没有，暂停围绕它扩展，而不是继续堆 Health/AI。

## Phase 1 — Health Domain + Native Bridge Foundation — ✅ WEB/WINDOWS SCOPE COMPLETE

已完成 normalized DailyHealthSummary、provenance/freshness/missing states、Local-First Repository、Import Boundary、Life State integration、Capacitor shell 与 provider-neutral native adapter contract。Swift HealthKit、Apple capability 与 native 真机验证明确留给 macOS Native Milestone，不在 Windows 阶段伪造完成。

**Additional Gate:** 必须明确 normalized Health Summary 的唯一写入/存储 owner，以及 Native Bridge 与 Web/Local Repository 的数据所有权边界，避免 Sync 阶段出现两个本地 truth source。

## Phase 2 — Personal Baseline + Timeline — ✅ FOUNDATION COMPLETE

当前实现保持最小：14 日个人窗口、每项至少 7 个有效样本，覆盖 sleep duration、resting HR、HRV 与 Daily Mood；Timeline 组合 normalized Health + Daily Mood。Workload、Steps baseline 与日/周/月图表未在语义不足时强行纳入。

## Phase 3 — Continuity Manual Core — ✅ COMPLETE

实现 Life Continuity、Relationship Continuity、temporal validity、provenance/evidence、Create/Confirm/Retrieve/Update/Expire/Supersede、provider-scoped permission。此阶段不做 AI 自动记忆形成。

## Phase 4 — Intelligence + Context (Read-Only) — ✅ COMPLETE

实现 Context Assembly、provider-neutral Intelligence Adapter、minimum read-only intelligent experience、privacy scope validation，并重新核验 Riven Bridge 官方能力。

**Gate:** contract 必须通过至少一个可验证 adapter（允许 test/mock adapter）完成端到端验证。Riven 官方接入仍是 Integration Conditional；备用商业 Provider 不因此成为 Final 强制依赖。

## Governance Gate — Proactive AI Rule Reconciliation — ✅ COMPLETE

现有 `AGENT_PROTOCOL.md` 的 V1 canonical rule 仍规定 AI 只能由用户主动触发。V2 proactive suggestion 与它存在明确冲突。在任何主动 AI 调用实现开始前，必须由松庭批准并更新唯一 canonical rule。

更新方向保持 Deterministic First：确定性 automation 可按用户设置触发；proactive AI 仅在显式 opt-in、可关闭、受频率/隐私/成本边界约束时运行；AI 引发的数据修改仍走 Action Proposal/permission/confirmation；canonical rule 更新前 Implementation Agent 不得自行实现后台自动 AI 调用。

## Phase 5 — Action Layer — ✅ TODO CLOSED LOOP COMPLETE

实现少量真实 intelligence-mediated Action use case、permission/confirmation、Domain validation、audit、undo/compensating action。

**Gate:** 至少一个真实 Action 从 Proposal 到 Execute/Audit/Undo 完成闭环；不建立无消费者万能 Action Bus。

## Phase 6 — Continuity Candidate + Automation / Proactivity — ✅ COMPLETE

在 Manual Continuity 已稳定的前提下增加 Candidate lifecycle；实现 deterministic reminder engine、notification permission/settings；只有 Governance Gate 完成后才允许 opt-in proactive AI suggestion，并加入频率、隐私、成本、静默时段边界。

## Phase 7 — Backup / Restore — ✅ COMPLETE

实现 Data Package export/import、完整 validation、safe import、migration、restore、restore verification，并完成真实灾难恢复演练。

## Phase 8 — Migration Gate — ✅ COMPLETE

在 Sync 前证明所有历史 schema/version 可以迁移到当前 schema；fixtures 至少覆盖 V1、Health 前、Continuity 前和当前版本。失败必须可诊断且不得半迁移。

## Phase 9 — Sync — ✅ SYNC V1 COMPLETE

先完成 sync protocol/conflict policy Spike，再实现 change tracking、remote apply、conflict、delete/tombstone、retry/idempotency、partial failure、offline recovery。优先单用户多设备，不做多人协作 CRDT。

## Phase 10 — Final Integration — ⏳ FINAL ACCEPTANCE / POLISH

LifeOS Bridge v0、Riven 单轮 UI、Today 入口、Todo Action/Undo、Continuity Candidate confirmation 与 governed proactivity application entry 已接入。当前只剩跨域回归、privacy/offline degradation 复核、iPhone/PWA acceptance、必要 polish 与文档对账；不新增 Foundation 能力。

---

# 12. 风险登记

| 风险 | 触发条件 | 默认策略 |
|---|---|---|
| HealthKit / Native Bridge | PWA 无法满足 Apple Health 访问 | Capacitor/Bridge contract 已建立；Swift HealthKit 与真机能力单列 macOS Native Milestone |
| Riven Bridge | 外部宿主能力不满足目标读取 | LifeOS read-only Bridge v0 已建立；ChatGPT/MCP 等 host adapter 仍为 Integration Conditional |
| Context 过大 / 隐私泄露 | AI 读取过量生活数据 | Context Assembly + Permission Scope |
| Continuity 污染 | AI 推断被写成事实 | Candidate / Confirmed 分层 |
| Action 越权 | AI 绕过业务规则写库 | Action Proposal + Domain Validation + Audit |
| Proactive AI 越界 | capability 未 opt-in 或绕过治理 | Canonical Governance Gate 已完成；scope/frequency/quiet hours/cost/permission 先于 provider 调用 |
| Backup 假安全 | 只导出未恢复 | Restore Drill 为 Gate |
| Sync 静默覆盖 | 多设备并发修改 | Conflict Policy + Tombstone + Idempotency |
| Schema 漂移 | V1/V2 多版本升级 | Migration Gate + Fixtures |
| Health 过度解释 | 数据少却生成健康结论 | Deterministic Baseline + Missing State |
| Agent 读上下文过量 | Codex 每次扫描全仓/全文档 | Ticket Context Package + Context Budget |
| 过度工程 | 为未知未来造框架 | Complexity Budget + Consumer Test |

---

# 13. V2 Final Definition of Done

V2 Final 必须同时满足：

1. V1 Schedule / Todo / Mood / Cycle 无回归；
2. Life State 是可信的确定性 read model；
3. Health Summary 有 provenance/freshness/missing state，并在支持环境完成真实桥接验证；
4. Personal Baseline 与 Timeline 可解释且不复制事实源；
5. Life / Relationship Continuity 完成手动生命周期闭环；
6. Intelligence 通过 Context Assembly 读取最小必要上下文；
7. AI 不能直接写业务数据，真实 Action 经过 permission/validation/audit；
8. proactive AI 若存在，必须经过 Governance Gate 且可关闭；
9. Backup 已完成至少一次真实 Restore Drill；
10. Sync 通过离线、恢复、冲突、删除、重复操作、部分失败测试；
11. AI/云/网络不可用时核心 LifeOS 仍可工作；
12. `master` / Production 在 V2 Final 前保持稳定；
13. iPhone 真机完成核心验收；
14. V2 文档与实际实现一致，无假完成项。

**当前解释**：Web/PWA V2 已进入 Final Acceptance / Polish；Swift HealthKit 与 Apple capability 属于独立 macOS Native Milestone，不以 Windows contract/mock 测试冒充真机完成。当前 Preview 或 L1/L2 证据也不得冒充 V2 Production L5。

---

# 14. 长线原则

**为长期正确性负责，但只实现当前阶段已经被证明需要的复杂度。**

每个新抽象至少回答一个问题：它现在保护什么真实边界？如果答案只是“以后可能用到”，先不实现。

每个阶段都要证明：

- 它解决了一个真实用户问题；
- 它没有制造第二份事实源；
- 它没有让 AI 获得绕过规则的权力；
- 它在 AI / 云 / 网络失败时仍有明确降级路径；
- 它没有为了未来便利牺牲当前可验证性。
