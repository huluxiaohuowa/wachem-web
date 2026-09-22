# WA Chem Phase 8 完成度基线

冻结日期：2026-09-21
基线版本：0.1.75
用途：后续 Phase 9–13 的回归起点；不替代每次发布的真实产物与运行时验证。

## 已完成产品能力

- Web 自研 SVG 与 Apple Swift/Metal 共享语义的 2D 编辑器；
- 原子、键、环、模板、选择、移动、复制粘贴、撤销重做、结构清理与基础化学校验；
- MOL/SDF/SMILES/CDXML/CDX/RXN 现有能力矩阵内的导入导出；
- 文档、SQLite、本地 SDF 资产、独立账户、VOS OIDC 与 WA-DD 连接/写入；
- Web 服务端 OCSR 与 Apple Core ML 原生 OCSR 的取图—识别—回填产品流；
- 独立 Compose、`ictrek.app`、统一版本脚本、pull 包与 VOS App Store 发布链。

## 持续优化但不再阻塞基础阶段

- OCSR 在印刷图、截图、照片、手绘冻结集上的模型质量、置信度校准和目标设备性能；
- CDXML/CDX 边界格式保真；
- Apple 与 Web 的交互细节、辅助功能和性能回归。

## 未实现能力

- 2D→3D 与 PDB/SDF 三维结构工作区；
- 投料联算、智能手势命令识别与子结构搜索；
- IUPAC 名称↔结构产品入口；
- ¹H/¹³C NMR、tPSA/cLogP、pKa、ADMET 等科学服务。

## Phase 9 新增基础合同

- 共享冻结语料：`tests/fixtures/iupac/roundtrip-v1.json`；
- Web/API 契约：成功、歧义、不支持、无效、失败状态，provider/版本、结构版本、候选、警告和回译证据；
- Apple 契约：相同状态语义，由共享 Swift Core 直接读写 `ChemDocument`；
- 结构发生语义变化后结果必须过期；名称→结构候选只有用户确认后才能插入画布；
- 当前不开放 UI：Web provider 与 Apple 原生引擎的共同支持集尚未达到 Phase 9 发布门槛。

## 基线验证命令

```zsh
pnpm test
pnpm typecheck
/Users/hulu/dev/envs/conda/bin/python -m pytest -q
cd apps/apple-core && swift test
```

每次扩展 IUPAC 规则或 provider 时，先更新共享冻结语料，再运行四组命令。Apple UI/手工验证必须另行使用当前源码的新鲜 DerivedData 产物，不能用本文件中的单元测试代替。

## 2026-09-21 首轮验证记录

- API：`31 passed`；现有环境未安装 Ruff，因此本轮没有把 Ruff 标记为已执行；
- Web：`13` 个测试文件、`202 passed`，TypeScript project build 通过；
- Apple Core：XCTest `79 passed`，Swift Testing `20 passed`；其中原生 IUPAC 冻结集 `3 passed`；
- Web production build 通过；
- Mac Catalyst 使用独立 `/tmp/wa-chem-derived-phase8-20260921-1110` DerivedData 从当前源码构建成功；本轮未以历史安装包代替构建证据；
- API 目标镜像验证记录追加在 IUPAC 计划中；它只证明依赖与转换运行，不等于 Phase 9 产品完成。
