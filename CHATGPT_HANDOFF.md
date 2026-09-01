# LifeOS — ChatGPT Handoff 快照

> **用途**：下一次 ChatGPT 接手 LifeOS 时，5 分钟内恢复完整上下文。
> **不是** CHANGELOG，不是完整项目文档。只保存当前真正需要知道的快照。
> **最后更新**：2026-09-01
> **协议版本**：AGENT_PROTOCOL.md v1.0

---

## 当前快照

### 项目阶段
- **V1 长线开发**（MVP 已完成，UI Migration Layer 1 已完成并真机验收）
- 当前分支：`feature/ui-migration-layer1`（未 push）
- 版本：v7.7.2

### 当前真实完成状态
- ✅ MVP 核心模块：Today / Schedule / Todo / Mood / Cycle（CRUD 完整）
- ✅ UI Migration Layer 1：Pink Mist Glass 设计系统、BackgroundSystem、BottomNav、5 个页面
- ✅ V1.6-V1.10：Schedule 重复规则（单双周/周范围/排除日期）、overrides（临时取消/调课时间/恢复默认）、Todo 分类、Todo 重复（每天/每周+按日期记录完成）
- ✅ Mood V1.1-V1.5：一天多次 Mood Event 时间线、Daily Mood 确定性聚合、Mood Lifeform 基础接入、Mood 记录编辑
- ✅ 基础设施：GitHub（私有）、Netlify（已 Public，密码保护已关闭）、Supabase（云同步代码完成，MVP 默认本地）、PWA（manifest + service worker + App Shell）
- ✅ BottomSheet × iOS Safari × Keyboard × Glass 渲染问题：v7.7.2 找到真正根因（BackgroundSystem will-change:transform），已修复，待真机确认

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
- **iOS Safari 合成层 artifact**：date/time 原生 picker 出现时可能产生临时竖线/晕影。v7.7.2 修复 BackgroundSystem will-change 后待真机确认。如果仍存在，接受为 iOS 技术边界，不做视觉降级。
- **PWA standalone 真机验证**：需正式 HTTPS 部署后从 iPhone 主屏幕启动验证，当前暂停
- **Supabase 云同步生产配置**：代码已完成，需配置 Netlify 环境变量，当前暂停
- **Weekly/Monthly Mood**：暂缓，需真实数据积累
- **中央大型动态 Mood Lifeform**：已基础接入（最新 MoodRecord → Lifeform），最终规格待 Daily Mood 稳定后切换
- **性能问题**：iPhone 轻微卡顿，暂无明确瓶颈，待定位
- **Todo 时间语义**：dueDate 对非重复是"截止"，对重复是"锚定/开始日期"，语义混用。Today 展示模型（今日必做/即将到期）已审计，待用户确认后实现

### 当前正在处理的问题
- v7.7.2 BackgroundSystem 渲染 artifact 修复，待 iPhone 真机确认
- Todo Today 展示模型优化（今日必做 + 即将到期），待用户确认方案

### 最近一次重要开发结论
- **渲染 artifact 真正根因**：不在 BottomSheet，而在 BackgroundSystem 的 `willChange: 'transform'` 为静态背景创建永久合成层 + 6 个 blur 光晕。iOS 键盘出现时 viewport 变化触发重绘，背景层永久合成层产生 artifact。BottomSheet 只占底部 75vh，artifact 出现在屏幕中央正好对应背景光晕位置。之前 v7.5.3-v7.7.1 的所有 BottomSheet 修复都找错了地方。
- **修复**：移除静态背景的 will-change，仅在 liquid 动画模式时启用。

### 当前推荐的下一步
1. **iPhone 真机验证 v7.7.2 修复**：新建日程 → 开始时间 → 结束时间，确认屏幕中央无竖线/晕影
2. **确认 Todo Today 展示模型**：今日必做（含逾期）+ 即将到期（未来3天），是否符合预期
3. **确认后进入 V1 后续功能开发**：Cycle 预测优化、Mood Weekly 统计（需数据积累）、数据备份/恢复优化

### 哪些事项必须用户本人验收
- iPhone 16 Pro / iOS 26.3 真机体验（渲染 artifact、移动端布局、交互流畅度）
- 产品方向、交互逻辑、数据定义变化
- 数据模型 / Dexie schema / migration 变更
- 生产部署（push / Netlify deploy）
- PWA standalone 从主屏幕启动验证

### Agent 协作协议
- 详见 `AGENT_PROTOCOL.md` v1.0
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
| 局域网 IP | 10.15.31.250（iPhone 测试用 http://10.15.31.250:5173） |
| 真机基准设备 | iPhone 16 Pro / iOS 26.3 |
| IndexedDB 数据库名 | plife-os（Dexie version 2） |
| 最近 commit | 083d13c（docs: v7.7.2） |
