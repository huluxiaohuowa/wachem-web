const releaseStatus = document.querySelectorAll("[data-release-status]");
const releasePageLinks = document.querySelectorAll("[data-release-page]");
const downloadMatchers = {
  deploy: /^wa-chem_deploy_[^/]+\.tar\.gz$/,
  vos: /^wa-chem_[^/]+_pull\.tar$/,
  mac: /^wa-chem-mac_[^/]+_aarch64\.dmg$/,
  checksums: /^SHA256SUMS$/,
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function connectDownload(key, asset) {
  const link = document.querySelector(`[data-download-key="${key}"]`);
  if (!link || !asset) return;
  link.href = asset.browser_download_url;
  link.classList.remove("is-pending");
  link.setAttribute("aria-label", `${link.querySelector("strong")?.textContent || "下载"} ${asset.name}`);
  const meta = link.querySelector("[data-download-meta]");
  if (meta) meta.textContent = `${asset.name} · ${formatBytes(asset.size)}`;
  if (key === "checksums") link.textContent = "下载 SHA256SUMS 校验文件";
}

fetch("https://api.github.com/repos/huluxiaohuowa/wachem-web/releases/latest", {
  headers: { Accept: "application/vnd.github+json" },
})
  .then((response) => {
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    return response.json();
  })
  .then((release) => {
    const label = release.name || release.tag_name;
    if (!label) return;
    releaseStatus.forEach((element) => {
      element.textContent = `最新版本 ${label}`;
    });
    releasePageLinks.forEach((link) => {
      link.href = release.html_url;
    });
    Object.entries(downloadMatchers).forEach(([key, matcher]) => {
      connectDownload(key, release.assets.find((asset) => matcher.test(asset.name)));
    });
  })
  .catch(() => {
    // Keep the static pre-release status when no public release exists yet.
  });
