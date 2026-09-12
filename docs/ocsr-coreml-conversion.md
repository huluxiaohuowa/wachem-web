# OCSR 模型 Core ML 转换指南（静态滑窗 decoder，route B）

本文档说明如何把 WA Chem MolParser-Mobile 兼容 checkpoint（`hf-last/`）
转换为可被 Apple app 多步自回归循环使用的 Core ML 包，以及每一步的
验收标准。全程在本机 macOS 执行（Core ML 运行时验证只能 macOS）。

## 1. 转换环境（专用 conda env）

```text
/Users/hulu/dev/envs/wa-chem-ocsr        # 与旧 bundle metadata 同版本，已验证可产出可运行 bundle
  coremltools==8.3.0  torch==2.7.1  transformers==4.51.3
  timm==1.0.29  opencv-python-headless  safetensors  tokenizers==0.21.4
```

版本是硬约束（都是踩坑后钉死的）：

- ct9.0 + RangeDim 动态输入：加载即报 "Data-dependent shapes were disabled"；
- ct9.0 / ct8.3 + 固定形状：运行时严格校验形状，多步循环第 2 步被拒；
- transformers 4.57：旧 wrapper 的 legacy cache 元组（cross 槽位 None）在
  `EncoderDecoderCache.from_legacy_cache` 直接崩；
- fp16 compute：-60000 掩码与因果掩码相加溢出 → logits 非有限；
- remote code 需要 cv2 与 timm，缺一会 ImportError。

## 2. 模型契约（静态滑窗，route B）

```
encoder:  pixel_values (1,3,224,224)  →  enc_hidden (1,49,192)
decoder-step 输入:
  input_ids (1,1) int32           当前 token（首步为 BOS=0）
  pos_id (1) int32                当前步位置
  attention_mask (1,1,1,257) f32  覆盖 256 窗口槽 + 当前 1 位；未填充前缀槽置 -60000
  enc_hidden (1,49,192) f32
  kvK0..5 / kvV0..5 (1,4,256,48) f32   self-attention 滑窗缓存
decoder-step 输出:
  logits (1,1,385)                词表 385
  kvK0..5_new / kvV0..5_new (1,4,256,48)  更新后的滑窗（cat 后取末 256）
特殊 token: BOS=0 / PAD=1 / EOS=2
```

语义：每步把窗口内 256 个缓存槽 + 当前 token 一起做 self-attention；
cross-attention 的 K/V 只依赖 `enc_hidden`，在 step 内预填
（k_proj/v_proj 投影），数学上与逐步重算等价。生成超过 256 token 时
窗口丢弃最老的槽（sliding window）。

## 3. 转换步骤

```bash
# 1) 从 server6 拉取 hf-last（权重经过本机的唯一例外场景，转完可清理）
remote_hf="/home/jhu/dev/build/wa-chem-ocsr-mobile/<run>/checkpoints/hf-last"
local_hf="/Users/hulu/dev/build/wa-chem-ocsr-mobile/<run>/hf-last"
rsync -avz --delete "server6:$remote_hf/" "$local_hf/"

# 2) 转换（coreml_export_compat 内部 monkey-patch 原导出模块：
#    - load_model 走 AutoConfig/from_config + safetensors 已验证加载路径
#    - DecoderStepForward 用静态滑窗 legacy 4 元组 (self_k, self_v, cross_k, cross_v)）
cd /Users/hulu/dev/repos/wa-chem
PYTHONPATH=tools/ocsr_mobile_train \
  /Users/hulu/dev/envs/wa-chem-ocsr/bin/python -m wa_chem_ocsr_mobile_train.coreml_export_compat \
  --model "$local_hf" \
  --out /Users/hulu/dev/build/wa-chem-ocsr-mobile/<run>/coreml

# 3) 验收（契约 + manifest 哈希 + 300 步静态滑窗循环，跨 256 边界）
/Users/hulu/dev/envs/wa-chem-ocsr/bin/python \
  /Users/hulu/dev/build/wa-chem-ocsr-mobile/verify_coreml_smoke.py \
  /Users/hulu/dev/build/wa-chem-ocsr-mobile/<run>/coreml
```

验收标准（verify 脚本全部断言）：

- 契约按第 2 节逐项匹配（logits 词表 385）；
- `manifest.json` 记录的 sha256 与文件逐一相符；
- 300 步滑窗循环跨越 256 边界后形状不变、logits 全有限。

## 4. 语义等价验证（强烈建议）

`verify_generation_equivalence.py` / `verify_logit_parity.py`：同一张图，
HF transformers greedy 生成 vs CoreML encoder+decoder 循环，逐 token 对比
或逐步对比 logits 的 max-abs-diff。

- 在随机噪声图上 fp16/fp32 的微小数值差会被欠训练模型的近平局 argmax
  放大成 token 分叉——这是混沌放大，不是导出错误；
- 判定基准是与 **app 里已验证的旧 bundle** 比：旧 bundle 同测试的
  logit 差异为 13.9~18.9，新导出若 ≤ 旧 bundle 即等价（当前实测
  新 bundle 1.9~7.9，优于旧 bundle）。

## 5. Swift 端成对适配（必须与 bundle 同步发布）

`apps/apple-core/Sources/WAChemAppleCanvas/AppleOCSRIntegration.swift`
的 decoder 循环已改为静态滑窗契约：

- KV 初始化 `(1,4,256,48)` 零填充（不再从 1 槽开始增长）；
- mask 固定 `(1,1,1,257)`，未填充前缀槽（`0..<(256-filled)`）置 -60000；
- 去掉动态 `cacheLength` 读取。

旧 Swift + 新 bundle 会因形状不匹配失败；**bundle 与 Swift 必须成对提交**。

## 6. 已排除的路线（勿重走）

| 路线 | 结果 |
|---|---|
| ct9.0 + 固定形状 | 运行时严格形状校验，多步第 2 步被拒 |
| ct9.0 + RangeDim | 加载失败（"Data-dependent shapes were disabled"） |
| ct8.3 + RangeDim | predict 段错误（CPU_ONLY 同样） |
| ct8.3 + 固定形状 + 清空 description shape | validator 拒绝（"missing shape constraints"） |
| ct8.3 + RangeDim + 函数级 unknown 维度 | predict 段错误 |
| fp16 compute | 掩码相加溢出，logits 非有限 |
| 复现旧 bundle 的动态形状原始脚本 | 原始脚本已失传（全面查证过），不可行 |

其他工具链事实：transformers 4.57 下 `AutoProcessor.from_pretrained(hf-last)`
退化为裸 tokenizer（评估/转换需显式 `AutoImageProcessor` + `AutoTokenizer`）；
`AutoModelForImageTextToText.from_pretrained(hf-last)` 触发 `get_init_context`
不兼容，用 `AutoConfig + from_config + load_state_dict`；
4.51 的 `DynamicCache.update` 走 `cache_kwargs={"layer_idx": i}`、
4.56+ 走 positional `layer_idx`（`_cache_update` 已适配）；
forward 内禁止 `tensor.size()` 解包（产生 ct 无法折叠的 aten::Int）；
decoder wrapper 必须 `return_dict=False`（dataclass 返回值 tracer 无法推断）；
`BartForCausalLM` 需解包 `.model.decoder.layers`。

## 7. 发布边界

- 评估达标（frozen slices 无回归）之前，不得把任何 bundle 发布为
  ModelScope `current/`、替换 Apple app 资源或对外宣称 production；
- Apple 侧仍需：fresh build → runtime load → iPhone/iPad/Mac 识别插入验证。
