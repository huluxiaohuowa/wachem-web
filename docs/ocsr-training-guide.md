# OCSR 混合数据训练指南（MolParser-Mobile 兼容线）

本文档说明如何使用当前已准备的商业可用数据（约 790 万样本）训练
WA Chem Apple OCSR 模型（MolParser-Mobile 兼容架构），以及训练前后的
全部门槛操作。所有路径以 server6 宿主机为准。

## 1. 数据概览

训练清单（manifest）由 `prepare_mixed_manifest.py` 从以下商业可用来源构建：

| 来源 | 样本数 | 许可 | 说明 |
|---|---|---|---|
| styled synthetic（pubchem-rdkit-styled） | 6,867,611 | 公有领域（PubChem CID-SMILES）+ WA Chem 渲染/增强 | 六种渲染风格：clean / printed_variation / screenshot / mobile_photo / scan_noise / pencil_sketch；覆盖 PubChem 全 CID 区间（40 个 chunk 分块） |
| PubChem 干净渲染（pubchem-rdkit） | 1,000,000 | 公有领域 | baseline 数据 |
| DECIMER 真实手绘（decimer-handdrawn） | 5,086 | CC-BY-4.0（Zenodo 7617107，需署名） | 原件扫描 |
| Markush/E-SMILES 模板（markush-esmiles） | 3,052 | WA Chem 自生成 | 含空格的 2 个模板标签已被过滤（official tokenizer round-trip 失败） |
| **合计** | **7,875,749** | | |

**排除项**：`eval/valid`、`eval/frozen-simple`、`eval/frozen-markush`
（512 / 4,096 / 398）三组冻结评测切片**绝不进入训练清单**，只用于评估。

### 数据门槛（构建时自动执行，任一失败即中止）

1. 图片存在性抽样（50,000 条，允许缺失 0）；
2. official `UniParser/MolParser-Mobile` tokenizer round-trip 抽样
   （50,000 条，含 `<unk>` 检查，允许失败 0.1%）；
3. 每来源 license 白名单（未知 license 的来源不能进入清单）。

## 2. 环境准备（server6 宿主机）

```bash
# 固定环境（wrapper 自动设置 LD_LIBRARY_PATH 与 PYTHONPATH）
ENV=/home/jhu/dev/envs/wa-chem-ocsr-mobile
PY=$ENV/bin/python
WRAPPER=$ENV/bin/wa-chem-ocsr-env
cd /home/jhu/dev/repos/wa-chem
$WRAPPER $PY -m wa_chem_ocsr_mobile_train.train_molparser_mobile --help
```

关键环境事实：

- 宿主机访问不了 huggingface.co。训练/评估必须用本地 ModelScope 缓存里的
  完整 processor：`/home/jhu/.cache/modelscope/models/UniParser--MolParser-Mobile/snapshots/master`
  （含 `MolParserImageProcessor` + `MolParserTokenizer`，vocab 385），
  并设置 `HF_HUB_OFFLINE=1`、`TRANSFORMERS_OFFLINE=1`；
- `hf-last/` 目录的 `AutoProcessor` 会退化成裸 tokenizer（缺 image_processor），
  不能作为训练的 reference-model。

## 3. 数据迁移到 NVMe（强烈建议，10-50 倍提速）

790 万张图片（约 66G）放在机械盘上随机读时吞吐只有 ~145 样本/秒
（GPU 大量空转）；拷到 NVMe 后恢复正常。用 inode 排序拷贝
（inode 顺序 ≈ 磁盘物理顺序，随机读变顺序读）：

```bash
# 核心 trick：按 inode 排序后 tar 流水线（58G 约 12 分钟，对比 rsync 小文件模式 >5 小时）
copy_tree() {
  local src="$1" dst="$2"
  mkdir -p "$dst"
  (cd "$src" && find . -type d) | (cd "$dst" && xargs mkdir -p)
  (cd "$src" && find . -type f -printf "%i %p\n" | sort -n | cut -d" " -f2-) > list.txt
  tar -C "$src" -T list.txt --no-recursion -cf - | (cd "$dst" && tar -xf -)
}
```

当前已拷贝位置：`/data01/jhu/dev/build/wa-chem-ocsr-mobile/`
（upload 7,016,110 + pubchem 1,000,002 + decimer 5,088 个文件，计数校验全对）。

## 4. 构建混合训练清单

```bash
cd /home/jhu/dev/repos/wa-chem
$WRAPPER $PY -m wa_chem_ocsr_mobile_train.prepare_mixed_manifest \
  --build-root /home/jhu/dev/build/wa-chem-ocsr-mobile \
  --scaleup-root /home/jhu/dev/build/wa-chem-ocsr-mobile/scaleup-20260911 \
  --out-dir /data01/jhu/dev/build/wa-chem-ocsr-mobile/mixed-20260911 \
  --num-workers 16
```

产物：`manifest.jsonl`（7,875,749 行，图片绝对路径指向 NVMe 副本）+
`mixed_report.json`（门槛结果与分来源计数）。注意 `--tokenizer-dir`
默认指向 `/home/jhu/.cache/modelscope/...`（宿主机路径）。

## 5. 启动训练

```bash
run="molparser-mobile-official-arch-mixed-<时间戳>"
out="/home/jhu/dev/build/wa-chem-ocsr-mobile/$run/checkpoints"
resume="/home/jhu/dev/build/wa-chem-ocsr-mobile/molparser-mobile-official-arch-fp32params-20260911-0908/checkpoints/checkpoint-last.pt"
mkdir -p "$out"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
$WRAPPER $PY -m wa_chem_ocsr_mobile_train.train_molparser_mobile \
  --data /data01/jhu/dev/build/wa-chem-ocsr-mobile/mixed-20260911/manifest_nvme.jsonl \
  --out "$out" \
  --resume "$resume" \
  --reference-model /home/jhu/.cache/modelscope/models/UniParser--MolParser-Mobile/snapshots/master \
  --epochs 24 \
  --batch-size 512 \
  --num-workers 16 \
  --max-length 256 > "/home/jhu/dev/build/wa-chem-ocsr-mobile/$run/train_nvme.log" 2>&1
```

要点：

- `--epochs` 是**新增轮数**：resume 自 baseline（累计 epoch 20）时，
  `--epochs 24` 表示再训 24 轮，日志累计显示为 `/44`；
- `--reference-model` 必须指向本地快照目录（含完整 processor）。直接用
  `UniParser/MolParser-Mobile` 会在宿主机卡死重试（huggingface.co 不通）；
- 每个 epoch 结束落盘 `checkpoint-last.pt`，可随时 kill/断点续训；
- 监控：

```bash
tail -c 4000 <train.log> | tr "\r" "\n" | grep -E "epoch|loss" | tail -4
```

### 训练策略

- **评估驱动，不盲跑**：每 4 个 epoch（约 4-12 小时，取决于 GPU 是否被
  共享）用 `evaluate_molparser_mobile` 跑一次冻结切片评估；
  valid SMILES / canonical exact 达标即可停；不达标且 loss 仍在降则
  再 resume 续训同样新增轮数；
- 与其他任务共享 GPU 时吞吐约 250 样本/秒，独占约 2000+；
- 已知坑：resume 后日志轮数是累计口径（如 `epoch 21/44`）；
  chunk_11 有 RDKit 断言崩溃毒分子（弃用该 chunk）；pkill 训练进程时
  模式写 `train_molparser_mobil[e]` 防止自杀。

## 6. 训练后评估（达标门槛）

```bash
$WRAPPER $PY -m wa_chem_ocsr_mobile_train.evaluate_molparser_mobile \
  --checkpoint-dir <run>/checkpoints \
  --manifest /home/jhu/dev/build/wa-chem-ocsr-mobile/first-candidate-20260910-184056/pubchem/manifest.jsonl:2000 \
  --manifest /home/jhu/dev/build/wa-chem-ocsr-mobile/scaleup-20260911/eval/valid/manifest.jsonl \
  --manifest /home/jhu/dev/build/wa-chem-ocsr-mobile/scaleup-20260911/eval/frozen-simple/manifest.jsonl \
  --manifest /home/jhu/dev/build/wa-chem-ocsr-mobile/scaleup-20260911/eval/frozen-markush/manifest.jsonl \
  --batch 64 --out eval-official-mixed.json
```

历史基线（baseline checkpoint，必须被显著超越）：
valid SMILES 0.163 / token exact 0.000 / canonical exact 0.000 /
styled 切片 eval loss 8.0。

达标后再进入 Core ML 导出（见 `docs/ocsr-coreml-conversion.md`）与
Apple app 验证。
