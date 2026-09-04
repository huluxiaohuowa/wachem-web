# 开发指南

面向 WA Chem 开发者：构建、测试、发版与部署细节。产品介绍与下载方式见 [README](../README.md)。

## 项目结构

```
apps/web            Web 前端与共享编辑器核心（src/core 为无头 TS 核心）
apps/apple-core   Apple app 共享 Swift/Metal/测试模块与直装调试打包脚本
apps/apple           Universal Apple app Xcode 目标（iPad + Mac Catalyst），依赖同一套共享 Apple 模块
services/api        FastAPI 后端（账号、文档、识别编排）
deploy/             独立部署（Docker Compose）
ictrek.app/         VOS 应用包模板
docs/               ADR、对标清单、资产
```

## 开发环境

```sh
# Web 开发界面
pnpm install
pnpm dev

# API（使用现有 Python 环境）
pip install -e '.[test]'
uvicorn wa_chem_api.main:app --host 127.0.0.1 --port 8000

# Apple app 构建
pnpm apple:build

# 测试与类型检查
pnpm test          # Web：vitest
swift test --package-path apps/apple-core
xcodebuild -project apps/apple/WAChemAppleApp.xcodeproj -scheme WAChemAppleApp -destination 'generic/platform=iOS Simulator' build
xcodebuild -project apps/apple/WAChemAppleApp.xcodeproj -scheme WAChemAppleApp -destination 'platform=macOS,variant=Mac Catalyst' build
```

## 运行线同步约定

Web 服务器版与 Apple app 必须保持功能同步：绘图、识别、格式转换、WA-DD 联动和模型管理不能只在一条运行线完成。Apple app 是一个统一产品和一个 App Store 目标，支持 iPad 与 Mac Catalyst；桌面/触控只允许作为系统输入与系统文件能力适配入口。文档、资产、WA-DD、iCloud、Keychain、选择、撤销、导入导出等业务状态必须在共享 Apple 模块中实现一次。交互语义以 [ChemDraw / InDraw 对标清单](chemdraw-parity.md)为准。

资产、账户归属、WA-DD 连接与 SDF 追加/导出粒度以 [资产、账户与 SDF 交互模型](asset-account-model.md) 为准。

每次实现新增产品行为时，验收顺序固定为：共享化学/资产语义 → Web 入口 → Apple app 入口 → 同一用户场景验证。只完成局部按钮、单个系统输入适配或单条运行线外观，不算完成。

## 当前状态（2026-09-01）

- 已完成：共享无头核心（schema v2）、Apple app 原生画布（Metal，CoreGraphics 后备绘制/导出）、完整导入导出（Mol/SDF/SMILES/CDXML/SVG/PNG/wachem）、ChemDraw 交互子集（悬停键入/电荷/链/环拖拽/双击选片段/Option 拖拽复制）；
- 测试基线：Web 124 个（vitest）、Apple shared core 115 个 XCTest + 15 个 Swift Testing，并用 `scripts/check_runtime_lines.py` 阻止旧桌面壳、旧网页桥、旧脚本桥和分裂 Apple 产品壳回流；
- 已发布：v0.1.8（GitHub Release，含签名公证 DMG）；v0.1.9 待发（含 Bundle.module 启动崩溃修复）；
- 进行中：Apple app 共享产品层收敛、就地原子标签编辑、价态校验计入电荷（对标清单 P0）。

## 版本与发版

`./update_version.sh patch` 统一同步根项目、Web、Apple app 构建入口、`deploy/VERSION` 与 `ictrek.app/VERSION`，并在 `dist/release/` 生成：

- `wa-chem_<version>_pull.tar`：VOS app 包；
- `wa-chem_deploy_<version>.tar.gz`：独立部署包；
- `wa-chem-apple_<version>_aarch64.dmg`：Apple app 开发直装/公证包；App Store 渠道使用 `apps/apple` 的 Universal Apple app target；
- `SHA256SUMS`：产物校验和。

推送 `vX.Y.Z` tag 触发 Release workflow 自动构建并发布产物。

## 部署要点

- 独立服务器版统一从宿主机 `8799` 提供访问（避开 WA-DD 默认 `8800`）；API 不直接暴露宿主机端口；
- 模型目录通过 `MODEL_HUB_SHARED_MODELS_PATH` 挂载到容器内 `/modelhub`；服务器端 OCSR 默认模型 `ms://huluxiaohuowa/wa-chem-ocsr-molparser-mobile`（PyTorch / CUDA），由独立 `wa-chem-ocsr` worker 加载，API 只代理统一识别协议；worker 镜像构建可设置 `WA_CHEM_OCSR_BUNDLE_MODEL=true` 在构建期从 ModelScope 下载并校验模型；默认 PyTorch 模型包走内置 MolParser-Mobile runner，其他模型包必须按 [OCSR 模型包合同](ocsr-model-contract.md) 声明 runner 和输出 JSON；VOS/Web 的模型下载、同步和资产化入口复用通用 Model Hub 管理方式，通过 `MODEL_HUB_API_URL` 与 `MODEL_HUB_SHARED_MODELS_PATH` 交互；Apple app 使用同版本 Core ML 产物 `ms://huluxiaohuowa/wa-chem-ocsr-molparser-mobile-coreml`，作为 app 资源或已校验的本地模型路径加载；
- `deploy/` 独立部署固定接入外部 Docker 网络 `wa-dd`，不按 profile 推导或自动发现 `wa-dd-*` 网络；同网络内用 WA-DD 提供的稳定 DNS alias `wa-dd-web:8800` 访问；
- `ictrek.app/` VOS 部署只接入 `vos_default`，WA-DD 的 VOS Web 服务同样通过 `wa-dd-web:8800` 这个 Docker DNS 名称访问；
- VAI / VOS 适配（`ictrek.app`）在独立部署验收后启用，必须显式开启，不影响独立部署的登录/注册/管理员流程。

## Apple app 签名与公证（CI）

在 GitHub `Settings` → `Secrets and variables` → `Actions` → `Repository secrets` 配置后，Release workflow 构建 DMG 时自动签名和公证：

| Secret | 用途 |
| --- | --- |
| `APPLE_CERTIFICATE` | Developer ID Application `.p12` 的 base64 内容 |
| `APPLE_CERTIFICATE_PASSWORD` | 导出 `.p12` 时设置的密码 |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: ... (TEAMID)` |
| `APPLE_ID` | Apple Developer 账号邮箱 |
| `APPLE_PASSWORD` | Apple ID 的 app-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `KEYCHAIN_PASSWORD` | CI 临时 keychain 密码 |

未配置时仍会生成 DMG，但下载后可能被 Gatekeeper 拦截。
