# LifeOS — ChatGPT Handoff 快照

> **用途**：下一次 ChatGPT 接手 LifeOS 时，5 分钟内恢复完整上下文。
> **不是** CHANGELOG，不是完整项目文档。只保存当前真正需要知道的快照。
> **最后更新**：2026-09-02（原第三批 L4 已通过；3 项反馈修复已完成，等待定向 L4 复验）
> **协议版本**：AGENT_PROTOCOL.md v1.1（Evidence Levels L0-L5）

---

## 当前快照

### 项目阶段
- **Stability Sprint**（MVP 与 UI Migration Layer 1 已完成；V1 新功能暂缓）
- 当前分支：`feature/ui-migration-layer1`（未 push）
- 文档版本：v7.7.3；当前 Stability Sprint 修改尚未 commit

### 当前真实完成状态
- ✅ MVP 核心模块：Today / Schedule / Todo / Mood / Cycle（CRUD 完整）
- ✅ UI Migration Layer 1：Pink Mist Glass 设计系统、BackgroundSystem、BottomNav、5 个页面
- ✅ V1.6-V1.10：Schedule 重复规则（单双周/周范围/排除日期）、overrides（临时取消/调课时间/恢复默认）、Todo 分类、Todo 重复（每天/每周+按日期记录完成）
- ✅ Mood V1.1-V1.5：一天多次 Mood Event 时间线、Daily Mood 确定性聚合、Mood Lifeform 基础接入、Mood 记录编辑
- ✅ Stability Sprint 第一批：Todo legacy normalization、日期边界统一、Schedule recurrence/取消恢复/override 校验（无 schema/migration）
- ✅ Stability Sprint 第二批：BottomSheet large、完整导出/清空 Cycle、Today 午夜刷新
- ✅ Stability Sprint 第三批：Todo `dueDate` / `recurrenceStartDate` 语义拆分、旧数据只读兼容、非发生日完成保护、Today 编辑链路修复（无 Dexie migration）
- ✅ 第三批 L4 反馈修复：可选 `recurrenceEndDate`、Todo checkbox 轮廓对比度、TodoForm 打开回顶且不自动聚焦（无 Dexie migration）
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
- **--blur-* CSS 变量未定义**：backdrop-filter 实际无效，玻璃效果来自半透明背景+伪元素+阴影

### 当前已知技术边界 / 风险
- **iOS Safari 合成层 artifact（观察项）**：date/time 原生 picker 出现时可能产生临时竖线/晕影。v7.7.2 已修复理论根因（BackgroundSystem 静态背景的 will-change:transform 创建永久合成层），当前 iPhone 真机暂未复现。不宣称彻底解决，后续持续观察。如果复现，接受为 iOS 技术边界，不做视觉降级。
- **PWA standalone 真机验证**：需正式 HTTPS 部署后从 iPhone 主屏幕启动验证，当前暂停
- **Supabase 云同步**：生产能力暂停且不可信赖，当前不得作为数据保障；后续单独进入 Sync Stabilization Phase，不在本 Sprint 重构
- **Weekly/Monthly Mood**：暂缓，需真实数据积累
- **中央大型动态 Mood Lifeform**：已基础接入（最新 MoodRecord → Lifeform），最终规格待 Daily Mood 稳定后切换
- **性能问题**：iPhone 轻微卡顿，暂无明确瓶颈，待定位
- **Todo 旧记录兼容过渡**：新语义已拆分；旧重复任务在编辑前可能继续通过 legacy `dueDate` 或运行时 `createdAt` fallback 展开。不会后台写回，编辑时要求确认正式起点。
- **Todo 重复终点兼容**：`recurrenceEndDate` 为非索引可选字段；旧记录缺失时读取为 null（无限重复），不后台写回。范围含起点与终点当天。

### 当前正在处理的问题
- Stability Sprint 已确认的代码范围及本轮 3 项 L4 反馈修复已实现；等待重复终点、checkbox 可见度、表单回顶的定向 L4 复验
- Analytics / Notification 继续冻结，本轮没有修改
- Sync 单独立项；当前仍“不可信/不可作为生产数据保障”

### 最近一次重要开发结论
- **稳定性优先**：旧 Todo 数据、日期边界、Schedule recurrence、完整备份与 Today 跨午夜刷新属于确定性正确性问题，先于新增 V1 功能处理。
- **无隐式 migration**：第一、第二批未修改 Dexie version/schema；Todo legacy 只在读取时补默认值，不批量覆盖用户数据。
- **Evidence Level**：L1 tsc/build、L2 10 suite / 26 test、L3 浏览器回归均通过；第一、第二批及原第三批场景已有 L4，本轮 3 项反馈修复待定向 L4。尚无 L5 Production 验证。
- **渲染 artifact**：继续作为观察项，不再主动修改。

### 当前推荐的下一步
1. **完成定向 L4 复验**：验证重复终点含首含尾/空值无限、普通与禁用 checkbox 可见、Todo 表单重开回顶且不自动弹键盘
2. **验收后结束当前 Stability Sprint**：原第三批其他场景已通过，不要求整套重复验收；不自动进入 Analytics / Notification / Sync
3. **Sync Stabilization 单独立项**：包括 schema/DTO/tombstone/冲突/离线队列与生产验证，不混入当前 Sprint
4. **提交与部署另行批准**：当前工作区未 commit、未 push；Production 部署需用户批准

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
| 当前局域网预览 | `http://172.20.10.14:4174/`（2026-09-02 本机 WLAN 地址；需按验收说明手动启动 preview） |
| 真机基准设备 | iPhone 16 Pro / iOS 26.3 |
| IndexedDB 数据库名 | plife-os（Dexie version 2） |
| 当前 HEAD | `4213169`；Stability Sprint 修改未 commit |
