# WA Chem

<p align="center">
  <img src="docs/assets/wa-chem-logo.png" alt="WA Chem logo" width="180">
</p>

**WA Chem** 是一个面向化学结构绘制与识别的本地工作台：既能像 ChemDraw 一样快速绘制二维结构，也能把论文截图、照片和手绘结构识别为可编辑的分子，并可与 WA-DD 配体资产管理联动。

![WA Chem 编辑器](docs/assets/editor-mac.jpg)

## 主要功能

### 结构绘制

- 常用元素一键标注：选中或悬停原子后直接键入元素符号（支持 `Cl`、`Br`、`Na` 等多字符元素）；
- 单键、双键、三键、芳香键、楔形/虚楔形立体键、波浪键、配位键等键型，工具栏图标即实际画法；
- 3–8 元环模板与苯环（支持 Kekulé 双键与芳香圆圈两种画法）、锯齿链工具、橡皮擦；
- ChemDraw 风格键鼠交互：拖拽画键自动吸附标准键长与 30° 网格、`+` / `-` 调整形式电荷、双击选中整个片段、Option-拖拽复制、空格平移、滚轮缩放、撤销重做与快捷键；
- 结构清理一键重排，ACS 1996 与 WA 两套显示风格。

### 结构识别（OCSR）

- 上传图片、粘贴截图或在画布中框选区域进行识别，结果转换为可编辑的原子与键；
- 识别结果带置信度，低置信度对象高亮显示，可在原图叠加下逐项快速纠错。

### 数据与联动

- 独立账号体系与访客临时使用，文档按用户隔离存储；
- 连接 WA-DD 后可将当前分子新建为配体资产、追加到现有资产或替换其中分子；支持同一 Docker 网络自动发现或手动输入地址；
- 完整的导入导出：Molfile、SDF、SMILES、CDXML（ChemDraw 交换格式）导入与导出，SVG / PNG 图像导出，自有 `.wachem` 文档格式完整保留编辑状态；导入自动识别格式。

## 获取与使用

### Mac 客户端

从 [WA Chem 公开下载页](https://wa-chem.fuluwa.top/#releases) 下载最新 `wa-chem-mac_<version>_aarch64.dmg`（Apple Silicon），拖入「应用程序」即可使用。Mac 客户端直接使用当前 macOS 系统账户作为本地身份，文档保存在当前用户的数据目录；WA-DD 凭据保存在钥匙串中。

### 服务器版（自托管）

```sh
./deploy/deploy.sh
```

部署完成后通过 `http://<host>:8799` 访问（避开 WA-DD 默认的 8800 端口）。服务器版提供注册/登录、WA-DD 账号直接登录和免登录临时使用三种进入方式；未安装 WA-DD 时可独立运行，之后随时连接。

数据默认保存在部署目录的 SQLite 中，识别模型在本地推理，不需要把化学结构上传到外部服务。

## 支持的平台

| 平台 | 形态 |
| --- | --- |
| macOS（Apple Silicon） | 原生应用（SwiftUI + Metal 画布，CoreGraphics 导出/降级） |
| 浏览器 | 服务器版 Web 应用 |
| iPad | 规划中 |

两端共享同一份编辑器核心，绘制与识别能力保持一致。

## 文档

- [文档索引](docs/README.md)
- [开发指南](docs/DEVELOPMENT.md)：构建、测试、发版流程
- [架构决策记录](docs/adr/0001-editor-core-contract.md)
- [ChemDraw / InDraw 交互对标清单](docs/chemdraw-parity.md)

## 许可证

尚未确定。第三方代码、模型权重和训练数据在引入前分别完成许可证与再分发条件审查。
