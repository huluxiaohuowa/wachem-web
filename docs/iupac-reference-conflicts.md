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


## 6. 桥头烯/杂环桥名称的 OPSIN 回译局限（2026-09-25）

- 桥头双键命名（`bicyclo[3.3.2]dec-1(10)-ene` 等）与桥头杂原子名称
  （`9-methyl-6-azabicyclo[3.2.2]nonane` 等）：native 与 NISPO 冻结文本逐字一致，
  但 py2opsin 对该类桥环引文位次/桥头杂环解析能力不足，回译图与输入不符或为空。
  涉及 substituted-bicyclic（约 130 例）、unequal-substituted-bicyclic（约 450 例）、
  bicyclic-topology（4 例）。归因：OPSIN 解析局限；native 侧不改动。
- 这些语料的差分退出码 1 属预期；exact parity 仍是有效指标。
- bicyclic-polyene（188 例回译失败，2026-09-25 本次按逐例字段重算，不再按单一归因记档）：
  - 132 例 py2opsin 返回空，其中 36 例 native 文本与参考逐字一致（OPSIN 解析局限，归本台账），
    96 例 native 文本与参考的 von Baeyer 位次不同（`bicyclo[4.3.2]undeca-1(2),6(10)-diene`
    vs 参考 `…-1(11),5(6)-diene` 等），属原生编号缺陷，见记账规则第二条，不入台账。
  - 56 例回译图不等价，其中 34 例文本逐字一致（同图不同引文位次的 OPSIN 标准化差异），
    22 例文本亦不同（`bicyclo[4.4.3]trideca-1(10),12(13)-diene` vs native
    `…-1(2),12(13)-diene`），属原生编号缺陷，待 R4 的主桥/最低位次规则收口。
  - 旧记录把 188 例整体标为"逐字一致 + OPSIN 不解析"，是错误归因，已按上面四类更正；
    台账侧安全样本分母不变，未新增豁免。
- 含双键的磷酸/膦酸 2 例（`COC(=O)/C(=C\C(=O)O)C(O)P(=O)(O)O` 与
  `COC(=O)/C(=C\C(=O)[O-])CP(=O)(O)O`）：旧记录称"参考文本 py2opsin 返回空"，本次用固定
  py2opsin 独立复现，两条参考文本均解析成功且回译图与输入 canonical 一致
  （`(1E)-1-carboxy-3-oxo-2-(1,2-dihydroxy-2-oxo-3-oxa-2-phosphapropyl)-4-oxapenten`、
  `(2E)-3-methoxycarbonyl-4-(dihydroxyphosphoryl)-2-butenoate`）。因此它们不是参考冲突：
  当时 native 输出 `(2Z)-…`，是把斜键符号当成 CIP 结论（该双键一端同时挂
  甲氧羰基与 `CH(O)P` 两个重取代基，P>O 使优先基团不是被标记的那一支）。
  归因更正为原生缺陷；当前处置是按 CIP 未定域安全拒绝（`acyclic-parent` 的
  `hasPriorityUndeterminedDoubleBond` 门），该例从错构成功转为 unsupported，
  upstream 语料 named 357→356、回译等价 356 不变、退出码 1→0。

## 7. 保留碘杂环母体的双键定位歧义（2026-09-26）

- 语料 `tests/fixtures/iupac/nispo-0.1.7-iodine-rings.json`（`iodine-ring`，270 例，
  4/5/6/8/9 元、一至三个碘、可选 O/N 环原子与甲基支链，参考文本取自固定
  NISPO `smiles_to_iupac_batch`）。原生 named 46 / unsupported 224，本条把这 224 例
  归为安全拒绝，不是产器缺口。
- 逐例独立复现（固定 py2opsin 1.2.0 / RDKit 2026.3.6，按 canonical 图比对）：
  原生名 46 例全部回译等价，原生拒 224 例全部回译为不同双键异构体或解析歧义，
  两个划分完全重合（无"原生漏名的安全例"、无"原生误命名而回译不等价的例"）。
  分母按母体词拆开即见根因——**饱和母体全安全，不饱和母体几乎全歧义**：
  `iodocane` 5/5、`iodonane` 5/5、`iodinane` 4/4、`iodolane` 3/3、`diiodol` 2/2 安全，
  而 `iodonine` 129 例仅 5 安全、`iodocine` 70 例仅 5、`iodinine` 18 例仅 5、
  `iodazole` 1 例 0 安全。
- 机制：保留的 Hantzsch-Widman 型碘母体文本不编码双键位次，OPSIN 对同一文本只给
  一个固定异构体（并对 `iodoxol`/`iodazol`/`iodiodol` 直接报 `APPEARS_AMBIGUOUS`）。
  例 `C1=CC[IH]C1` 参考 `iodoline`，OPSIN 回译 `C1=C[IH]CC1`（双键挪了位）；
  与之对照的 `C1=C[IH]CC1` 才与 `iodoline` 的固定解析同图，故只有后者被原生命名。
  归因：上游文本局限；原生无缺陷。
- 原生处置即回译安全过滤：`NativeNISPOSingleRingRules.simpleIodineRingName` 的
  `isIsomorphic` 门只放"输入图等于该保留名的固定 OPSIN 解析图"的输入过去命名，
  其余按 `unsupported` 安全拒绝。去掉该门会为不同异构体发出参考文本，违反产品
  不得为过例发错名的一致性要求，故不移除。既有回归 `NativeIUPACTests.swift:1094`
  `testNativeNISPORetainedIodineRingReferenceConflictsStayUnsupported` 已钉
  `C1=CC[IH]C1`、`C1=CN[IH]C=1` 两例保持 unsupported，`:1227`/`:1230` 钉住回译安全子集。
- 门禁口径：该语料在 blanket `--require-full-coverage --require-exact-names` 下退出码 2/3
  （224 例覆盖与逐字 parity 记入门禁失败，符合本台账第二条政策状态）；在
  `--require-reference-safe-coverage` 下退出码 0（referenceSafeCases 46 == referenceSafeNamed 46）。
  缩分母、改验收口径或豁免本族待用户确认，本次未改代码、未改门禁。
- 与 HANDOFF 第 12/13 条的"不经 `ring_parent_candidates` 的保留带电母体族
  （`phenylium`/`selenazolium`）"不同源：那族是产器缺失、原生应补；本族是产器在、
  参考文本不可回译、原生应拒。不得混批计量。证据目录 `r16-iodine/`
  （`safety-probe.py`、`safety-fresh.json`、`parent-breakdown.json`、`fresh/` 原生报告、
  `refsafe/` 参考安全覆盖报告）。
