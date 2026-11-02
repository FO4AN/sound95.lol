// Fills in the latest release from GitHub. The page already works without this: every
// link starts out pointing at the releases page, and this only makes them direct.

const REPO = 'FO4AN/sound95';
const API = `https://api.github.com/repos/${REPO}/releases/latest`;
const ASSET_ROOT = `https://github.com/${REPO}/releases/download/`;

const KINDS = [
  { key: 'windows', test: /_x64-setup\.exe$/, label: 'Windows installer' },
  { key: 'appimage', test: /\.AppImage$/, label: 'Linux AppImage' },
  { key: 'deb', test: /\.deb$/, label: 'Debian and Ubuntu package' },
];

const size = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const day = (iso) => new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso));

// GitHub's answer decides where a download button goes, so only keep links that point
// at this project's own release files.
function pickAssets(release) {
  const found = {};
  for (const asset of release.assets ?? []) {
    if (typeof asset.browser_download_url !== 'string' || !asset.browser_download_url.startsWith(ASSET_ROOT)) continue;
    const kind = KINDS.find(({ test }) => test.test(asset.name));
    if (kind) found[kind.key] = { ...asset, label: kind.label };
  }
  return found;
}

function fillTable(assets) {
  const body = document.getElementById('files-body');
  if (!body) return;
  body.replaceChildren();
  for (const { key } of KINDS) {
    const asset = assets[key];
    if (!asset) continue;
    const row = body.insertRow();
    const link = document.createElement('a');
    link.href = asset.browser_download_url;
    link.textContent = asset.name;
    row.insertCell().append(link);
    row.insertCell().textContent = size(asset.size);
    const hash = row.insertCell();
    hash.className = 'hash';
    hash.textContent = /^sha256:[0-9a-f]{64}$/.test(asset.digest ?? '') ? asset.digest.slice(7) : 'Listed on GitHub';
  }
}

export async function loadRelease() {
  let release;
  try {
    const response = await fetch(API, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return;
    release = await response.json();
  } catch {
    return;
  }
  if (!/^v\d+\.\d+\.\d+$/.test(release.tag_name ?? '')) return;

  const assets = pickAssets(release);
  for (const node of document.querySelectorAll('[data-release="version"]')) node.textContent = release.tag_name;
  if (release.published_at) {
    for (const node of document.querySelectorAll('[data-release="date"]')) node.textContent = ` (${day(release.published_at)})`;
  }
  for (const node of document.querySelectorAll('[data-asset]')) {
    const asset = assets[node.dataset.asset];
    if (asset) node.href = asset.browser_download_url;
  }
  for (const node of document.querySelectorAll('[data-file]')) {
    const asset = assets[node.dataset.file];
    if (asset) node.textContent = `${asset.name} (${size(asset.size)})`;
  }
  fillTable(assets);
}
