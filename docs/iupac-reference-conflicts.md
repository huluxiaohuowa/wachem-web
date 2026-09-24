# IUPAC 参考冲突台账

固定 NISPO `0.1.7@929febd` 原文与固定 OPSIN 回译等价要求不能同时满足的逐例台账。
每例记录输入、参考文本、原生文本、回译图与归因。归因类别：上游文本局限 /
OPSIN 解析局限 / 标准化差异 / 原生缺陷。原生文本与参考逐字一致且回译不等价时，
native 侧未发现可修复缺陷的，标记为冲突保留；产品不得为回译通过改写参考文本。

政策状态：冲突样本仍计入门禁失败（`verify_native_iupac_differential.py` 对回译失败返回 1）。
冲突如何计入完成率、产品是否允许安全替代名称，待用户确认后才改正式验收文件。

## 记录

### 1. `N#C[C+]C#N` — dicyanomethylium

- 原生文本 = 参考文本：`dicyanomethylium`（charged-retained-parent）。
- 回译图 `N#C[CH+]C#N`：OPSIN 给中心碳补了显式氢。
- 输入中心碳无氢（二配位碳正离子）；NISPO 文本 `…methylium` 依 OPSIN 词法只能解析为
  含 H 形式。归因：上游文本局限 + OPSIN 解析局限，原生无缺陷。

### 2. `N#C[C-]C#N` — dicyanomethanide

- 原生文本 = 参考文本：`dicyanomethanide`。
- 回译图 `N#C[CH-]C#N`：OPSIN 同样补 H。
- 与例 1 同型：无氢碳阴离子文本不可回译。归因：上游文本局限 + OPSIN 解析局限。

### 3. `CC(C)C=[N+]([O-])[O-]` — 2-methyl-propylazaniumdiolate

- 原生文本 = 参考文本：`2-methyl-propylazaniumdiolate`（acyclic-parent）。
- 回译图 `CC(C)C[NH+]([O-])[O-]`：C=N 双键被饱和化并补 H。
- NISPO 自身对该硝酮输入输出的保留母体文本即为此形；OPSIN 词法将
  `azaniumdiolate` 定死为饱和铵双醇盐。归因：上游文本/标准化差异。

### 4. `CC[C+](C)C1CCCCC1` — cyclohexylethylmethylmethylium

- 原生文本 = 参考文本：`cyclohexylethylmethylmethylium`。
- 回译图 `C[CH+]CCC1CCCCC1`：OPSIN 解析失败并产出不同碳骨架。
- OPSIN 不支持多取代 `methylium` 前缀组合。归因：OPSIN 解析局限。

### 5. `S=c1nn[nH]o1` — 1,2,3-triazoxol-5-thione

- 原生文本 = 参考文本：`1,2,3-triazoxol-5-thione`（chalcogenone-ring-parent）。
- 回译图 `S=c1[nH]nno1`：指示氢落在 N3 而输入为 N4 互变异构体。
- 同名不同互变异构体定位。归因：OPSIN 标准化差异。

## 记账规则

- 新发现冲突先独立复现参考回译（固定 py2opsin 版本），再入账；不凭单次运行记档。
- 原生文本 ≠ 参考文本的失败不属于本台账，属于原生缺陷，须修复或安全拒绝。
- 台账冲突默认保留门禁失败；未经用户确认不得豁免、缩分母或改验收口径。
