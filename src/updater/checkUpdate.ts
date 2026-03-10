export type UpdateState = 'up-to-date' | 'update-available' | 'error';

export type UpdateInfo = {
  state: UpdateState;
  currentVersion: string;
  latestVersion?: string;
  notes?: string;
  homepageUrl?: string;
  packageUrl?: string;
  errorMessage?: string;
};

type UpdateManifest = {
  version: string;
  notes?: string;
  homepageUrl?: string;
  packages?: Partial<Record<NodeJS.Platform, { url: string }>>;
  packageUrl?: string;
};

function normalizeVersion(raw: string): string {
  const v = raw.trim();
  if (!v) return 'v0.0.0';
  return v.startsWith('v') ? v : `v${v}`;
}

function parseSemver(v: string): [number, number, number] {
  const normalized = normalizeVersion(v).slice(1);
  const [major, minor, patch] = normalized.split('.').map(part => Number(part ?? 0));
  return [
    Number.isFinite(major) ? major : 0,
    Number.isFinite(minor) ? minor : 0,
    Number.isFinite(patch) ? patch : 0,
  ];
}

function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

function detectManifest(payload: any): UpdateManifest | null {
  if (!payload || typeof payload !== 'object') return null;

  if (typeof payload.version === 'string') {
    return payload as UpdateManifest;
  }

  if (typeof payload.tag_name === 'string') {
    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    const packageUrl = assets.find((a: any) => typeof a?.browser_download_url === 'string')?.browser_download_url;
    return {
      version: payload.tag_name,
      notes: typeof payload.body === 'string' ? payload.body : undefined,
      homepageUrl: typeof payload.html_url === 'string' ? payload.html_url : undefined,
      packageUrl,
    };
  }

  return null;
}

function pickPackageUrl(manifest: UpdateManifest): string | undefined {
  const byPlatform = manifest.packages?.[process.platform]?.url;
  return byPlatform ?? manifest.packageUrl;
}

export function getUpdateDialogSpec(info: UpdateInfo):
  | { kind: 'update'; title: string; content: string; positiveText: string; negativeText: string }
  | { kind: 'no-update'; title: string; content: string; positiveText: string }
  | { kind: 'error'; title: string; content: string; positiveText: string } {
  if (info.state === 'update-available') {
    const notes = info.notes ? `\n\n更新内容:\n${info.notes}` : '';
    return {
      kind: 'update',
      title: '发现新版本',
      content: `当前版本: ${info.currentVersion}\n最新版本: ${info.latestVersion}${notes}`,
      positiveText: '立即更新',
      negativeText: '稍后提醒',
    };
  }

  if (info.state === 'error') {
    return {
      kind: 'error',
      title: '检查更新失败',
      content: info.errorMessage ?? '无法获取更新信息',
      positiveText: '确定',
    };
  }

  return {
    kind: 'no-update',
    title: '已是最新版本',
    content: `当前版本: ${info.currentVersion}`,
    positiveText: '确定',
  };
}

export async function checkUpdate(): Promise<UpdateInfo> {
  const manifestUrl =
    ((import.meta as any).env?.VITE_UPDATE_MANIFEST_URL as string | undefined) ??
    (typeof process !== 'undefined' ? process.env?.VITE_UPDATE_MANIFEST_URL : undefined);
  const rawCurrent =
    ((import.meta as any).env?.VITE_APP_VERSION as string | undefined) ??
    (typeof process !== 'undefined' ? process.env?.VITE_APP_VERSION : undefined);
  const currentVersion = normalizeVersion(rawCurrent ?? '0.0.0');

  if (!manifestUrl) {
    return {
      state: 'error',
      currentVersion,
      errorMessage: '未配置更新地址（VITE_UPDATE_MANIFEST_URL）',
    };
  }

  try {
    const res = await fetch(manifestUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return {
        state: 'error',
        currentVersion,
        errorMessage: `请求失败: ${res.status}`,
      };
    }

    const payload = await res.json();
    const manifest = detectManifest(payload);
    if (!manifest) {
      return {
        state: 'error',
        currentVersion,
        errorMessage: '版本文件格式不正确',
      };
    }

    const latestVersion = normalizeVersion(manifest.version);
    const packageUrl = pickPackageUrl(manifest);

    if (compareVersions(latestVersion, currentVersion) <= 0) {
      return { state: 'up-to-date', currentVersion, latestVersion, homepageUrl: manifest.homepageUrl };
    }

    return {
      state: 'update-available',
      currentVersion,
      latestVersion,
      notes: manifest.notes,
      homepageUrl: manifest.homepageUrl,
      packageUrl,
    };
  } catch (e: any) {
    return {
      state: 'error',
      currentVersion,
      errorMessage: e?.message ? String(e.message) : '检查更新时发生异常',
    };
  }
}
