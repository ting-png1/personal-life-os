# LifeOS Layer 2 Material Lab — Batch 1

这是与正式 LifeOS 业务完全隔离的移动端实验页。它不 import `src/`，不读取 Store、Repository、Dexie 或 Supabase，也不写入用户数据。

## 启动

```powershell
cd D:\personal_Lifeos_project\experiments\layer2-material-lab
npm run dev
```

本机打开 `http://localhost:4175/`。iPhone 与电脑连接同一网络后，打开终端显示的 Network 地址。

生产构建预览：

```powershell
npm run build
npm run preview
```

## 候选说明

- **Baseline**：接近 Layer 1 的 500ms 交错进入、22px backdrop blur、五层玻璃与多个静态 blur 光晕。
- **Transition / Stagger**：逐块 60ms 延迟进入；信息层次清楚，但连续切页时总完成时间最长。
- **Transition / Crossfade**：只动画页面根节点，DOM 与合成层变化更少。
- **Transition / View Transition**：支持时使用浏览器 View Transition API；不支持时自动退回 Crossfade。
- **Glass A**：12px 中等 blur + 明确光学边缘，目标是在视觉与性能之间平衡。
- **Glass B**：不使用 backdrop-filter，以半透明渐变和边缘高光模拟玻璃，是低成本降级候选。
- **Glass C**：28px blur + 高饱和/亮度 + 深阴影，是压力测试候选，不默认推荐进入正式产品。
- **Background / Static**：单层组合 radial-gradient，无动态绘制。
- **Background / CSS**：3 个径向渐变层，只动画 transform，不动画 blur/filter。
- **Background / Canvas 2D**：单 canvas、30fps 上限、DPR 最高 1.25，页面隐藏时暂停。

## 建议真机记录

每种组合至少连续切换底部页面 20 次，并记录：

1. 粉色 glow 是否晚于页面内容出现，是否出现闪白、断层或色块。
2. `>33ms 帧` 是否持续增长，切页首帧是否频繁超过 100ms。
3. 玻璃边缘、文字和背景在切页或滚动时是否闪烁、变脏或瞬间失去 blur。
4. Canvas 运行 3 分钟后机身温度、掉帧、后台恢复和电量体感。
5. Safari 标签页与主屏幕 Standalone 分别测试；局域网 HTTP 只代表 Safari 浏览器证据，不等同于 HTTPS PWA Standalone。

## 回滚

本实验所有新增内容都在本目录。删除 `experiments/layer2-material-lab/` 即可完整回滚，不影响正式产品代码、配置、数据或文档。
