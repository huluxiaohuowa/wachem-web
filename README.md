# WA Chem Web

WA Chem 的公开门户与发布入口，对外地址为 <https://wa-chem.fuluwa.top>。

## 本地预览

这是一个无构建依赖的静态站点：

```sh
python3 -m http.server 4173
```

然后访问 <http://localhost:4173>。

## 发布新版本

`wa-chem` 的 `update_version.sh` 推送版本 tag 后，Release workflow 会把以下资产同步到本仓库：

- `wa-chem_deploy_<version>.tar.gz`：独立部署包；
- `wa-chem_<version>_pull.tar`：VOS App 包；
- `wa-chem-mac_<version>_aarch64.dmg`：Mac App；
- `SHA256SUMS`：校验文件。

应用商店入口在 macOS 和 iPadOS 版本正式上架前保持“即将上架”状态。

跨仓库发布需要在 `huluxiaohuowa/wa-chem` 的 Actions secrets 中配置 `WACHEM_WEB_RELEASE_TOKEN`。该 Secret 应使用只授权 `huluxiaohuowa/wachem-web`、仅具有 `Contents: Read and write` 权限的 fine-grained personal access token。

如需手工补发，发布包仍放在本仓库的 GitHub Releases，不提交到 Pages 分支：

```sh
gh release create <tag> <files...> --repo huluxiaohuowa/wachem-web --title <tag> --notes-file <notes.md>
```

门户会读取 GitHub 最新 Release，并自动把“首个公开版本准备中”更新为最新版本名称。

## Pages

- 发布源：`main` 分支根目录
- 自定义域名：`wa-chem.fuluwa.top`
- DNS：`CNAME` 指向 `huluxiaohuowa.github.io`
