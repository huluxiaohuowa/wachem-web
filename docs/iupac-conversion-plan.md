# WA Chem IUPAC 名称与结构双向转换实施计划

状态：Phase 9 实施中；结构→名称优先扩展；0.1.76 已冻结并提交统一发版，NISPO 完成门禁仍未通过
最后更新：2026-09-23

## 1. 最终目标

WA Chem 最终提供同一个用户能力：

- 输入英文系统化 IUPAC 名称，得到一个或多个可确认、可编辑的化学结构候选；
- 对用户明确选中的一个完整分子生成英文系统名称；不默认命名整张画布；
- 每个成功结果都携带实现名称、规则版本、输入结构版本和往返验证证据；
- 名称存在歧义、结构不受支持或往返不等价时返回正式失败结果，不猜测、不静默降级；
- Web 与 Apple app 使用同一产品契约和冻结样例，达到共同门槛后一次性对用户开放双向入口。

“IUPAC 名称”与“可逆结构标识”必须分开：IUPAC 名称是人可读命名，一个结构可能有多个合法名称；InChI、同分异构 SMILES 和 Molfile/SDF 是结构表示。界面不得把 InChI 或 SMILES 标成 IUPAC 名称，也不得把“能够被 OPSIN 回译”描述为 IUPAC Preferred Name（PIN）。

## 2. 已冻结的实现边界

### Web

- 结构→名称使用本地部署、固定版本的 NISPO；
- 名称→结构使用本地部署、固定版本的 OPSIN；
- NISPO 结果必须由 OPSIN 回译，并与输入结构做规范化分子图等价比较；
- 不依赖 PubChem 命中，不把外部联网查询作为成功路径；PubChem 后续只能作为可选的已知化合物信息来源；
- Web 依赖运行在服务器科学计算模块中，不进入浏览器主线程。

### Apple app

- IUPAC 双向引擎在 `apps/apple-core` 内以 Swift 原生代码实现，直接读写共享 `ChemDocument`；
- 不嵌入 Python、Java/JVM、WebView 或本地 HTTP sidecar，不调用 Web 版 IUPAC 服务作为隐式回退；
- 结构→名称参考 NISPO 的 BSD-3-Clause 规则逻辑和资源，名称→结构参考 OPSIN 的 MIT 语法与解析阶段，但针对 WA Chem 原生化学图接口重新实现；
- Apple 端不得引入第二套产品状态。界面、候选确认、写入画布、撤销和结果过期仍由共享 Apple 产品层负责；
- 官方 InChI C 实现可以作为 Apple 原生可逆标识与测试预言机接入，但不属于 IUPAC 命名引擎，也不能替代名称生成。

### 共同非目标

- 第一版不承诺中文系统命名、俗名、商品名或 CAS 名称覆盖；这些属于独立词典/检索能力；
- 不承诺每个合法结构都有名称。聚合物、Markush、配位化合物、混合物和未支持的复杂立体描述允许明确拒绝；
- 不以字符串相等判断化学正确性；名称不同但回译结构等价可以成功；
- 不在双向闭环完成前发布单向按钮或以“实验性”绕过化学验收。

## 3. 共享契约

产品层只依赖两个深模块接口，不感知 NISPO、OPSIN 或 Swift 内部阶段：

```text
nameToStructure(name, options) -> NameToStructureResult
structureToName(structure, options) -> StructureToNameResult
```

结果至少包含：

- `status`: `success | ambiguous | unsupported | invalid | failed`；
- `provider`、`providerVersion`、`rulesetVersion`；
- `sourceStructureVersion` 与规范化结构校验和；
- 名称候选的 `name`、`nameKind`（systematic / retained / roundTripSafe）和警告；
- 结构候选的 Molfile/SMILES、原子/键图、立体化学状态和歧义说明；
- `roundTrip`: 是否执行、回译结果、等价性结论和失败阶段；
- 可展示但不可写入画布的失败原因。

名称→结构候选只有经过用户确认后才能通过一个 `InsertNameCandidate` 命令写入画布；一次确认对应一次撤销记录。结构发生语义变化后，已有名称结果立即标记为过期。

## 4. 内部实施步骤

这些步骤是工程验证顺序，不是分批对用户发布。任何一步未通过退出条件，双向入口都保持关闭。

当前进度（2026-09-23）：

- Step 0 进行中：已锁定 NISPO `0.1.7@929febd093f4c5069d4004d91d785948514aea15`、py2opsin 1.2.0/OPSIN 2.9.0 和许可证边界；除 93 条快速分层语料外，已从官方测试源码可复现地冻结 1,296 个唯一规范结构，后续覆盖率以该官方语料为最低基线；
- Step 1 进行中：共享状态/候选/结构版本/回译合同已进入 API 与 Swift Core；完整规范化校验和及 InChI 基线尚未实现；
- Step 2 进行中：API 已实现本地 NISPO→OPSIN 回译和 OPSIN→结构端点，x86_64 目标镜像已验证，完整冻结集仍待扩充；
- Step 3 未完成：Apple 纯 Swift 已接入与官方同名的 `MoleculeFacts → RoutePlan → RuleSpec → Candidate` 通用执行骨架，并为每个结果记录实际规则族。第一次诚实审计发现原实现 98 个“成功”中仅 62 个 OPSIN 回译等价，随后已禁止旧精确图查表和未经支持的电荷、自由基、异常氢价、互变异构/指示氢状态冒充成功。官方 1,296 条基线当前 1,296 条均可导入、75 条返回名称，75/75 OPSIN 回译结构等价、67 条名称与 NISPO 完全一致、`legacy-exact-graph-fallback` 命中为 0；命名覆盖率仍仅 5.79%。按上游实际命中规则归因，最大缺口依次包括 `single-ring-parent`（208 例，仅 13 例原生命名）、`kekulized-generic-polycyclic-parent`（137 例，0 例）和 `generated-fused-parent`（94 例，0 例）。母体候选排序、递归取代基、完整后缀、部分氢化环、互变异构/指示氢以及复杂电荷/硫磷硼规则尚未等价移植，因此本步骤距离退出条件仍很远；
- Step 4 暂缓扩面：名称→结构维持 `organic-v3`，不再阻塞 Step 3 的结构命名覆盖，但不得据此宣称双向完成；
- Step 5/6 进行中：27 条共享冻结向量中的 Apple 支持项全部双向往返通过；Web 和 Apple 已接产品入口，结构→名称只接受一个完整分子选区；右键/触摸长按后直接生成，不再弹出转换窗口；
- NISPO 完整复现仍未达到发版门禁；继续开发须完成全量回归、新鲜 Apple 产物验证、目标镜像重建和发布验收后才能进入下一次统一发版。

### Step 0：冻结语义、许可证和测试语料

工作：

1. 固定 NISPO、OPSIN、InChI 和相关资源版本及 SHA-256；
2. 保存 BSD-3-Clause、MIT 和 InChI 许可声明，建立第三方通知清单；
3. 定义原子、键、芳香性、形式电荷、同位素、隐式氢和立体化学的规范化比较规则；
4. 建立分层冻结集：直链/支链、烯炔、常见官能团、单环、杂环、稠环、螺环、电荷、同位素、E/Z、R/S，以及明确不支持的反例；
5. 冻结共享 JSON 测试向量，使 TypeScript/Python 与 Swift 消费同一输入和期望结构。

退出条件：许可证可分发；测试向量可在 Web 化学核心和 Apple `ChemDocument` 之间无损加载；等价比较规则有单元测试。

### Step 1：原生可逆结构标识基线

工作：

1. 校正 Web 与 Apple 的同分异构 SMILES 往返；
2. Apple 端以 Swift/C 原生接入官方 InChI，实现结构→InChI→结构测试；
3. Molfile/SDF 保留二维坐标和可编辑图，InChI/SMILES 只承担规范化身份与等价验证；
4. 建立同一结构在 Web、Apple、OPSIN/RDKit 之间的稳定校验和映射。

退出条件：冻结集的原子、键、形式电荷、同位素和立体化学往返达到既定门槛；坐标丢失不被误报为化学结构变化。

### Step 2：Web 双向参考实现

工作：

1. 增加服务器 `nomenclature` 模块，固定安装 NISPO 与 OPSIN；
2. 实现两向接口、超时、输入大小限制和结构化错误；
3. 对结构→名称执行 NISPO→OPSIN→规范化结构比较；
4. 对名称→结构保留 OPSIN 的警告、歧义和立体化学信息；
5. 增加 API 合约测试与冻结集报告，但暂不显示产品入口。

退出条件：服务器可离线运行；所有成功的结构→名称结果都通过回译等价检查；失败不会返回伪名称或空结构。

### Step 3：Apple 原生结构→名称

工作：

1. 目标不是逐个分子打补丁，而是以固定 NISPO 版本的可命名有机结构域为覆盖基线；Apple 冻结集按无环、单环、杂环、稠环、桥环、螺环、官能团、电荷、同位素和立体化学分层抽样；
2. 在 `NativeCore` 建立通用图分析基础：连通分量、环系、主链/母体候选、官能团优先级、递归取代基、编号和立体描述符；
3. 按 NISPO 的规则阶段移植母体选择和名称组装，不接受按截图或单个分子硬编码成功分支；
4. 用 `ChemDocument` 的稳定原子 ID 保留名称片段与来源原子的映射，便于错误定位；
5. 每个生成名称都送入开发期参考 OPSIN 做差分回译；产品运行时不依赖网络或外部运行时；
6. 不支持结构返回具体失败阶段，不退化为分子式、SMILES 或数据库标题。

固定验证命令与口径：

- `scripts/generate_nispo_upstream_corpus.py <NISPO-0.1.7-checkout>` 只接受干净的官方 tag/commit，生成 `tests/fixtures/iupac/nispo-0.1.7-upstream.json`；
- `scripts/generate_nispo_rule_manifest.py <NISPO-0.1.7-checkout>` 冻结官方注册的 123 个 `RuleSpec` 规则族、优先级、gate 和 producer；`tests/fixtures/iupac/nispo-0.1.7-rule-manifest.json` 中仍为 `missing` 的规则族表示尚未等价移植，不能用局部用例通过替代；
- `scripts/generate_nispo_upstream_rule_attribution.py <NISPO-0.1.7-checkout>` 固定官方 1,296 例各自实际命中的 producer 规则族；`--fixture upstream` 按原规则族报告最大缺口，避免以样本类别代替上游行为归因；
- `scripts/generate_nispo_single_ring_carbonyl_corpus.py <NISPO-0.1.7-checkout>` 穷举 3–10 元碳环中带一个环外羰基、最多三个合法环内双键的 144 个非同构结构；`--fixture ring-carbonyl --require-full-coverage --require-exact-names` 验证单环羰基子域，并不代表整个 `single-ring-parent` 已完成；
- `scripts/generate_nispo_carbocycle_polyene_corpus.py <NISPO-0.1.7-checkout>` 穷举 3–12 元无取代碳环、2–5 个环内双键的 280 个价态合法非同构结构，包含累积双键和经规范化芳香化的十元环；`--fixture carbocycle-polyene --require-full-coverage --require-exact-names` 当前 280/280 原生命名、NISPO 原文一致且 OPSIN 回译等价。固定上游对 10 位环编号使用文本排序，因此 `1,10` 可能排在 `1,2` 前；这只证明这一子域，不代表取代、带电或立体碳环完成；
- `scripts/generate_nispo_substituted_carbocycle_polyene_corpus.py <NISPO-0.1.7-checkout>` 穷举 5–10 元非芳香碳环中 2–5 个合法环内双键和一个端点 C/F/Cl/O/N 取代基，并补充 5–7 元、2–3 双键的双端点取代组合；`--fixture substituted-carbocycle-polyene --require-full-coverage --require-exact-names` 当前 6,090/6,090 原生命名、NISPO 原文一致且 OPSIN 回译等价。该语料验证共享环编号与多重双键母体组装；芳香、带电、立体和复杂支链仍需单独完成；
- `scripts/generate_nispo_bicyclic_topology_corpus.py <NISPO-0.1.7-checkout>` 以三个内部不相交桥路径生成桥长 0–4 的 464 个非芳香双环结构，包含单个 N/O/S 骨架置换或单个环内双键；`scripts/generate_nispo_upstream_rule_attribution.py --input tests/fixtures/iupac/nispo-0.1.7-bicyclic-topologies.json --output tests/fixtures/iupac/nispo-0.1.7-bicyclic-topology-rule-attribution.json` 冻结每例实际 producer。`--fixture bicyclic-topology` 当前 460/464 原生命名、320 个名称与 NISPO 一致、460/460 OPSIN 回译等价；其中归因给 `kekulized-generic-polycyclic-parent` 的 123 例全部精确且等价，归因给 `generic-bicyclic-parent` 的 322 例中 318 例命名且等价、186 例文字一致。剩余 4 例桥双键位次安全拒绝，其他保留/部分氢化母体和文字排序仍未对齐；全覆盖及精确文字硬门禁继续失败；
- `scripts/generate_nispo_substituted_bicyclic_corpus.py <NISPO-0.1.7-checkout>` 以三条桥路径、单个 N/O/S 骨架置换或环内双键、单个末端 C/F/Cl/O/N 取代基生成 4,155 个非同构双环结构，并冻结实际 producer 归因。`--fixture substituted-bicyclic` 当前 4,025/4,155 原生命名，3,920 个名称与 NISPO 原文一致，全部 4,025 个成功名称 OPSIN 回译等价；其中 `kekulized-generic-polycyclic-parent` 归因样本 3,835/3,965 精确命名且等价。`--reference-roundtrip` 独立审计发现 135 个 NISPO 参考名称回译不等价：该 producer 的 130 个由原生逆向图校验明确拒绝，另 5 个 `fused-retained-parent` 样本采用回译等价的不同名称。其他 producer 的 190 个样本虽可由现有规则命名，名称文字尚未全部对齐。该语料的全覆盖和精确文字硬门禁仍必须失败；
- `scripts/generate_nispo_substituted_bicyclic_corpus.py <NISPO-0.1.7-checkout> --bridge-class unequal` 冻结不等长或零长度短桥、单个 N/O/S 骨架置换或环内双键、单个末端 C/F/Cl/O/N 取代基的 9,625 个非同构结构，并冻结实际 producer 归因；默认 `tied` 模式仍逐字复现前一批 4,155 例。`--fixture unequal-substituted-bicyclic` 当前 9,175/9,625 原生命名，9,010 个名称与 NISPO 原文一致，9,175/9,175 成功结果 OPSIN 回译等价，旧整图兜底为 0。独立参考回译发现 529 个 NISPO 原文不等价，其中 450 个原生安全拒绝，79 个原生改用化学等价的不同名称；`--require-reference-safe-coverage` 已作为独立回归门禁，确认其余 9,096 个参考可回译样本全部被原生命名。`generic-bicyclic-parent`、`functional-generic-bicyclic-parent`、`kekulized-generic-polycyclic-parent` 三个上游 producer 的 8,914 个安全可回译样本全部原文精确且等价；仍有保留/部分氢化母体文字差异，不能通过全覆盖与精确文字硬门禁；
- `scripts/generate_nispo_spiro_corpus.py <NISPO-0.1.7-checkout>` 枚举两个 3–7 元环共用一个螺原子的 7,225 个非同构结构，包含单个 N/O/S 骨架置换或环内双键，以及可选的单个末端 C/F/Cl/O/N 取代基；同一上游归因脚本冻结实际 producer。Apple 纯原生规则分解两个环的图路径、枚举编号并组装取代和 λ 位次；`--fixture spiro-topology --require-full-coverage --require-reference-safe-coverage` 当前 7,225/7,225 原生命名且全部 OPSIN 等价，其中 4,097 个与 NISPO 原文一致，`generic-spiro-parent` 归因的 5,504 例中 4,062 例文字一致。独立参考回译发现 `generated-partial-hydro-fused-parent` 的 110 个 NISPO 保留/部分氢化名称不等价；其余 7,115 例参考安全样本均被命名。候选排序及螺稠环保留母体仍缺，精确文字硬门禁继续失败；
- `scripts/generate_nispo_single_ring_heterocycle_corpus.py <NISPO-0.1.7-checkout>` 穷举 3–8 元、至多两个 O/N/S 杂原子与两个环内双键的 1,305 个非同构单环骨架；`--fixture ring-heterocycle` 当前有 1,303 个精确名称且 OPSIN 回译等价，两个参考名称本身回译不等价的芳香 N-H 四元环被安全拒绝，不能把 1,305 个仅文字一致冒充化学正确；
- `scripts/generate_nispo_single_ring_substituent_corpus.py <NISPO-0.1.7-checkout>` 枚举 3–8 元碳环、零或一个环内双键、一至两个端点 C/F/Cl/O/N 取代原子，以及单个 C2–C5 直链/支链烷基加可选第二端点取代基，共 5,314 个非同构结构；`--fixture ring-substituent --require-full-coverage --require-exact-names` 检查共享环编号、图结构外接前缀、母体组装和 OPSIN 回译，当前 5,314 个全部命名、名称文字一致且化学等价；这只是单环取代规则的已验证子域，不代表任意支链、杂环、立体化学已完成；
- `scripts/generate_nispo_substituted_monoheterocycle_corpus.py <NISPO-0.1.7-checkout>` 枚举 3–7 元饱和单 N/O/S 杂环与单个端点 C/F/Cl/Br/O/N 取代基，冻结 258 个非同构结构；`--fixture substituted-monoheterocycle --require-full-coverage --require-exact-names` 当前 258/258 原生命名、NISPO 原文一致且 OPSIN 回译等价。它只验证单杂原子、单端点取代域，不代表多杂原子、多取代、带电或立体环母体完成；
- `scripts/generate_nispo_disubstituted_monoheterocycle_corpus.py <NISPO-0.1.7-checkout>` 枚举 3–7 元饱和单 N/O/S 杂环的两个端点 C/F/Cl/Br 取代基，冻结 1,626 个非同构结构；`--fixture disubstituted-monoheterocycle --require-full-coverage --require-exact-names` 当前 1,626/1,626 原生命名、NISPO 原文一致且 OPSIN 回译等价。它验证同一环编号管线的重复前缀、混合前缀与 λ 位次；多杂原子、复杂支链和立体化学仍在范围外；
- `scripts/generate_nispo_iodine_ring_corpus.py <NISPO-0.1.7-checkout>` 按保留碘环规则的环组成、环内双键、碘氢状态与可选甲基取代系统枚举，冻结 270 个非同构结构。内部 Swift 规则对 270/270 可复现 NISPO 文字，但只有 46/270 经 OPSIN 回译与输入图等价，224 个参考名称存在结构歧义或回译冲突；产品路径目前只放行其中 4 个已验证的无取代饱和环，其余 266 个正式返回不支持。上游保留碘环的取代位次使用输入环顺序的首次碘原子起点，不进行最低位次重新定向；`--fixture iodine-ring --require-full-coverage --require-exact-names` 保持失败，不能以内部文字一致替代化学闭环；
- `scripts/generate_nispo_small_inorganic_corpus.py <NISPO-0.1.7-checkout>` 以图语法枚举硝酰卤化物、小元素氧化物、硫亚胺、λ-硫母体和单/双磺酰氮阴离子，冻结 160 个 NISPO 可命名结构；同一官方归因脚本生成 `nispo-0.1.7-small-inorganic-rule-attribution.json`，确认其中 101 个由小无机保留母体规则生成、58 个走 `acyclic-parent`、1 个走直接片段路径。`--fixture small-inorganic` 当前 160/160 命名且文字与 NISPO 一致，但仅 103/160 OPSIN 回译等价；57 个 NISPO 参考名称的 OPSIN 结果改变硫的显式氢或键态，硬门禁仍失败。需先定义参考冲突样本的化学正确性验收与产品呈现，不能以文字一致宣称完成；
- `scripts/generate_nispo_phosphite_ester_corpus.py <NISPO-0.1.7-checkout>` 用磷原子与三个氧配体的图语法组合开链单酯、二酯、三酯以及环状亚烷基、烷叉基和新戊二基亚磷酸酯，冻结 199 个非同构结构；`--fixture phosphite-ester --require-full-coverage --require-exact-names` 当前 199/199 原生命名、NISPO 原文一致且 OPSIN 回译等价。官方 35 个归因样本仅 12 个可用，混合 P-C/N/S/卤素、芳基复杂取代与不饱和配体仍缺，`phosphite-ester-parent` 保持 `partial`；
- `scripts/generate_nispo_phosphorus_acid_corpus.py <NISPO-0.1.7-checkout>` 将一个碳配体的开链 C1–C30、短支链、C3–C10 饱和环和苯基与磷中心的双羟基/双键 O 或 S 图语法组合，冻结 120 个非同构结构；`--fixture phosphorus-acid --require-full-coverage` 当前 120/120 原生命名且 OPSIN 回译等价，113/120 与 NISPO 原文一致。差异为环丙/环丁硫代酸及长链结构的 NISPO 候选排序，不应为追逐文字牺牲图正确性。官方归因样本 5/14 精确且等价；磷氧化物/硫化物、氨基配体、复杂递归碳配体仍缺，`phosphorus-acid-parent` 为 `partial`；
- `scripts/verify_native_iupac_differential.py --fixture upstream` 对每个原生成功结果执行 OPSIN 回译和规范分子图比较，并分别报告导入、命名、规则族、旧精确图兜底和等价数量；
- `scripts/generate_nispo_acyclic_hydrocarbon_corpus.py <NISPO-0.1.7-checkout>` 系统枚举最多 8 个碳的全部非同构碳树以及最多两个合法双/三键组合；`--fixture acyclic --require-full-coverage` 是 `acyclic-parent` 碳氢化合物子域的独立门禁，防止官方测试文字抽取遗漏基础结构空间；
- `scripts/generate_nispo_acyclic_alcohol_corpus.py <NISPO-0.1.7-checkout>` 在最多 8 碳的非同构饱和碳树上系统枚举一至两个羟基位置；`--fixture alcohol --require-full-coverage` 独立验证主官能团母链选择、编号和支链组合；
- `scripts/generate_nispo_acyclic_carbonyl_corpus.py`、`scripts/generate_nispo_acyclic_carboxylic_acid_corpus.py` 和 `scripts/generate_nispo_acyclic_primary_amine_corpus.py` 分别系统枚举单醛/单酮、单羧酸和一级胺；对应 `carbonyl`、`acid`、`amine` fixture 均纳入最终完成门禁；
- 最终门禁使用 `--require-full-coverage --require-exact-names`。未达到 1,296/1,296 可导入、命名、OPSIN 等价且名称文字与固定 NISPO 0.1.7 输出一致，或仍命中 `legacy-exact-graph-fallback`，均不得把 Step 3 标记为完成；所有新增系统语料也要通过相同门禁。只达到结构等价的子域须继续移植 NISPO 的母体取向、前缀顺序与官能团选名。

退出条件：固定 NISPO 0.1.7 的 123 个规则族全部完成原生移植，官方 1,296 例与全部系统冻结集均达到 100% 命名、NISPO 名称文字一致和 OPSIN 回译等价，且不命中精确图兜底。这里的“完整复现”仅指固定 NISPO 0.1.7 的行为，不延伸声称覆盖 NISPO 自身不支持的全部 IUPAC 有机、无机及聚合物命名。

### Step 4：Apple 原生名称→结构

工作：

1. 移植 OPSIN 的词法正规化、token 化、语法匹配、组装、价态校验和立体化学阶段；
2. 将 XML/规则资源转换为编译期 Swift 资源，不在运行时执行 Java 代码；
3. 解析结果直接生成 `ChemDocument`，再通过原生布局生成可编辑二维坐标；
4. 对多解、忽略的立体信息和不完整名称保留警告；
5. 与固定 OPSIN 版本逐条运行差分测试。

退出条件：支持范围内的名称与参考 OPSIN 结构等价；解析失败可定位到阶段；无崩溃、无网络和外部运行时依赖。

### Step 5：双端一致性与化学验收

工作：

1. Web 与 Apple 跑同一冻结语料并生成能力矩阵；
2. 对所有成功结果执行名称→结构→名称/结构等价闭环；
3. 分开统计解析正确率、命名覆盖率、成功结果精确率、失败类型和 P50/P95 延迟；
4. 人工复核具有多个合法名称、保留名、复杂环和立体化学的样例；
5. 对新发现失败先加入冻结回归集，再修规则。

最低发布门槛：

- 成功结果的结构往返精确率必须为 100%；
- 支持范围覆盖率单独报告，不得与精确率合并；
- Web 与 Apple 对共同支持集的结构结果完全等价；
- 常见小分子单次转换在目标设备上无可感知阻塞，较慢任务必须可取消；
- 任何未识别立体化学、电荷或同位素都使结果失败或带阻断性警告。

### Step 6：一次性接入产品界面

工作：

1. Web 与 Apple 同时增加“名称转结构”和“结构生成名称”入口；结构→名称从完整分子选区的右键/触摸长按菜单进入，不把整张画布隐式当作一个分子；
2. 名称→结构先显示候选预览、来源、警告和往返状态，用户确认后插入；
3. 结构→名称的完整面板显示名称类型、规则版本和复制操作；上下文菜单入口则直接生成同一种可编辑画布文本对象；
4. 结果与结构版本绑定，结构变化后显示过期并要求重新计算；
5. 补齐中英文界面文案和辅助功能，但生成的化学名称保持原文，不做机器翻译。

退出条件：Mac Catalyst、iPhone、iPad 与 Web 使用同一场景完成双向转换；插入、取消、撤销、保存和重新打开均通过；Apple 运行包中不存在 Python、JVM、WebView 或 IUPAC 网络调用。

### Step 7：打包、归因与发布验证

工作：

1. 把规则版本、第三方通知和源代码归因纳入 Web 镜像与 Apple 包；
2. 检查 Apple 包依赖、网络访问和运行进程，证明 IUPAC 转换为本机原生实现；
3. 按 WA Chem 发布规则构建所有发生代码变化的组件；
4. 在发布说明中列出支持范围、已知不支持结构和准确率口径。

退出条件：许可证、包内容、双端运行时、冻结报告和发布产物均有可复核证据；未达到门槛时保持功能关闭，不降级发布。

## 5. 进度记录规则

每完成一步，在本文件对应步骤下追加：

- 完成日期与提交；
- 实际修改的模块；
- 执行过的测试命令和结果文件；
- 覆盖率/正确率/性能数据；
- 新增的已知限制；
- 下一步唯一入口。

进度记录只写已验证事实。代码存在、按钮出现、单个示例成功或依赖安装完成都不能把某一步标记为完成。

### 2026-09-21 首轮实现与验证

- API 镜像在 `tc232`（x86_64）从同步后的本地源码构建成功；最终镜像 ID 为 `sha256:8ced9e786a5b0f5518dbb21847a128586ee80f860e4739f0ee7a176963d410d6`，并记录在构建机 `~/dev/build/wa-chem-iupac-phase9/api-image.id`；
- 镜像内 readiness：NISPO `0.1.7`、py2opsin `1.2.0`、OPSIN `2.9.0`、RDKit `2026.3.6`、Java 可用、离线 provider 为 `ready`；
- 镜像内结构→名称→结构：甲烷、乙醇、苯、乙酸结构均回译等价；其中乙酸得到的是 NISPO 的 round-trip-safe 名称 `1-hydroxy-1-oxo-ethane`，不能标为 PIN；
- 镜像内名称→结构：`methane`、`ethanol`、`benzene`、`ethanoic acid` 均得到预期规范 SMILES；
- 目标镜像测试发现并修复了 py2opsin 在 Linux 主动删除临时文件造成的重复清理错误；
- 当前证据只覆盖烟雾样例，不代表 Step 2 或 Phase 9 完成。下一入口是扩充共享冻结集并补齐跨端规范化校验和。

### 2026-09-22 首发切片与交互修正

- Web 已接入 NISPO/OPSIN 双向面板；Apple 已接入共享 SwiftUI 双向面板，名称→结构候选确认后通过一次 `pasteFragment` 提交写入画布；
- Apple 原生规则升级为 `organic-v3`/provider `0.3.0`，苯的名称→结构、芳香圆圈结构→名称和 Kekulé 结构→名称均纳入往返规则；
- 结构→名称不再读取整张画布。Web 右键菜单与 Apple 鼠标右键/触摸长按菜单都只在选中一个完整连通分子时启用“生成 IUPAC 名称”；部分选区、多分子选区或空选区不提交命名；
- 上下文菜单选择“生成 IUPAC 名称”后直接执行，不弹出额外窗口；成功名称会作为分子下方的独立可编辑画布文本写入；
- 画布“文本”工具已与原子标签拆分：在空白处输入任意文字不会再生成碳原子。自由文本和 IUPAC 名称使用同一文本对象，可选中、拖动、双击编辑、删除和撤销/重做；
- 同一分子通过原子 ID 集合锁定同一个 IUPAC 名称文本框：用户手动修改文字或拖动位置后，再次生成会在原文本框内覆盖名称并保留用户调整后的位置，不会叠加新文本框；
- 完整选中分子时，其绑定的 IUPAC 名称自动并入一个统一选择框；拖动或微调分子会同步移动名称。名称仍是独立可编辑画布对象，不进入分子图；单独选中文字时仍可独立移动和编辑；
- 文本随 `.wachem` 保存，但不进入原子/键连通图、价态、SMILES/MOL/SDF、再次命名或 WA-DD 化学结构写回；
- 结构命名优先级已调整：先扩大 Apple 原生结构→名称覆盖；`structure-v4` 首批新增 `2-methylpropane` 和 `N-hydroxy-2-phenyleth-1-en-1-amine` 对应结构族，后者已用固定 OPSIN 参考回译为等价分子图；
- 触摸编辑不依赖 Tab：双击名称后可用软键盘编辑，点画布空白、点其他工具、失焦或点软键盘“完成”均提交，只有显式取消/Esc 回退；
- 本地、OCR、文件导入和 WA-DD 载入的结构进入同一画布文档后，均使用相同的选中分子命名流程；
- 已增加自由文本的新建、任意文字输入、选中、编辑、拖动、删除和“化学导出不变”回归测试；完整回归和新鲜安装包验证仍是发版前门禁。

### 2026-09-22 Apple 原生 NISPO 规则管线扩展

- Apple Core 已纳入 NISPO 0.1.7 的可分发规则资源、BSD-3-Clause 许可证、第三方通知和 SHA-256 来源记录；运行时仍为 Swift + Apple 系统库，不包含 Python、RDKit、JVM、WebView 或网络回退；
- 新增纯 Swift 分子图层：稳定原子索引、元素/同位素/形式电荷、芳香性、Tarjan 桥边、环原子/环系、连通分量和简单路径；
- 新增规则层：直链与支链烃、单一不饱和键、醇/多元醇、卤素/氨基/氧代/杂原子置换、腈、羧酸/羧酸根、季铵离子、保留苯系和取代苯、单环杂环、桥环和螺环；
- 新增描述符层：同位素质量数、双键 E/Z 和四面体 R/S；绝对 R/S 写入共享 `ChemAtom.stereoDescriptor`，不依赖一次性的 SMILES 邻接顺序；
- 134,367 条生成及保留环模板被编译为 684 个随机读取分桶，产物 `generated_fused_templates.wacidx` 为 696,022 bytes；运行时按原子数、环数和元素组成只解压候选桶；
- 通用规则已继续覆盖线性烷基支链、多个双/三键、伯/仲/叔胺、多取代苯定位、环酮和环醇；打包规则库由最终原生模板层承接，不再出现“资源已打包但普通结构没有进入模板匹配”的断路；
- 模板匹配增加迭代邻域指纹、最少候选优先回溯和状态上限；保留模板名若已隐含立体构型，不再被通用 E/Z 后处理重复修饰；
- 分层冻结语料当前 93/93 返回名称；其中包含 61 条常见功能/立体分层样例，以及从完整模板记录按固定 SHA-256 排序抽出的 32 条复杂稠环、螺环和含杂原子骨架。`verify_native_iupac_differential.py` 已通过 OPSIN 2.9.0 回译和 RDKit 同分异构 SMILES比较确认 93/93 分子图等价，失败 0；
- 已验证 Web typecheck、207 项 Web 测试、18 项 Apple IUPAC 测试，以及 Apple 全量 XCTest（115 + 95）和 Swift Testing（20）全部通过；
- 完成度审计确认官方 NISPO 0.1.7 wheel 含 98,391 行（约 3.70MB）Python 规则逻辑和约 4.47MB 规则资源；当前 Swift 已接入全部已选可分发资源及主要图路由，但不能把资源打包或 93 条绿测等同于规则逻辑等价。下一唯一入口是按官方路由清单补齐缺失规则域并扩充分层覆盖报告；Step 3 仍未达到退出条件。经用户明确授权，0.1.76 已于 2026-09-22 完成统一冻结、TestFlight 分发并提交 iOS/iPadOS 与 macOS App Store 审核，但该发布不构成 NISPO 完成证据。

### 2026-09-22 官方语料纠偏与 `acyclic-parent` 起始移植

- 先前“93/93”只是项目自选冻结集的成功结果精确率，不能代表 NISPO 0.1.7 覆盖率；134,367 条模板也不能替代规则逻辑。首次以官方测试源码冻结的 1,296 个唯一结构重新审计时，为 1,296/1,296 可导入、24/1,296 返回名称、24/24 OPSIN 回译结构等价、1,272 个明确不支持，彼时真实命名覆盖率为 1.85%；最新数字见上方 Step 3 状态；
- 已禁止 `legacy-exact-graph-fallback` 作为命名成功路径。首轮安全收紧前的 98 个“成功”中仅 62 个能通过 OPSIN 等价；收紧后旧整图命中为 0，当前 24 个成功无回译失败；
- 新增真正基于分子图的 `acyclic-parent` 子集：最长碳链枚举、等长母体比较、最低位次编号、递归支链命名、重复前缀和字母序组合，不读取整分子模板；目前覆盖中性、无同位素/自由基/立体标记的无环碳氢骨架及其双/三键，官能团和杂原子母体仍未纳入，因此在 123 个官方规则族清单中仍标记为 `partial`，不能标记为已实现；
- `acyclic-parent` 碳氢化合物子域随后扩展到双键、三键、二烯、二炔和烯炔：母体候选先最大化所含多键数，再比较链长、最低多键位次、烯键优先位次和取代基位次。系统枚举得到 598 个最多 8 碳的非同构结构，Swift 为 598/598 命名，全部归属 `acyclic-parent`，598/598 经 OPSIN 回译与 RDKit 规范图比较等价，整图兜底为 0；
- 饱和醇子域已加入主官能团优先级：先最大化母链所含羟基数量，再比较最低羟基位次、链长和支链位次。系统枚举得到 711 个最多 8 碳的一元醇/二元醇，Swift 为 711/711 命名，全部归属 `acyclic-parent`，711/711 OPSIN 回译等价，整图兜底为 0；两层系统枚举共 1,309 个结构，但不能替代其余官能团、杂原子、环系、电荷、同位素和立体规则族；
- `acyclic-parent` 又加入单醛/单酮、单羧酸和中性一级/二级/三级胺的主官能团母链及编号规则；系统枚举分别为 132/132、73/73、161/161、38/38 OPSIN 等价。羧酸规则保留额外羟基为 `hydroxy` 前缀，乳酸恢复为羧酸母体并保留 R/S 描述符；随后加入无环饱和单腈/二腈的 `cyano` 前缀、母链编号和递归支链规则，覆盖氢氰酸以及腈基位于支链的情况，712/712 OPSIN 回译等价；无环饱和醚/硫醚按 `oxa`/`thia` 置换规则实现最长母链、最低位次、混合杂原子和递归碳支链，系统生成 843 个结构并达到 843/843 OPSIN 回译等价；无环饱和卤代烷实现 F/Cl/Br/I 的母链与递归支链前缀，系统生成 8,220 个一卤/二卤结构并达到 8,220/8,220 OPSIN 回译等价。基础无环九层系统冻结集累计 11,488 个结构，全部命名且 OPSIN 等价，整图兜底为 0。该数字仍只代表已明确限定的无环子域；
- 2026-09-23：沿同一母链候选管线加入无环 O/S/N 置换骨架与一个羰基的组合，覆盖酯、硫代酯及部分酰胺的通用图结构。系统枚举最多 8 碳的 2,028 个结构，原生 2,028/2,028 命名并经 OPSIN 回译等价；其中 602 个名称文字与 NISPO 0.1.7 完全一致。其余名称的结构虽等价，但 NISPO 的 `formyl`、酰胺后缀与母体选择尚未复现；这仍是 `acyclic-parent` 的未完成项。十层无环冻结集累计 13,516 个结构，不能用此数字代替 123 规则族或官方 1,296 条的完成率；
- 2026-09-23：为官方 1,296 例冻结实际命中的 NISPO producer 归因，按规则族而非截图结构追踪缺口。新增 3–10 元单环羰基及至多三个环内双键的通用命名和 144 个非同构冻结结构，144/144 原生命名、名称文字与 NISPO 完全一致且 OPSIN 回译等价；官方基线相应为 25/1,296 原生命名、17 个精确名称。`single-ring-parent` 只标为 `partial`，剩余多取代、杂环、电荷和立体规则并未完成；
- 2026-09-23：按上游环母体候选、骨架杂原子置换、保留环名、部分氢化母体与 lambda 价态逻辑补全单环无取代骨架通用路径；1,305 个系统生成杂环中 1,303 个名称与 NISPO 完全一致且 OPSIN 回译等价，其余两个 4 元芳香 N-H 环的 NISPO 原文无法通过 OPSIN 等价（其中一个连分子式不同），原生安全拒绝。官方基线更新为 32/1,296 原生命名、24 个精确名称，32/32 回译等价；`single-ring-parent` 仍为 `partial`，母体外部取代、带电及立体化学尚缺。最终门禁尚未因参考冲突而降低，必须先解决这两个参考不一致样本的产品与验收语义；
- 2026-09-23：单环母体外接取代基按图枚举双向环编号、比较取代位次、分组前缀并组装名称，不按分子 SMILES 特判；已从端点原子扩展到直链烷基与 isopropyl、t-butyl、isobutyl、neopentyl 支链的图结构识别。3–8 元碳环、零或一个环内双键的 5,314 个系统结构全部与 NISPO 名称文字一致且 OPSIN 回译等价；官方基线为 34/1,296 原生命名、26 个精确名称，34/34 回译等价。更复杂支链、杂环取代、官能团后缀、电荷及立体取向仍未完成；
- 2026-09-23：按 NISPO 的 `small-inorganic-retained-parent` 图条件移植硝酰卤化物、小元素氧化物、磺酰胺/氮阴离子、硫亚胺和 λ-硫母体。官方归因的 31 例中 28 例精确命名且 OPSIN 等价，剩余 3 例均需带电芳香 N-羰基取代基的递归组装；新增 160 例系统图语法冻结集目前 102 个精确命名且等价，58 个无环硫置换命名尚缺。官方基线更新为 62/1,296 原生命名、54 个精确名称，62/62 回译等价；该规则族仍标为 `partial`；
- 2026-09-23：以硫原子和碳骨架的图路径规则补上末端 sulfanyl/iminosulfanyl、链内 oxo/imino-thia、N=S aza-thia 骨架与卤素前缀；不是单个 SMILES 的查表分支。小无机语料达到 160/160 可命名且 NISPO 文字一致，但只有 103/160 经 OPSIN 回译与输入图等价；例如 `C[S]=O` 的 NISPO 名称 `1-sulfanyl-methane` 经 OPSIN 返回 `CS`，原有 S=O 键不复存在。57 例参考冲突保持为失败，不调整差分门禁来掩盖。官方 1,296 例仍为 62 个原生命名、54 个精确名称、62/62 OPSIN 等价，整图兜底 0；Swift 全量测试通过。下一步除了继续移植未完成规则族，还须明确参考文本与化学图冲突的处理原则，否则“100% 原文且 100% 回译”等双条件对这些样本不可同时达成；
- 2026-09-23：沿 `single-ring-parent` 的保留杂环母体与环编号管线，新增饱和单 N/O/S 杂环的端点取代命名：以杂原子为 1 位、双向比较最低取代位次、组合 λ 位次及 NISPO 的 homopiperidin 保留母体。图枚举冻结的 258 个结构全部名称文字与 NISPO 一致且 OPSIN 回译等价；不按单个结构查表。该规则族仍为 `partial`，多杂原子、复杂多取代、复杂支链与立体取向仍缺；
- 2026-09-23：把相同的饱和单杂环命名管线扩展到两个端点 C/F/Cl/Br：按图分组同类前缀、比较双向最低位次，并在只有一个 N—非碳取代时才选用 NISPO 的 homopiperidin 保留母体。新增 1,626 个系统冻结结构全部与 NISPO 名称和 OPSIN 图等价；仍未覆盖多杂原子、非端点复杂取代和立体化学，`single-ring-parent` 保持 `partial`；
- 2026-09-23：内部移植 NISPO 0.1.7 的保留碘环通用图条件（环组成、碘原子邻接、氢与不饱和度），系统冻结 270 个非同构碘环，内部规则 270/270 与 NISPO 文字完全一致；但仅 46/270 OPSIN 回译图等价，224 个参考冲突仍作为发布阻断。产品路径只放行 4 个无取代饱和环，4/4 文字一致且回译等价；其余 266 个仍不支持，防止错误名称成为用户可见成功。官方基线提高至 63/1,296 原生命名、55 个精确名称、63/63 回译等价；`single-ring-parent` 仍为 `partial`。上游取代位次取决于输入原子顺序，这与此前“不饱和位优先”的判断不同；下一步须建立原生逆向图检查并区分可用结构安全名称与参考文本歧义，再继续实现单环多取代、带电等尚缺的通用规则；
- 2026-09-23：补齐无取代碳环多烯的通用环编号：遍历所有起点和两个方向，按固定 NISPO 0.1.7 的候选文本排序处理跨 10 位编号，兼容累积双键和十元芳香环。3–12 元环、2–5 个双键的 280 个系统冻结结构均与 NISPO 名称文字一致，且 280/280 OPSIN 回译图等价；不是单分子查表。官方 1,296 例无此新子域样本，仍为 63 个原生命名、55 个精确名称、63/63 回译等价；`single-ring-parent` 仍为 `partial`；
- 2026-09-23：将 `phosphite-ester-parent` 中磷-氧配体命名从固定结构查表改为共享图解析与前缀组合，覆盖开链单/二/三酯和环状亚烷基、烷叉基、新戊二基亚磷酸酯。199 个系统冻结结构全部与 NISPO 文字一致且 OPSIN 图等价，官方基线由 63 增至 75/1,296 原生命名、67 个精确名称、75/75 图等价；该规则族仅 12/35 官方样本可用，仍标 `partial`，且 Step 3 仍未达退出条件；
- 2026-09-23：复用单环取代候选的图编号与前缀组合，解除“最多两个环内双键”的限制，并按 NISPO 固定版本区分单烯与多烯时 1 位取代前缀的呈现。6,090 个非芳香多烯取代环系统样本全部与 NISPO 名称逐字一致，且 OPSIN 回译等价；原有 5,314 个单环取代样本复测保持全通过。`single-ring-parent` 仍为 `partial`，不能把这些系统子域外推为全部单环命名完成；
- 2026-09-23：新增双环 von Baeyer 图分解：识别两个桥头和三条内部不相交桥路径，枚举等长桥顺序与两个编号方向，按桥拓扑、杂原子位次和双键位次比较候选，不按完整分子查表。固定上游 producer 归因后，只让对称非零短桥走 `kekulized-generic-polycyclic-parent`；该 producer 的系统样本 123/123 文字一致且 OPSIN 等价，全 464 例当前仍有 310 例不支持。官方 1,296 例仍为 75 个可命名，该规则族 137 个官方样本仍无原生命名；下一步必须把外部取代、稠合芳香和更高环秩纳入共享拓扑与取代基组合，不能用这 123 例宣称完整；
- 2026-09-23：将双环分解扩展到末端取代基，并对候选名称反建桥环图后执行原生图同构验证，避免 NISPO 文本相同却指向错误结构。新增 4,155 个系统非同构结构：4,025 个原生命名且全部 OPSIN 图等价，3,920 个与 NISPO 原文一致；其中目标 producer 的 3,835/3,965 例精确且等价，130 例参考桥编号冲突被安全拒绝。独立参考回译另揭示 5 个 `fused-retained-parent` 名称冲突，原生给出化学等价的不同名称。继续推进稠合、复杂取代及更高环秩；参考冲突的验收语义仍待解决，不能以本子域覆盖宣称 NISPO 全量完成或触发发版；
- 2026-09-23：让同一双环桥路径、编号、取代前缀和逆向图校验管线覆盖不等长或零长度短桥，并在规则执行器中单独归属 `generic-bicyclic-parent`，不再只处理对称非零短桥。原 464 例双环冻结集由 154 增至 460 例可命名，成功结果 460/460 OPSIN 等价，NISPO 原文精确从 151 增至 320；目标 generic producer 为 318/322 可命名且等价、186/322 文字一致。官方 1,296 例仍为 75 例可命名，说明新增子域不能替代大规模稠环、复杂官能团和立体化学移植；
- 2026-09-23：为不等长桥、单末端取代建立 9,625 例系统冻结集和 6 个实际上游 producer 的归因。Apple 原生 9,175 例安全命名且全部 OPSIN 等价；独立验证 NISPO 原文的 529 个回译冲突后，可确认其余 9,096 个参考安全样本均已命名。三类通用双环 producer 的安全样本 8,914 例全部精确对齐；`functional-generic-bicyclic-parent` 由 `missing` 改为有证据的 `partial`，但复杂官能团、稠环和立体化学没有因此完成；
- 2026-09-23：新增共享原生双环螺原子图分解、两环编号、N/O/S 骨架置换、单双键和简单外接前缀，不按单个分子查表。系统冻结 7,225 例均可命名且全部 OPSIN 回译等价；4,097 例与 NISPO 原文一致，差异主要集中于上游螺稠环/部分氢化保留母体以及候选排序。参考原文有 110 例回译不等价，不能为了逐字匹配牺牲化学图正确性。官方 1,296 例仍为 75 例可命名，`generic-spiro-parent` 只升为 `partial`；
- 2026-09-23：新增 `phosphorus-acid-parent` 的共享 Swift 图规则，从一个完整碳配体和磷中心 OH/O/S 配位生成名称，不按单分子查表。系统 120/120 可命名且回译图等价、113/120 原文一致；官方基线升至 80/1,296 可命名、72 个精确名称、80/80 OPSIN 等价。该族仅 5/14 官方归因样本可用，仍为 `partial`；
- `scripts/verify_nispo_native_completion.py` 是统一硬门禁：123 个规则族必须全部为 `implemented` 后才会执行官方及各系统语料的全量命名、精确名称与 OPSIN 等价差分。当前 114 个 `missing`、9 个 `partial`，门禁预期失败并阻止发版；
- 下一入口按上游 producer 缺口推进 `single-ring-parent` 的多取代、杂环和电荷规则，同时继续 `acyclic-parent` 的官能团优先级与递归取代基；随后处理稠环等高缺口族。每一类须按规则和系统语料完成，不能逐个截图分子增加分支。

## 6. 上游与标准参考

- NISPO：https://github.com/oxpig/nispo
- OPSIN：https://github.com/dan2097/opsin
- IUPAC InChI：https://github.com/IUPAC-InChI/InChI
- NISPO 论文：https://arxiv.org/abs/2607.26113
