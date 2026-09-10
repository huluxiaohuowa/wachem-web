# OCSR 模型包合同

WA Chem 的服务器端结构识别由独立 `wa-chem-ocsr` worker 执行。API 只负责认证、请求校验和代理；模型权重与推理脚本由 ModelScope 模型包提供，或在构建 worker 镜像时打入镜像。

## 模型位置

默认模型 ID：

```text
ms://huluxiaohuowa/wa-chem-ocsr-molparser-mobile
```

默认模型路径：

```text
/modelhub/export/ms/huluxiaohuowa/wa-chem-ocsr-molparser-mobile/current
```

独立部署和 VOS 部署都把 `MODEL_HUB_SHARED_MODELS_PATH` 挂载到容器内 `/modelhub`。构建 worker 镜像时设置 `WA_CHEM_OCSR_BUNDLE_MODEL=true` 会在构建期下载并校验模型包。

Apple app 使用同版本 Core ML 产物：

```text
ms://huluxiaohuowa/wa-chem-ocsr-molparser-mobile-coreml
```

发布 Apple app 前运行：

```bash
PYTHON=/Users/hulu/dev/envs/conda/bin/python scripts/sync_apple_ocsr_model.sh
```

脚本会下载并校验 ModelScope 包，然后同步到 `apps/apple/WAChemAppleApp/Resources/wa-chem-ocsr-molparser-mobile-coreml`。Xcode 把该目录作为 app resource 打包；大模型文件不进入普通 git diff，发布构建必须在打包前执行同步。

Apple app 是一套 App Store 产品体验，不拆 macOS/iPadOS 两套识别逻辑。图片选择、剪贴板、Pencil 草图、裁剪和开始识别只是系统输入适配；模型包校验、detector、decoder、结果协议和回填都在 shared Apple core/App shell 的同一条链路上完成。

## 替换模型兼容性

新训练或微调的 OCSR 模型可以替换 `MolParser-Mobile` 的权重，但不得替换调用方看到的输入输出边界。训练、导出和发布时必须保持以下兼容性：

- recognition encoder 输入名、shape 和预处理与 `MolParser-Mobile` 相同：`pixel_values`，224×224，INTER_LINEAR 缩放，/255，ImageNet mean/std；
- decoder step 输入输出与 `MolParser-Mobile` 相同：`input_ids`、`pos_id`、`attention_mask`、`enc_hidden`、每层 KV cache 输入和 `_new` 输出，`decoder_start_token_id=0`、`eos=2`、`max_length=256`；
- tokenizer 使用同一套 E-SMILES 词表和特殊 token 约定，新增 token 只能通过显式版本化兼容评估进入，不能让旧 Apple/Core ML runtime 或服务器 runner 静默解码错误；
- detector 输出保持 `[1,5,N] = cx, cy, w, h, score`，NMS 和无检出时整图回退仍由宿主侧完成；
- runner 的 WA Chem JSON 输出保持本文档的请求/输出协议，至少返回可回填的 `molblock` 或 `canonical_smiles`，并保留 `model_id`、`model_version`、`runtime`、`confidence` 和 `molecules` 语义。

因此，模型迭代的目标是“同接口更好权重”，不是新增一套 WA Chem 客户端协议。若候选架构无法导出为上述 PyTorch/ONNX/Core ML 边界，必须先写薄适配层证明 Web、API、Apple shared core 均无需业务改造，才能进入替换评测。

## 训练数据集路线

WA Chem 可以构建一个对标 `MolParser-7M` 的 OCSR 数据集，并独立发布到 ModelScope，作为后续 `MolParser-Mobile` 兼容模型的训练来源。数据集不是运行时模型包，必须与模型产物分开命名、分开版本、分开许可证记录。

建议数据集 ID：

```text
ms://huluxiaohuowa/wa-chem-ocsr-molparser-compatible-7m
```

数据集样本必须围绕同一替换接口组织：

- 每条样本包含原始或渲染图片、E-SMILES/SMILES 标签、可选 molblock、图片尺寸、来源类型、渲染参数、清洗状态和许可证来源；
- 数据划分至少包含 synthetic、patent/literature crop、web screenshot、mobile photo、hand-drawn/sketch 五类，并固定 train/validation/test split；
- synthetic 样本用于规模，真实论文/专利/网页/手机照片样本用于域适配和主动学习闭环；
- 手绘/Pencil 草图样本必须单独标注来源，不得混入印刷图指标冒充提升；
- 发布 manifest 记录数据生成脚本版本、源数据白名单、去重策略、拆分哈希、标签格式版本和下游兼容的 `MolParser-Mobile` I/O 版本。

验收时不以“数据集已上传”为完成标准。必须能从该 ModelScope 数据集复现实验划分，训练出保持 `MolParser-Mobile` I/O 兼容的候选权重，并用冻结集证明至少不回退当前模型在印刷图、截图、照片和手绘四类样本上的可回填率。

## manifest.json

模型包根目录必须包含 `manifest.json`。下载脚本会校验 `files` 中列出的文件和 sha256；worker 优先读取 `runner` 字段决定如何调用模型。当前默认模型包使用 `"runtime": "pytorch"`，worker 会自动使用内置 MolParser-Mobile runner。

示例：

```json
{
  "name": "MolParser-Mobile",
  "version": "0.1.0",
  "files": [
    {
      "path": "model.pt",
      "sha256": "..."
    },
    {
      "path": "runner.py",
      "sha256": "..."
    }
  ],
  "runner": {
    "type": "command",
    "command": ["python", "runner.py", "{request_path}"],
    "timeout_seconds": 120
  }
}
```

`command` 不经过 shell 执行。支持的占位符：

- `{request_path}`：worker 写出的 JSON 请求文件；
- `{image_path}`：worker 写出的原始图片文件；
- `{output_path}`：runner 可写入的 JSON 结果文件；
- `{model_path}`：模型包根目录；
- `{model_id}`：当前模型 ID。

也支持 Python 入口：

```json
{
  "runner": {
    "type": "python",
    "entrypoint": "wa_chem_ocsr_model.runner:recognize"
  }
}
```

Python 入口函数接收一个 dict，并返回识别结果 dict。

## 请求格式

API 和 Apple shared core 使用同一识别请求语义。Web 支持上传图片、粘贴图片和在图片预览上框选裁剪；Apple app 支持系统图片选择、剪贴板图片、画布区域裁剪和 Apple Pencil 草图。Pencil 草图是 Apple app 的系统输入适配能力，Web 不要求支持。

```json
{
  "image_base64": "...",
  "mime_type": "image/png",
  "source_name": "input.png",
  "crop": {
    "x": 0.1,
    "y": 0.2,
    "width": 0.5,
    "height": 0.4
  }
}
```

`crop` 是相对原图预览区域的 0–1 归一化坐标。没有裁剪时传 `null` 或省略。显式裁剪必须完整落在 0–1 范围内；超出原图范围的请求应被拒绝，而不是静默改成整图识别。

识别成功后，客户端必须把返回的 `molblock` 或 `canonical_smiles` 导入为新画布中的一个可编辑分子，不覆盖当前画布，也不把多个 detector 分子自动拆成多个文档。原始画布状态只在用户明确保存、追加或关闭确认时改变。

## detector 与多分子

没有显式 `crop` 时，worker 和 Apple Core ML runtime 都先运行 MolDet detector：

- server 使用模型包内 `det/moldet_v2_yolo11n_640_general.onnx`，缺失时尝试 `det/moldet_v2_yolo11n_960_doc.onnx`；
- Apple 使用 app bundle 内 `det/MolDet640General.mlpackage` 或 `det/MolDet960Doc.mlpackage`；
- detector 输出按 `[1,5,N] = cx, cy, w, h, score` 解析，由宿主侧执行 NMS；
- NMS 后按页面阅读顺序逐个裁剪，再送入 MolParser-Mobile recognition；
- detector 缺失、不可用或没有检出可信分子时，必须退回整图识别，不得让识别入口直接失败。

Apple Core ML runtime 当前默认 `computeUnits = .cpuOnly`。原因是本地验证中 detector 在默认 Core ML compute units 下会触发 MPSGraph 进程级断言；CPU-only 是稳定可发布的保守路径，后续性能优化要单独验证 GPU/ANE 后再打开。

## 输出格式

runner 必须输出 JSON object，可写到 `{output_path}`，也可打印到 stdout：

```json
{
  "task_id": "ocsr_xxx",
  "model": {"name": "MolParser-Mobile", "version": "0.1.0"},
  "image": {"width": 1024, "height": 768},
  "overall_confidence": 0.91,
  "atoms": [],
  "bonds": [],
  "warnings": [],
  "molblock": "...",
  "canonical_smiles": "c1ccccc1",
  "molecules": [
    {
      "index": 0,
      "box": {"x": 0.1, "y": 0.2, "width": 0.5, "height": 0.4, "confidence": 0.93},
      "overall_confidence": 0.93,
      "warnings": [],
      "molblock": "...",
      "canonical_smiles": "c1ccccc1"
    }
  ],
  "runtime": "pytorch"
}
```

`molecules` 是多分子明细。顶层 `molblock` 优先用于回填画布；多分子时可包含以 `$$$$` 分隔的 SDF records。没有 `molblock` 时使用顶层 `canonical_smiles`，多个 SMILES 用 `.` 连接。两者都缺失时，前端和 Apple shared core 都必须视为不可回填结果。

## 健康检查

- `GET /health`：worker 进程是否存活；
- `GET /ready`：模型目录、manifest 和 runner 是否可用于识别；
- `GET /api/v1/recognition/ocsr/status`：WA Chem API 代理后的 worker/model 状态。

`/ready` 显示 `model_unavailable` 时，说明模型没有下载、manifest 不可读，或 manifest 没有可用 runner。识别请求返回 `runner_not_configured` 时，说明模型文件存在但既没有声明可执行 runner，也不是 worker 已知的内置 runtime。
