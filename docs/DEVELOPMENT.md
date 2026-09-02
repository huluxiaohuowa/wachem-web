# 开发指南

面向 WA Chem 开发者：构建、测试、发版与部署细节。产品介绍与下载方式见 [README](../README.md)。

## 项目结构

```
apps/web            Web 前端与共享编辑器核心（src/core 为无头 TS 核心）
apps/macos-native   Mac 原生客户端（SwiftUI + JavaScriptCore + Metal 画布；AppKit/CoreGraphics 保留 PNG 导出和降级路径）
apps/desktop        旧 Tauri 壳（已冻结，不再打包）
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

# 共享核心 bundle（Mac 客户端加载的 JavaScriptCore 产物）
pnpm --filter @wa-chem/web run build:core

# API（使用现有 Python 环境）
pip install -e '.[test]'
uvicorn wa_chem_api.main:app --host 127.0.0.1 --port 8000

# Mac ARM64 客户端（构建并运行 dist/WA Chem.app）
pnpm desktop:build

# 测试与类型检查
pnpm test          # Web：核心 bundle 冒烟 + vitest
swift test         # 原生：JSCore 契约 + 场景/渲染测试（在 apps/macos-native 下）
```

## 双端同步约定

Web 服务器版与 Mac 原生客户端必须保持功能同步：绘图、识别、格式转换、WA-DD 联动和模型管理不能只在单端完成。编辑器领域逻辑只有一份实现（`apps/web/src/core`，见 [ADR 0001](adr/0001-editor-core-contract.md)），浏览器以 SVG 渲染、Mac 以 Metal 渲染同一份场景输出（AppKit/CoreGraphics 保留 PNG 导出和降级路径，见 [ADR 0001](adr/0001-editor-core-contract.md)）；交互语义以 [ChemDraw / InDraw 对标清单](chemdraw-parity.md)为准。

## 当前状态（2026-09-01）

- 已完成：共享无头核心（schema v2）、Mac 原生画布（Metal，CoreGraphics 降级/导出）、完整导入导出（Mol/SDF/SMILES/CDXML/SVG/PNG/wachem，两端同步）、ChemDraw 交互子集（悬停键入/电荷/链/环拖拽/双击选片段/Option 拖拽复制）；
- 测试基线：Web 89 个（vitest + 核心 bundle 冒烟）、原生 14 个（swift test）；
- 已发布：v0.1.8（GitHub Release，含签名公证 DMG）；v0.1.9 待发（含 Bundle.module 启动崩溃修复）；
- 进行中：就地原子标签编辑、价态校验计入电荷（对标清单 P0）；iPad 移植架构就绪待启动。

## 版本与发版

`./update_version.sh patch` 统一同步根项目、Web、桌面客户端、`deploy/VERSION` 与 `ictrek.app/VERSION`，并在 `dist/release/` 生成：

- `wa-chem_<version>_pull.tar`：VOS app 包；
- `wa-chem_deploy_<version>.tar.gz`：独立部署包；
- `wa-chem-mac_<version>_aarch64.dmg`：Mac 安装包；
- `SHA256SUMS`：产物校验和。

推送 `vX.Y.Z` tag 触发 Release workflow 自动构建并发布产物。

## 部署要点

- 独立服务器版统一从宿主机 `8799` 提供访问（避开 WA-DD 默认 `8800`）；API 不直接暴露宿主机端口；
- 模型目录通过 `MODEL_HUB_SHARED_MODELS_PATH` 挂载到容器内 `/modelhub`；服务器端 OCSR 默认模型 `ms://huluxiaohuowa/wa-chem-ocsr-molparser-mobile`（PyTorch / CUDA），Mac 端使用同版本 Core ML 产物 `ms://huluxiaohuowa/wa-chem-ocsr-molparser-mobile-coreml`，按导出的本地路径加载；
- 部署脚本自动发现 WA-DD Compose 网络（实际网络名为 `wa-dd-amd` / `wa-dd-thor`，不要硬编码 `wa-dd`）；未安装 WA-DD 时独立运行；
- VAI / VOS 适配（`ictrek.app`）在独立部署验收后启用，必须显式开启，不影响独立部署的登录/注册/管理员流程。

## Mac 签名与公证（CI）

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
