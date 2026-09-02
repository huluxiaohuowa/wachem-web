# ADR 0001 — 编辑器核心契约与双渲染器架构

状态：已接受（2026-09-01；同日修订：schema v2、渲染器落地路径）
关联：IMPLEMENTATION_PLAN §4.1、§5.4、§6.1、§7.3、§7.5

## 背景

WA Chem 的自研 SVG 编辑器是产品核心资产。为支持「实时笔迹增量识别」与 Mac/iPad 原生画布（Swift/Metal 渲染），同时保持服务器 Web 版继续以浏览器渲染，需要把文档模型与渲染解耦，并让两端共享同一份核心实现（双端同步硬规则）。

## 决策

### 1. 单一无头核心，两个编译产物

`apps/web/src/core/` 是唯一的编辑器实现（文档模型 + 命令/撤销 + 指针意图 + 空间查询 + 场景构建 + 快捷键映射），零 DOM 依赖：

- **浏览器产物**：ESM，随 Vite 构建（`apps/web`）；
- **Apple 产物**：`node build-core.mjs`（esbuild → IIFE → `dist-core/wa-chem-core.js`，全局名 `WAChemCore`），由 Mac/iPad 原生壳内嵌并在 **JavaScriptCore** 中执行（与 Safari 同引擎）。

`core/bundle.smoke.test.ts` 在无 DOM 的 VM 沙箱执行产物，作为 JSCore 契约测试守护。

### 2. 文档契约（schema v1）

`.wachem` 文件即文档 JSON：

```jsonc
{
  "schemaVersion": 1,          // 新文档写入；读取缺省视为 v0
  "name": "新结构",
  "style": "acs1996",          // 可选；缺省用运行时默认
  "atoms": [{ "id", "element", "x", "y", "charge }],
  "bonds": [{ "id", "a1", "a2", "order": 1|2|3, "kind"? }]
}
```

- 坐标为世界单位（1 标准键长 ≈ 56 单位，y 轴向下；Molfile 导出 ÷40 且 y 取反）。
- ID 为 `前缀_时间戳base32+计数器` 的确定性 ULID 变体（`core/ids.ts`），跨端生成规则一致。
- `parseDocument()` 是唯一入口：校验 + 补默认值（charge=0、order=1、name=「新结构」）。旧文件无需迁移。

### 3. 状态模型

`EditorState`（`core/state.ts`）= 旧 `EditorState` + 会话状态：

- `viewport {x, y, zoom}`：世界坐标相机（旧实现散落在组件态）；基准可视域 900×650（`BASE_VIEW`），`viewBoxFor()` 为 SVG 与 Metal 共用的投影公式，zoom ∈ [0.5, 2.5]；
- `gesture`：dragAtoms / bondDraft / marquee / pan 事务；拖拽预览经 `previewDocument()` 输出推测文档，>1 单位才提交快照（与旧行为一致）；
- `spacePan`、`displayStyle`：会话级，不入撤销历史。

撤销仍为全文档快照栈（上限 100），与旧实现一致。

### 4. 渲染：场景构建器是唯一真相源

`buildScene(state)`（`core/scene.ts`）输出类型化图元（line/polygon/polyline/circle/rect/text），分层 bonds → rings → draft → atoms → hover → marquee，**颜色、线宽、虚线、字体、光晕宽度全部在核心解析**（主题值收敛自旧 styles.css）。渲染器只做逐图元绘制，不做任何样式决策。样式开关（如 acs1996 方头线帽、字距 -0.02em）随图元携带。

**渲染器落地（2026-09-01 修订）**：Mac 生产路径为 Metal（`WAChemRender.SceneRenderer`）；AppKit/CoreGraphics 直绘（`ScenePainter`）保留为 PNG 导出和降级路径。着色器源码以纯文件加载（运行时编译 MSL），不依赖 SwiftPM 资源包——曾因 `Bundle.module` 缺失导致启动即崩（v0.1.8 后修复）。

### 5. 输入：指针意图与快捷键纯函数

- 视图只负责「像素 → 世界坐标」转换，随后调用 `EditorCore.pointerDown/Move/Up/Cancel(point, modifiers)`、`panBegin/panUpdate/panEnd`（世界增量）、`zoomBy/zoomStep`；
- 命中测试在核心（`core/spatial.ts`）：原子优先于键（与旧 DOM 叠放次序一致），原子半径 `max(14, fontSize×0.5)`，键阈值 8（旧 bond-hit 描边半宽）；
- 快捷键为纯函数 `shortcutAction(state, {key, meta, ctrl, shift})`，Web 键盘事件与原生 NSEvent 共用；空格平移由 `setSpacePan` 进入核心状态。

### 6. 原生桥

原生端不再经 WKWebView 字符串求值，而是在进程内 JSContext 直接调用 `EditorCore`（getDocument/setDocument/getMolBlock/newDocument/buildScene/dispatch），Swift `Codable` 结构镜像文档契约。Web 端 `window.__WA_CHEM_NATIVE__` 全局保留，绑定一次（方法读核心自身状态）。

## 后果

- 浏览器行为零变化（62 个测试锁定，含交互意图、场景几何、撤销语义、快捷键映射）；
- Metal 渲染器（M1）与 SVG 的视觉一致性由「同一 buildScene 输出」构造性保证，验收用金标场景对比；
- M3 笔迹（strokes 实体）将作为 schema v3 在本契约上扩展（v2 已被 aromaticRings 占用）；
- 多渲染器从此长期共存：这是对 §5.4 旧原则「不同时维护两套渲染器」的显式修订——所有渲染器共享一套场景构建器，维护面只剩渲染器本身；Mac 端当前生产渲染器为 Metal，CoreGraphics 为 PNG 导出和降级路径。
