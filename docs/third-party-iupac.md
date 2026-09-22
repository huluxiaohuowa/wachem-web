# IUPAC 转换第三方组件

Phase 9 Web/API 使用以下本地组件；具体版本和分发文件校验和见 [`iupac-dependencies.lock.json`](iupac-dependencies.lock.json)。

- NISPO，BSD 3-Clause：结构/SMILES 到英文系统名称候选；
- OPSIN，MIT：英文化学名称到结构，并验证 NISPO 名称的结构回译；
- py2opsin，MIT：API 镜像中的 OPSIN 2.9.0 Python 调用封装；
- RDKit，BSD 3-Clause：SMILES 解析、规范化与分子图等价比较，由 NISPO 依赖引入。

正式发布前必须把各组件随包许可证原文纳入第三方通知产物，并复核最终 wheel/JAR 与锁定校验和。Apple 当前 `acyclic-v1` 规则核心为 WA Chem 原生实现，没有嵌入上述 Python/JVM 组件；后续移植规则或资源时必须逐项记录来源和许可证。
